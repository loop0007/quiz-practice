import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
  ChevronRight,
  History as HistoryIcon,
  Loader2,
} from 'lucide-react'
import { getBank } from '@/lib/banks'
import { listFinishedSessions, type FinishedSession } from '@/lib/db'
import { getHistorySummary } from '@/lib/history'
import { getSessionStats } from '@/lib/scoring'

function formatFinishedAt(timestamp: number): string {
  return new Date(timestamp).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function HistoryPage() {
  const [sessions, setSessions] = useState<FinishedSession[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    listFinishedSessions()
      .then((list) => {
        if (!cancelled) setSessions(list)
      })
      .catch(() => {
        if (!cancelled) setError('读取历史成绩失败，请稍后重试。')
      })

    return () => {
      cancelled = true
    }
  }, [])

  if (!sessions && !error) {
    return (
      <section className="py-16 text-center text-slate-600 dark:text-slate-300">
        <Loader2 className="mx-auto size-6 animate-spin" aria-hidden="true" />
        <p className="mt-3 text-sm">正在加载历史成绩…</p>
      </section>
    )
  }

  if (error) {
    return (
      <section className="rounded-[var(--radius-card)] border border-slate-200/80 bg-white/85 p-8 text-center shadow-soft backdrop-blur-sm dark:border-slate-700/70 dark:bg-slate-900/80">
        <AlertTriangle className="mx-auto size-8 text-amber-500" aria-hidden="true" />
        <h1 className="mt-3 font-display text-xl font-semibold">无法读取历史成绩</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{error}</p>
        <Link
          to="/banks"
          className="mt-5 inline-flex min-h-11 items-center gap-1.5 rounded-full bg-blue-600 px-5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          返回题库
        </Link>
      </section>
    )
  }

  const list = sessions ?? []
  const summary = getHistorySummary(list)
  const summaryAccuracy = Math.round(summary.accuracy * 100)

  return (
    <section className="space-y-4">
      <header>
        <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.22em] text-blue-700 uppercase dark:text-blue-300">
          <span
            aria-hidden="true"
            className="inline-block size-1.5 rounded-full bg-blue-500"
          />
          History · {list.length} Sessions
        </p>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          历史成绩
        </h1>
      </header>

      {list.length === 0 ? (
        <div className="rounded-[var(--radius-card)] border border-slate-200/80 bg-white/85 p-10 text-center shadow-soft backdrop-blur-sm dark:border-slate-700/70 dark:bg-slate-900/80">
          <HistoryIcon className="mx-auto size-10 text-slate-400" aria-hidden="true" />
          <h2 className="mt-3 font-display text-xl font-semibold">还没有已完成的练习</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            完成并交卷后，成绩会出现在这里。
          </p>
          <Link
            to="/banks"
            className="mt-5 inline-flex min-h-11 items-center gap-1.5 rounded-full bg-blue-600 px-5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            去题库练习
          </Link>
        </div>
      ) : (
        <>
          <div className="rounded-[var(--radius-card)] border border-slate-200/80 bg-white/85 p-5 shadow-soft backdrop-blur-sm sm:p-6 dark:border-slate-700/70 dark:bg-slate-900/80">
            <h2 className="text-sm font-semibold">累计统计</h2>
            <dl
              aria-label="历史成绩汇总"
              className="mt-3 grid grid-cols-3 gap-2 sm:gap-3"
            >
              <div className="rounded-2xl bg-slate-50/90 px-3 py-3 dark:bg-slate-950/50">
                <dt className="text-xs text-slate-500 dark:text-slate-400">已完成练习</dt>
                <dd className="mt-1 font-display text-2xl font-semibold tabular-nums">
                  {summary.sessions} 次
                </dd>
              </div>
              <div className="rounded-2xl bg-slate-50/90 px-3 py-3 dark:bg-slate-950/50">
                <dt className="text-xs text-slate-500 dark:text-slate-400">累计答对</dt>
                <dd className="mt-1 font-display text-2xl font-semibold tabular-nums">
                  {summary.correct} / {summary.total}
                </dd>
              </div>
              <div className="rounded-2xl bg-slate-50/90 px-3 py-3 dark:bg-slate-950/50">
                <dt className="text-xs text-slate-500 dark:text-slate-400">平均正确率</dt>
                <dd className="mt-1 font-display text-2xl font-semibold tabular-nums text-blue-600 dark:text-blue-400">
                  {summaryAccuracy}%
                </dd>
              </div>
            </dl>
          </div>

          <ul aria-label="已完成练习列表" className="space-y-3">
            {list.map((session) => {
              const stats = getSessionStats(session)
              const bank = getBank(session.bankId)
              const accuracy = Math.round(stats.accuracy * 100)

              return (
                <li key={session.id}>
                  <article className="hover-lift rounded-[var(--radius-card)] border border-slate-200/80 bg-white/85 p-5 shadow-soft backdrop-blur-sm hover:border-blue-300/80 dark:border-slate-700/70 dark:bg-slate-900/80 dark:hover:border-blue-800">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h2 className="text-base font-semibold">
                          {bank?.name ?? session.bankId}
                        </h2>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          交卷于 {formatFinishedAt(session.finishedAt)}
                        </p>
                      </div>
                      <p className="font-display text-3xl font-semibold tabular-nums text-blue-600 dark:text-blue-400">
                        {accuracy}%
                      </p>
                    </div>

                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                      答对 <span className="font-semibold">{stats.correct}</span> /{' '}
                      {stats.total} 题 · 已答 {stats.answered} 题
                    </p>

                    <Link
                      to={`/result/${session.id}`}
                      className="mt-4 inline-flex min-h-11 items-center gap-1 rounded-full border border-blue-200/80 bg-blue-50/60 px-4 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-950/70"
                    >
                      查看结果
                      <ChevronRight className="size-4" aria-hidden="true" />
                    </Link>
                  </article>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </section>
  )
}

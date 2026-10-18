import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  BookOpen,
  Layers,
  Loader2,
  MessageSquarePlus,
  Play,
  RotateCcw,
  SlidersHorizontal,
} from 'lucide-react'
import FeedbackDialog from '@/components/FeedbackDialog'
import PracticeFilterDialog from '@/components/PracticeFilterDialog'
import { banks, getBankQuestions } from '@/lib/banks'
import { createSession, findActiveSession } from '@/lib/db'
import type { BankMeta, PracticeSession } from '@/types'

const TYPE_LABELS: Array<{ key: keyof BankMeta['typeCounts']; label: string }> = [
  { key: 'single', label: '单选' },
  { key: 'multi', label: '多选' },
  { key: 'judge', label: '判断' },
]

function formatStartedAt(timestamp: number): string {
  return new Date(timestamp).toLocaleString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function BankSelectPage() {
  const navigate = useNavigate()
  const [activeSessions, setActiveSessions] = useState<
    Record<string, PracticeSession | undefined>
  >({})
  const [loading, setLoading] = useState(true)
  const [pendingBankId, setPendingBankId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [filterBank, setFilterBank] = useState<BankMeta | null>(null)

  useEffect(() => {
    let cancelled = false

    Promise.all(
      banks.map(async (bank) => [bank.id, await findActiveSession(bank.id)] as const),
    )
      .then((entries) => {
        if (!cancelled) setActiveSessions(Object.fromEntries(entries))
      })
      .catch(() => {
        if (!cancelled) setActiveSessions({})
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  async function createAndOpenSession(bankId: string, questionIds: string[]) {
    if (questionIds.length === 0) throw new Error('当前条件下暂无可练习题目')

    const session = await createSession({ bankId, questionIds })
    navigate(`/practice/${session.id}`)
  }

  async function startPractice(bankId: string, mode: 'new' | 'restart') {
    if (
      mode === 'restart' &&
      !window.confirm('重新开始会新建一次练习，上次未完成的进度将无法继续。确定吗？')
    ) {
      return
    }

    setPendingBankId(bankId)
    setError(null)

    try {
      await createAndOpenSession(
        bankId,
        getBankQuestions(bankId).map((question) => question.id),
      )
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '创建练习失败，请重试')
      setPendingBankId(null)
    }
  }

  async function startFilteredPractice(bankId: string, questionIds: string[]) {
    setFilterBank(null)
    setPendingBankId(bankId)
    setError(null)

    try {
      await createAndOpenSession(bankId, questionIds)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '创建练习失败，请重试')
      setPendingBankId(null)
    }
  }

  function continuePractice(session: PracticeSession) {
    navigate(`/practice/${session.id}`)
  }

  if (banks.length === 0) {
    return (
      <section className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center dark:border-slate-700 dark:bg-slate-900">
        <BookOpen className="mx-auto size-10 text-slate-400" aria-hidden="true" />
        <h1 className="mt-3 text-xl font-semibold">暂无题库</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          题库数据为空，请检查解析脚本是否已生成 banks.json。
        </p>
      </section>
    )
  }

  return (
    <section>
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">选择题库</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            题目与答题记录都保存在本机浏览器，换设备不会同步。
          </p>
        </div>
        <button
          type="button"
          onClick={() => setFeedbackOpen(true)}
          className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
        >
          <MessageSquarePlus className="size-4" aria-hidden="true" />
          反馈
        </button>
      </header>

      {error && (
        <div
          role="alert"
          className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {banks.map((bank) => {
          const active = activeSessions[bank.id]
          const pending = pendingBankId === bank.id
          const empty = bank.validCount === 0

          return (
            <article
              key={bank.id}
              className="flex flex-col rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-lg font-semibold">{bank.name}</h2>
                {bank.anomalyCount > 0 && (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                    <AlertTriangle className="size-3" aria-hidden="true" />
                    异常 {bank.anomalyCount} 题
                  </span>
                )}
              </div>

              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="text-3xl font-bold tabular-nums">{bank.validCount}</span>
                <span className="text-sm text-slate-600 dark:text-slate-400">道有效题</span>
              </div>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                共 {bank.parsedCount} 题
                {bank.anomalyCount > 0 && `，${bank.anomalyCount} 题异常不参与练习`}
              </p>

              <dl className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-sm text-slate-600 dark:text-slate-300">
                {TYPE_LABELS.map(({ key, label }) => (
                  <div key={key} className="flex items-center gap-1">
                    <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
                    <dd className="font-medium tabular-nums">{bank.typeCounts[key]}</dd>
                  </div>
                ))}
                <div className="flex items-center gap-1">
                  <Layers className="size-3.5 text-slate-400" aria-hidden="true" />
                  <dd>{bank.chapters.length} 个章节</dd>
                </div>
              </dl>

              {!empty && (
                <button
                  type="button"
                  onClick={() => setFilterBank(bank)}
                  className="mt-3 inline-flex min-h-11 items-center gap-1.5 self-start rounded-lg px-2 text-sm font-medium text-blue-700 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-950/50"
                >
                  <SlidersHorizontal className="size-4" aria-hidden="true" />
                  按章节/题型筛选
                </button>
              )}

              <div className="mt-auto pt-5">
                {empty ? (
                  <button
                    type="button"
                    disabled
                    className="min-h-11 w-full cursor-not-allowed rounded-lg bg-slate-200 px-4 text-sm font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                  >
                    暂无可练习题目
                  </button>
                ) : loading ? (
                  <div className="h-10 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
                ) : active ? (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      上次练习：{formatStartedAt(active.startedAt)} 开始，已答{' '}
                      {Object.keys(active.answers).length} / {active.questionIds.length}
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => continuePractice(active)}
                        className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700"
                      >
                        <Play className="size-4" aria-hidden="true" />
                        继续上次
                      </button>
                      <button
                        type="button"
                        onClick={() => startPractice(bank.id, 'restart')}
                        disabled={pending}
                        className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 text-sm font-medium hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:hover:bg-slate-800"
                      >
                        {pending ? (
                          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                        ) : (
                          <RotateCcw className="size-4" aria-hidden="true" />
                        )}
                        重新开始
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => startPractice(bank.id, 'new')}
                    disabled={pending}
                    className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    {pending ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Play className="size-4" aria-hidden="true" />
                    )}
                    开始练习
                  </button>
                )}
              </div>
            </article>
          )
        })}
      </div>

      {feedbackOpen && (
        <FeedbackDialog onClose={() => setFeedbackOpen(false)} />
      )}

      {filterBank && (
        <PracticeFilterDialog
          bank={filterBank}
          onClose={() => setFilterBank(null)}
          onStart={(questionIds) => startFilteredPractice(filterBank.id, questionIds)}
        />
      )}
    </section>
  )
}

import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  CircleHelp,
  Loader2,
  RotateCcw,
  SquarePen,
  XCircle,
} from 'lucide-react'
import AccuracyHint from '@/components/AccuracyHint'
import { getBank, getQuestion } from '@/lib/banks'
import { createSession, getSession, listWrong } from '@/lib/db'
import { getSessionStats } from '@/lib/scoring'
import type { PracticeSession, WrongEntry } from '@/types'

function questionNumbers(questionIds: string[]): number[] {
  return questionIds
    .map((questionId) => getQuestion(questionId)?.number)
    .filter((number): number is number => number !== undefined)
    .sort((a, b) => a - b)
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function ResultPage() {
  const { sessionId = '' } = useParams()
  const navigate = useNavigate()

  const [session, setSession] = useState<PracticeSession | null>(null)
  const [wrongEntries, setWrongEntries] = useState<WrongEntry[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      setActionError(null)
      setSession(null)
      setWrongEntries(null)

      try {
        const found = await getSession(sessionId)
        if (cancelled) return

        if (!found) {
          setError('练习记录不存在或已损坏。')
          return
        }

        setSession(found)

        try {
          const entries = await listWrong()
          if (!cancelled) setWrongEntries(entries)
        } catch {
          if (!cancelled) setWrongEntries(null)
        }
      } catch {
        if (!cancelled) setError('读取练习记录失败，请稍后重试。')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [sessionId])

  async function handleReplay() {
    if (!session || starting) return

    setStarting(true)
    setActionError(null)
    try {
      const next = await createSession({
        bankId: session.bankId,
        questionIds: session.questionIds,
      })
      navigate(`/practice/${next.id}`)
    } catch {
      setActionError('创建新练习失败，请重试。')
      setStarting(false)
    }
  }

  if (loading) {
    return (
      <section className="py-16 text-center text-slate-600 dark:text-slate-300">
        <Loader2 className="mx-auto size-6 animate-spin" aria-hidden="true" />
        <p className="mt-3 text-sm">正在加载结果…</p>
      </section>
    )
  }

  if (!session) {
    return (
      <section className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center dark:border-slate-700 dark:bg-slate-900">
        <AlertTriangle className="mx-auto size-8 text-amber-500" aria-hidden="true" />
        <h1 className="mt-3 text-lg font-semibold">无法打开练习结果</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          {error ?? '练习记录不存在或已损坏。'}
        </p>
        <Link
          to="/"
          className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          返回题库
        </Link>
      </section>
    )
  }

  const stats = getSessionStats(session)
  const bank = getBank(session.bankId)
  const accuracyPercent = Math.round(stats.accuracy * 100)
  const wrongNumbers = questionNumbers(stats.wrongQuestionIds)
  const unansweredNumbers = questionNumbers(stats.unansweredQuestionIds)
  const bankWrongTotal =
    wrongEntries?.filter((entry) => entry.bankId === session.bankId).length ?? null

  const statItems = [
    { label: '总题数', value: stats.total, tone: 'text-slate-900 dark:text-slate-100' },
    { label: '已答', value: stats.answered, tone: 'text-slate-900 dark:text-slate-100' },
    { label: '答对', value: stats.correct, tone: 'text-green-600 dark:text-green-400' },
    { label: '本次答错', value: stats.wrong, tone: 'text-red-600 dark:text-red-400' },
    {
      label: '本次未答',
      value: stats.unanswered,
      tone: 'text-amber-600 dark:text-amber-400',
    },
    {
      label: '正确率',
      value: `${accuracyPercent}%`,
      tone: 'text-blue-600 dark:text-blue-400',
    },
    {
      label: '题库异常题',
      value: bank?.anomalyCount ?? 0,
      tone: 'text-slate-900 dark:text-slate-100',
    },
  ]

  return (
    <section className="space-y-4">
      <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm sm:p-6 dark:border-slate-700 dark:bg-slate-900">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {bank?.name ?? session.bankId} · 练习结果
          {session.finishedAt != null && ` · 交卷于 ${formatTime(session.finishedAt)}`}
        </p>

        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold">本次成绩</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              答对 <span className="font-semibold">{stats.correct}</span> /{' '}
              {stats.total} 题
            </p>
          </div>
          <div className="text-right">
            <p className="text-4xl font-bold tabular-nums text-blue-600 dark:text-blue-400">
              {accuracyPercent}%
            </p>
            <p className="mt-1 flex items-center justify-end gap-1 text-xs text-slate-500 dark:text-slate-400">
              <AccuracyHint />
              <span>正确率</span>
            </p>
          </div>
        </div>

        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div
            className="h-full rounded-full bg-blue-600 transition-[width]"
            style={{ width: `${accuracyPercent}%` }}
          />
        </div>

        {session.finishedAt == null && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            <span>本次练习尚未交卷，以上为当前作答进度。</span>
            <Link
              to={`/practice/${session.id}`}
              className="font-medium underline underline-offset-2 hover:text-amber-900 dark:hover:text-amber-100"
            >
              继续答题
            </Link>
          </div>
        )}

        <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {statItems.map((item) => (
            <div
              key={item.label}
              className="rounded-lg bg-slate-50 px-3 py-2.5 dark:bg-slate-950/50"
            >
              <dt className="text-xs text-slate-500 dark:text-slate-400">{item.label}</dt>
              <dd className={`mt-0.5 text-xl font-semibold tabular-nums ${item.tone}`}>
                {item.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 dark:border-slate-700 dark:bg-slate-900">
        <header className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold">本次错题</h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            共 {stats.wrong} 题
          </span>
        </header>
        {wrongNumbers.length > 0 ? (
          <ul className="mt-3 flex flex-wrap gap-2" aria-label="本次答错题号">
            {wrongNumbers.map((number) => (
              <li
                key={number}
                className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-sm font-medium tabular-nums text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
              >
                第 {number} 题
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
            <CheckCircle2 className="size-4 text-green-600 dark:text-green-400" aria-hidden="true" />
            本次没有答错的题。
          </p>
        )}
      </div>

      <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 dark:border-slate-700 dark:bg-slate-900">
        <header className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold">本次未作答题号</h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            共 {stats.unanswered} 题
          </span>
        </header>
        {unansweredNumbers.length > 0 ? (
          <ul className="mt-3 flex flex-wrap gap-2" aria-label="本次未作答题号">
            {unansweredNumbers.map((number) => (
              <li
                key={number}
                className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-sm font-medium tabular-nums text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
              >
                第 {number} 题
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
            <CircleHelp className="size-4" aria-hidden="true" />
            没有未作答的题。
          </p>
        )}
      </div>

      <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 dark:border-slate-700 dark:bg-slate-900">
        <h2 className="text-sm font-semibold">错题本累计</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          {wrongEntries
            ? `全部题库共 ${wrongEntries.length} 题，其中本题库 ${bankWrongTotal ?? 0} 题。`
            : '错题本累计读取失败，不影响本次成绩。'}
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          累计记录包含本次及以往练习答错的题；与上方“本次错题”口径不同。
        </p>
      </div>

      {actionError && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{actionError}</span>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Link
          to="/"
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm font-medium hover:bg-slate-50 sm:flex-none dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          返回题库
        </Link>
        <Link
          to="/wrongbook"
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm font-medium hover:bg-slate-50 sm:flex-none dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
        >
          <SquarePen className="size-4" aria-hidden="true" />
          查看错题本
        </Link>
        <button
          type="button"
          onClick={() => void handleReplay()}
          disabled={starting}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 sm:flex-none dark:disabled:bg-slate-700 dark:disabled:text-slate-400"
        >
          {starting ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <RotateCcw className="size-4" aria-hidden="true" />
          )}
          再练一次
        </button>
      </div>

      {stats.wrong > 0 && (
        <p className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <XCircle className="size-3.5 text-red-500 dark:text-red-400" aria-hidden="true" />
          本次答错的题已自动加入错题本。
        </p>
      )}
    </section>
  )
}

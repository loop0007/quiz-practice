import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
  Loader2,
  Play,
  SlidersHorizontal,
} from 'lucide-react'
import { getBank, getBankQuestions } from '@/lib/banks'
import { createSession, findActiveSession } from '@/lib/db'
import type { PracticeSession, QuestionType } from '@/types'

const TYPE_OPTIONS: Array<{ key: QuestionType; label: string }> = [
  { key: 'single', label: '单选' },
  { key: 'multi', label: '多选' },
  { key: 'judge', label: '判断' },
]

const ALL_TYPES: QuestionType[] = ['single', 'multi', 'judge']

function formatStartedAt(timestamp: number): string {
  return new Date(timestamp).toLocaleString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function BankDetailPage() {
  const { bankId = '' } = useParams()
  const navigate = useNavigate()
  const bank = getBank(bankId)

  const [chapterId, setChapterId] = useState('')
  const [types, setTypes] = useState<QuestionType[]>(ALL_TYPES)
  const [activeSession, setActiveSession] = useState<PracticeSession | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    if (!bank) return
    findActiveSession(bank.id)
      .then((session) => {
        if (!cancelled) setActiveSession(session ?? null)
      })
      .catch(() => {
        if (!cancelled) setActiveSession(null)
      })

    return () => {
      cancelled = true
    }
  }, [bank])

  const chapterFilter = chapterId ? { chapterId } : undefined

  const selectedQuestions = useMemo(() => {
    if (!bank) return []
    return getBankQuestions(bank.id, { ...chapterFilter, types })
  }, [bank, chapterFilter, types])

  if (!bank) {
    return (
      <section className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white/80 p-10 text-center shadow-soft dark:border-slate-700 dark:bg-slate-900/80">
        <AlertTriangle className="mx-auto size-9 text-amber-500" aria-hidden="true" />
        <h1 className="mt-4 font-display text-2xl font-semibold">题库不存在</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          该题库可能已被移除，请返回题库列表重新选择。
        </p>
        <Link
          to="/banks"
          className="mt-6 inline-flex min-h-11 items-center gap-1.5 rounded-full bg-blue-600 px-5 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          返回题库
        </Link>
      </section>
    )
  }

  function toggleType(type: QuestionType) {
    setTypes((previous) =>
      previous.includes(type)
        ? previous.filter((item) => item !== type)
        : [...previous, type],
    )
  }

  async function startPractice(questionIds: string[]) {
    if (!bank || questionIds.length === 0 || pending) return

    setPending(true)
    setError(null)
    try {
      const session = await createSession({ bankId: bank.id, questionIds })
      navigate(`/practice/${session.id}`)
    } catch {
      setError('创建练习失败，请重试。')
      setPending(false)
    }
  }

  return (
    <section>
      <Link
        to="/banks"
        className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-2 text-sm text-slate-600 transition-colors hover:text-blue-700 dark:text-slate-300 dark:hover:text-blue-300"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        题库
      </Link>

      <div className="mx-auto mt-6 max-w-2xl text-center">
        <p className="flex items-center justify-center gap-2 text-[11px] font-semibold tracking-[0.22em] text-blue-700 uppercase dark:text-blue-300">
          <span
            aria-hidden="true"
            className="inline-block size-1.5 rounded-full bg-blue-500"
          />
          Selected Bank
        </p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          {bank.name}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          选择章节与题型，开始一轮练习。
        </p>
      </div>

      <aside className="mx-auto mt-7 max-w-2xl rounded-[var(--radius-card)] border border-slate-200/80 bg-white/85 p-5 shadow-soft backdrop-blur-sm sm:p-6 dark:border-slate-700/70 dark:bg-slate-900/80">
        <h2 className="flex items-center justify-center gap-2 font-display text-xl font-semibold">
          <SlidersHorizontal className="size-4 text-blue-600 dark:text-blue-300" aria-hidden="true" />
          练习设置
        </h2>

        {activeSession && (
          <button
            type="button"
            onClick={() => navigate(`/practice/${activeSession.id}`)}
            className="mt-5 flex min-h-12 w-full flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-2xl border border-amber-300/80 bg-amber-50/70 px-4 py-2.5 text-left transition-colors hover:border-amber-400 hover:bg-amber-100/80 dark:border-amber-800 dark:bg-amber-950/30 dark:hover:border-amber-700 dark:hover:bg-amber-950/50"
          >
            <span className="inline-flex items-center gap-2 text-sm font-medium text-amber-900 dark:text-amber-200">
              <Play className="size-4" aria-hidden="true" />
              继续上次练习
            </span>
            <span className="text-xs text-amber-800/80 dark:text-amber-300/80">
              {formatStartedAt(activeSession.startedAt)} · 已答{' '}
              {Object.keys(activeSession.answers).length} /{' '}
              {activeSession.questionIds.length}
            </span>
          </button>
        )}

        <label
            htmlFor="chapter-filter"
            className="mt-5 block text-sm font-medium"
          >
            章节
          </label>
          <select
            id="chapter-filter"
            value={chapterId}
            onChange={(event) => setChapterId(event.target.value)}
            className="mt-1.5 min-h-11 w-full rounded-2xl border border-slate-200 bg-white/80 px-3 text-sm focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950/50"
          >
            <option value="">全部章节（{bank.validCount} 题）</option>
            {bank.chapters.map((chapter) => {
              const count = getBankQuestions(bank.id, { chapterId: chapter.id }).length
              return (
                <option key={chapter.id} value={chapter.id}>
                  {chapter.title}（{count} 题）
                </option>
              )
            })}
          </select>

          <fieldset className="mt-4">
            <legend className="text-sm font-medium">题型</legend>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {TYPE_OPTIONS.map(({ key, label }) => {
                const checked = types.includes(key)
                return (
                  <label
                    key={key}
                    className={`flex min-h-11 cursor-pointer items-center justify-center rounded-2xl border px-2 text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-blue-500 has-[:focus-visible]:ring-offset-1 dark:has-[:focus-visible]:ring-offset-slate-900 ${
                      checked
                        ? 'border-blue-300 bg-blue-50 font-medium text-blue-800 dark:border-blue-700 dark:bg-blue-950/50 dark:text-blue-200'
                        : 'border-slate-200 hover:border-blue-300 dark:border-slate-700 dark:hover:border-blue-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleType(key)}
                      className="sr-only"
                    />
                    <span>{label}</span>
                  </label>
                )
              })}
            </div>
          </fieldset>

          <p aria-live="polite" className="mt-4 text-sm text-slate-600 dark:text-slate-300">
            将练习{' '}
            <strong className="font-display text-lg tabular-nums text-slate-900 dark:text-slate-100">
              {selectedQuestions.length}
            </strong>{' '}
            道题
          </p>
          {selectedQuestions.length === 0 && (
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
              当前条件下没有题目，请调整章节或至少选择一种题型。
            </p>
          )}

          {error && (
            <p
              role="alert"
              className="mt-3 rounded-2xl border border-red-200 bg-red-50 p-2.5 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300"
            >
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={() =>
              void startPractice(selectedQuestions.map((question) => question.id))
            }
            disabled={selectedQuestions.length === 0 || pending}
            className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-1.5 rounded-full bg-blue-600 px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 dark:disabled:bg-slate-700 dark:disabled:text-slate-400"
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Play className="size-4" aria-hidden="true" />
            )}
            开始练习
          </button>
      </aside>
    </section>
  )
}

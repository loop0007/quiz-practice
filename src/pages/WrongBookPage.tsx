import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
  BookOpenCheck,
  CheckCircle2,
  ListChecks,
  Loader2,
  XCircle,
} from 'lucide-react'
import MarkdownContent from '@/components/MarkdownContent'
import { banks, getQuestion } from '@/lib/banks'
import { createSession, listWrong } from '@/lib/db'
import { getWrongBookQuestionIds } from '@/lib/wrongbook'
import type { Question, QuestionType, WrongEntry } from '@/types'

const TYPE_LABELS: Record<QuestionType, string> = {
  single: '单选题',
  multi: '多选题',
  judge: '判断题',
}

interface WrongGroup {
  bankId: string
  name: string
  entries: WrongEntry[]
}

function groupEntries(entries: WrongEntry[]): WrongGroup[] {
  const byBank = new Map<string, WrongEntry[]>()

  for (const entry of entries) {
    const list = byBank.get(entry.bankId)
    if (list) {
      list.push(entry)
    } else {
      byBank.set(entry.bankId, [entry])
    }
  }

  const groups: WrongGroup[] = []

  for (const bank of banks) {
    const list = byBank.get(bank.id)
    if (list) {
      groups.push({ bankId: bank.id, name: bank.name, entries: list })
      byBank.delete(bank.id)
    }
  }

  for (const [bankId, list] of byBank) {
    groups.push({ bankId, name: bankId, entries: list })
  }

  return groups
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function AnswerKeys({
  question,
  keys,
  tone,
}: {
  question: Question
  keys: string[]
  tone: 'wrong' | 'correct'
}) {
  if (keys.length === 0) {
    return <span className="text-sm text-slate-500 dark:text-slate-400">未作答</span>
  }

  const keyClass =
    tone === 'wrong'
      ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300'
      : 'border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300'

  return (
    <ul className="mt-1 space-y-1.5">
      {keys.map((key) => {
        const option = question.options.find((item) => item.key === key)
        return (
          <li key={key} className="flex items-start gap-2">
            <span
              className={`mt-0.5 inline-flex min-w-6 justify-center rounded border px-1.5 py-0.5 text-xs font-semibold tabular-nums ${keyClass}`}
            >
              {key}
            </span>
            {option && (
              <span className="min-w-0 flex-1 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                {option.text.includes('\n') ? (
                  <span className="block whitespace-pre-wrap break-words font-mono text-xs leading-relaxed">
                    {option.text.trim()}
                  </span>
                ) : (
                  <MarkdownContent inline>{option.text}</MarkdownContent>
                )}
              </span>
            )}
          </li>
        )
      })}
    </ul>
  )
}

function WrongItem({ entry }: { entry: WrongEntry }) {
  const question = getQuestion(entry.questionId)

  if (!question) {
    return (
      <article className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900 dark:bg-amber-950/30">
        <header className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
            题目缺失
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            首次答错：{formatTime(entry.firstWrongAt)}
          </span>
        </header>
        <p className="mt-2 flex items-start gap-1.5 text-sm text-slate-700 dark:text-slate-200">
          <AlertTriangle
            className="mt-0.5 size-4 shrink-0 text-amber-500"
            aria-hidden="true"
          />
          该题已不在当前题库中（可能因解析异常被排除），暂时无法展示题干、正确答案与解析。
        </p>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          记录 ID：{entry.questionId}
        </p>
        <div className="mt-3 text-sm">
          <span className="font-medium text-slate-600 dark:text-slate-300">你的答案：</span>
          <span className="text-red-700 dark:text-red-300">
            {entry.selected.join('、') || '未作答'}
          </span>
        </div>
        {entry.wrongCount > 1 && (
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            累计答错 {entry.wrongCount} 次
          </p>
        )}
      </article>
    )
  }

  return (
    <article className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-slate-200 pb-2.5 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <span className="rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
            {TYPE_LABELS[question.type]}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            题号 {question.number}
          </span>
        </div>
        <span className="text-xs tabular-nums text-slate-500 dark:text-slate-400">
          首次答错：{formatTime(entry.firstWrongAt)}
        </span>
      </header>

      <MarkdownContent className="mt-3 text-sm leading-relaxed">
        {question.stem}
      </MarkdownContent>

      <div className="mt-3 grid gap-3 rounded-lg bg-slate-50 p-3 sm:grid-cols-2 dark:bg-slate-950/50">
        <div>
          <p className="flex items-center gap-1 text-xs font-medium text-red-700 dark:text-red-300">
            <XCircle className="size-3.5" aria-hidden="true" />
            你的答案（最近一次）
          </p>
          <AnswerKeys question={question} keys={entry.selected} tone="wrong" />
        </div>
        <div>
          <p className="flex items-center gap-1 text-xs font-medium text-green-700 dark:text-green-300">
            <CheckCircle2 className="size-3.5" aria-hidden="true" />
            正确答案
          </p>
          <AnswerKeys question={question} keys={question.answer} tone="correct" />
        </div>
      </div>

      <div className="mt-3 border-t border-slate-200 pt-3 dark:border-slate-700">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">解析</p>
        {question.explanation ? (
          <MarkdownContent className="mt-1 text-sm text-slate-700 dark:text-slate-200">
            {question.explanation}
          </MarkdownContent>
        ) : (
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">暂无解析</p>
        )}
      </div>

      {entry.wrongCount > 1 && (
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          累计答错 {entry.wrongCount} 次，最近一次 {formatTime(entry.lastWrongAt)}
        </p>
      )}
    </article>
  )
}

export default function WrongBookPage() {
  const navigate = useNavigate()
  const [entries, setEntries] = useState<WrongEntry[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pendingBankId, setPendingBankId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const list = await listWrong()
        if (!cancelled) setEntries(list)
      } catch {
        if (!cancelled) setError('读取错题本失败，请稍后重试。')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const groups = useMemo(() => groupEntries(entries ?? []), [entries])

  async function handleAssemble(group: WrongGroup) {
    if (pendingBankId) return

    const questionIds = getWrongBookQuestionIds(group.entries, group.bankId)
    if (questionIds.length === 0) return

    setPendingBankId(group.bankId)
    setActionError(null)
    try {
      const next = await createSession({ bankId: group.bankId, questionIds })
      navigate(`/practice/${next.id}`)
    } catch {
      setActionError('创建错题组卷失败，请重试。')
      setPendingBankId(null)
    }
  }

  if (loading) {
    return (
      <section className="py-16 text-center text-slate-600 dark:text-slate-300">
        <Loader2 className="mx-auto size-6 animate-spin" aria-hidden="true" />
        <p className="mt-3 text-sm">正在加载错题本…</p>
      </section>
    )
  }

  if (error) {
    return (
      <section className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center dark:border-slate-700 dark:bg-slate-900">
        <AlertTriangle className="mx-auto size-8 text-amber-500" aria-hidden="true" />
        <h1 className="mt-3 text-lg font-semibold">无法打开错题本</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{error}</p>
        <Link
          to="/"
          className="mt-5 inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          返回题库
        </Link>
      </section>
    )
  }

  if (!entries || entries.length === 0) {
    return (
      <section className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-10 text-center dark:border-slate-700 dark:bg-slate-900">
        <BookOpenCheck
          className="mx-auto size-10 text-green-600 dark:text-green-400"
          aria-hidden="true"
        />
        <h1 className="mt-3 text-lg font-semibold">错题本是空的</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          练习中答错的题会自动收进这里，方便以后集中复习。
        </p>
        <Link
          to="/"
          className="mt-5 inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          去刷题
        </Link>
      </section>
    )
  }

  return (
    <section>
      <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-lg font-semibold">错题本累计</h1>
          <span className="text-sm tabular-nums text-slate-600 dark:text-slate-300">
            共 {entries.length} 题
          </span>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          跨多次练习累计，同一道题只保留一条记录；重复答错会累加次数，但首次答错时间保持不变。与结果页的“本次错题”不是同一口径。
        </p>
        <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          可按题库把累计错题组卷成新一轮练习，成绩独立记录，不影响已有结果；已不在题库中的错题不会进入组卷。
        </p>
        <Link
          to="/"
          className="mt-4 inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          返回题库
        </Link>
      </div>

      {actionError && (
        <div
          role="alert"
          className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{actionError}</span>
        </div>
      )}

      <div className="mt-5 space-y-6">
        {groups.map((group) => {
          const assembleIds = getWrongBookQuestionIds(group.entries, group.bankId)

          return (
            <section key={group.bankId} aria-labelledby={`bank-${group.bankId}`}>
              <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 px-1">
                <h2
                  id={`bank-${group.bankId}`}
                  className="flex items-baseline gap-2"
                >
                  <span className="text-sm font-semibold">{group.name}</span>
                  <span className="text-xs tabular-nums text-slate-500 dark:text-slate-400">
                    {group.entries.length} 题
                  </span>
                </h2>
                {assembleIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => void handleAssemble(group)}
                    disabled={pendingBankId !== null}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 dark:disabled:bg-slate-700 dark:disabled:text-slate-400"
                  >
                    {pendingBankId === group.bankId ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <ListChecks className="size-4" aria-hidden="true" />
                    )}
                    错题组卷（{assembleIds.length} 题）
                  </button>
                )}
              </div>
              <div className="space-y-3">
                {group.entries.map((entry) => (
                  <WrongItem key={entry.questionId} entry={entry} />
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </section>
  )
}

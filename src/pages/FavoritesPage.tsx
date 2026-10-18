import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
  CheckSquare,
  Loader2,
  Star,
  Trash2,
} from 'lucide-react'
import MarkdownContent from '@/components/MarkdownContent'
import SelectionCheckbox from '@/components/SelectionCheckbox'
import { banks, getQuestion } from '@/lib/banks'
import { listFavorites, removeFavorite, removeFavoriteMany } from '@/lib/db'
import type { FavoriteEntry, QuestionType } from '@/types'

const TYPE_LABELS: Record<QuestionType, string> = {
  single: '单选题',
  multi: '多选题',
  judge: '判断题',
}

interface FavoriteGroup {
  bankId: string
  name: string
  entries: FavoriteEntry[]
}

function groupEntries(entries: FavoriteEntry[]): FavoriteGroup[] {
  const byBank = new Map<string, FavoriteEntry[]>()

  for (const entry of entries) {
    const list = byBank.get(entry.bankId)
    if (list) {
      list.push(entry)
    } else {
      byBank.set(entry.bankId, [entry])
    }
  }

  const groups: FavoriteGroup[] = []

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

export default function FavoritesPage() {
  const [entries, setEntries] = useState<FavoriteEntry[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [batchMode, setBatchMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [batchPending, setBatchPending] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const list = await listFavorites()
        if (!cancelled) setEntries(list)
      } catch {
        if (!cancelled) setError('读取收藏夹失败，请稍后重试。')
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
  const allIds = useMemo(
    () => (entries ?? []).map((entry) => entry.questionId),
    [entries],
  )
  const allSelected = allIds.length > 0 && selectedIds.size === allIds.length

  function toggleSelect(questionId: string) {
    setSelectedIds((previous) => {
      const next = new Set(previous)
      if (next.has(questionId)) next.delete(questionId)
      else next.add(questionId)
      return next
    })
  }

  function toggleSelectAll() {
    setSelectedIds(allSelected ? new Set() : new Set(allIds))
  }

  async function handleBatchRemove() {
    if (!entries || selectedIds.size === 0 || batchPending) return
    if (!window.confirm(`确定取消选中的 ${selectedIds.size} 道题的收藏吗？`)) return

    setBatchPending(true)
    setActionError(null)
    try {
      await removeFavoriteMany([...selectedIds])
      setEntries((previous) =>
        previous
          ? previous.filter((entry) => !selectedIds.has(entry.questionId))
          : previous,
      )
      setSelectedIds(new Set())
      setBatchMode(false)
    } catch {
      setActionError('批量取消收藏失败，请重试。')
    } finally {
      setBatchPending(false)
    }
  }

  async function handleRemove(questionId: string) {
    if (pendingId) return

    setPendingId(questionId)
    setActionError(null)
    try {
      await removeFavorite(questionId)
      setEntries((prev) =>
        prev ? prev.filter((entry) => entry.questionId !== questionId) : prev,
      )
    } catch {
      setActionError('取消收藏失败，请重试。')
    } finally {
      setPendingId(null)
    }
  }

  if (loading) {
    return (
      <section className="py-16 text-center text-slate-600 dark:text-slate-300">
        <Loader2 className="mx-auto size-6 animate-spin" aria-hidden="true" />
        <p className="mt-3 text-sm">正在加载收藏夹…</p>
      </section>
    )
  }

  if (error) {
    return (
      <section className="rounded-[var(--radius-card)] border border-slate-200/80 bg-white/85 p-8 text-center shadow-soft backdrop-blur-sm dark:border-slate-700/70 dark:bg-slate-900/80">
        <AlertTriangle className="mx-auto size-8 text-amber-500" aria-hidden="true" />
        <h1 className="mt-3 font-display text-xl font-semibold">无法打开收藏夹</h1>
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

  if (!entries || entries.length === 0) {
    return (
      <section className="rounded-[var(--radius-card)] border border-slate-200/80 bg-white/85 p-10 text-center shadow-soft backdrop-blur-sm dark:border-slate-700/70 dark:bg-slate-900/80">
        <Star
          className="mx-auto size-10 text-amber-500 dark:text-amber-400"
          aria-hidden="true"
        />
        <h1 className="mt-3 font-display text-xl font-semibold">收藏夹是空的</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          答题页点击顶部的“收藏”，之后可以在这里集中查看。
        </p>
        <Link
          to="/banks"
          className="mt-5 inline-flex min-h-11 items-center gap-1.5 rounded-full bg-blue-600 px-5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          去刷题
        </Link>
      </section>
    )
  }

  return (
    <section className={batchMode ? 'pb-24' : undefined}>
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.22em] text-blue-700 uppercase dark:text-blue-300">
            <span
              aria-hidden="true"
              className="inline-block size-1.5 rounded-full bg-blue-500"
            />
            Favorites
          </p>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            收藏夹
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm tabular-nums text-slate-600 dark:text-slate-300">
            共 {entries.length} 题
          </span>
          <button
            type="button"
            onClick={() => {
              setBatchMode((mode) => !mode)
              setSelectedIds(new Set())
            }}
            aria-pressed={batchMode}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-slate-200/90 bg-white/70 px-4 text-sm font-medium transition-colors hover:bg-white hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900/60 dark:hover:bg-slate-800 dark:hover:text-blue-300"
          >
            <CheckSquare className="size-4" aria-hidden="true" />
            {batchMode ? '完成' : '批量管理'}
          </button>
        </div>
      </header>

      {actionError && (
        <div
          role="alert"
          className="mt-4 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50/80 p-3.5 text-sm text-red-700 shadow-sm backdrop-blur dark:border-red-900 dark:bg-red-950/50 dark:text-red-300"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{actionError}</span>
        </div>
      )}

      <div className="mt-5 space-y-6">
        {groups.map((group) => (
          <section key={group.bankId} aria-labelledby={`favorites-${group.bankId}`}>
            <h2
              id={`favorites-${group.bankId}`}
              className="mb-2.5 flex items-baseline justify-between gap-2 px-1"
            >
              <span className="text-sm font-semibold">{group.name}</span>
              <span className="text-xs tabular-nums text-slate-500 dark:text-slate-400">
                {group.entries.length} 题
              </span>
            </h2>
            <div className="space-y-3">
              {group.entries.map((entry) => {
                const question = getQuestion(entry.questionId)

                if (!question) {
                  return (
                    <article
                      key={entry.questionId}
                      className="rounded-[var(--radius-card)] border border-amber-200 bg-amber-50/60 p-5 shadow-sm backdrop-blur-sm dark:border-amber-900 dark:bg-amber-950/30"
                    >
                      <header className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {batchMode && (
                            <SelectionCheckbox
                              label={`选择记录 ${entry.questionId}`}
                              checked={selectedIds.has(entry.questionId)}
                              onChange={() => toggleSelect(entry.questionId)}
                            />
                          )}
                          <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
                            题目缺失
                          </span>
                        </div>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          收藏于：{formatTime(entry.createdAt)}
                        </span>
                      </header>
                      <p className="mt-2 flex items-start gap-1.5 text-sm text-slate-700 dark:text-slate-200">
                        <AlertTriangle
                          className="mt-0.5 size-4 shrink-0 text-amber-500"
                          aria-hidden="true"
                        />
                        该题已不在当前题库中（可能因解析异常被排除），暂时无法展示题干。
                      </p>
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                        记录 ID：{entry.questionId}
                      </p>
                      <div className="mt-3 flex justify-end">
                        <button
                          type="button"
                          onClick={() => void handleRemove(entry.questionId)}
                          disabled={pendingId !== null}
                          className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-red-200 px-4 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40"
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                          {pendingId === entry.questionId ? '取消中…' : '取消收藏'}
                        </button>
                      </div>
                    </article>
                  )
                }

                return (
                  <article
                    key={entry.questionId}
                    className="rounded-[var(--radius-card)] border border-slate-200/80 bg-white/85 p-5 shadow-soft backdrop-blur-sm dark:border-slate-700/70 dark:bg-slate-900/80"
                  >
                    <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-slate-200 pb-2.5 dark:border-slate-700">
                      <div className="flex items-center gap-2">
                        {batchMode && (
                          <SelectionCheckbox
                            label={`选择第 ${question.number} 题`}
                            checked={selectedIds.has(entry.questionId)}
                            onChange={() => toggleSelect(entry.questionId)}
                          />
                        )}
                        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                          {TYPE_LABELS[question.type]}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          题号 {question.number}
                        </span>
                      </div>
                      <span className="text-xs tabular-nums text-slate-500 dark:text-slate-400">
                        收藏于：{formatTime(entry.createdAt)}
                      </span>
                    </header>

                    <MarkdownContent className="mt-3 text-sm leading-relaxed">
                      {question.stem}
                    </MarkdownContent>

                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        onClick={() => void handleRemove(entry.questionId)}
                        disabled={pendingId !== null}
                        className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-red-200 px-4 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40"
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                        {pendingId === entry.questionId ? '取消中…' : '取消收藏'}
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          </section>
        ))}
      </div>

      {batchMode && (
        <div className="fixed inset-x-3 bottom-4 z-30 mx-auto flex max-w-2xl flex-wrap items-center justify-between gap-2 rounded-full border border-slate-200/80 bg-white/95 px-3 py-2 shadow-lift backdrop-blur-xl dark:border-slate-700/70 dark:bg-slate-900/95">
          <button
            type="button"
            onClick={toggleSelectAll}
            className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {allSelected ? '取消全选' : '全选'}
          </button>
          <span className="text-xs tabular-nums text-slate-500 dark:text-slate-400">
            已选 {selectedIds.size} 题
          </span>
          <button
            type="button"
            onClick={() => void handleBatchRemove()}
            disabled={selectedIds.size === 0 || batchPending}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-red-600 px-4 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 dark:disabled:bg-slate-700 dark:disabled:text-slate-400"
          >
            {batchPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Trash2 className="size-4" aria-hidden="true" />
            )}
            取消收藏
          </button>
        </div>
      )}
    </section>
  )
}

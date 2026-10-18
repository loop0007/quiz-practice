import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Loader2,
  Send,
  Star,
} from 'lucide-react'
import MobilePaletteSheet from '@/components/MobilePaletteSheet'
import QuestionCard from '@/components/QuestionCard'
import QuestionPalette from '@/components/QuestionPalette'
import { addFavorite, listFavorites, removeFavorite } from '@/lib/db'
import { getSessionStats } from '@/lib/scoring'
import { resolvePracticeShortcut } from '@/lib/shortcuts'
import { usePracticeStore } from '@/store/usePracticeStore'

export default function PracticePage() {
  const { sessionId = '' } = useParams()
  const navigate = useNavigate()

  const session = usePracticeStore((state) => state.session)
  /**
   * store 可能仍保留上一场练习；只有与路由一致时才是当前会话。
   * 避免首帧用旧会话的 finishedAt 触发错误重定向。
   */
  const currentSession = session?.id === sessionId ? session : null
  const questions = usePracticeStore((state) => state.questions)
  const loadingId = usePracticeStore((state) => state.loadingId)
  const submitting = usePracticeStore((state) => state.submitting)
  const error = usePracticeStore((state) => state.error)
  const drafts = usePracticeStore((state) => state.drafts)
  const loadSession = usePracticeStore((state) => state.loadSession)
  const select = usePracticeStore((state) => state.select)
  const submitCurrent = usePracticeStore((state) => state.submitCurrent)
  const goTo = usePracticeStore((state) => state.goTo)
  const finish = usePracticeStore((state) => state.finish)

  const [paletteOpen, setPaletteOpen] = useState(false)
  const [favoriteIds, setFavoriteIds] = useState<string[]>([])
  const [favoritePending, setFavoritePending] = useState(false)
  const [favoriteError, setFavoriteError] = useState<string | null>(null)
  const previousIndexRef = useRef<number | null>(null)

  useEffect(() => {
    void loadSession(sessionId)
  }, [sessionId, loadSession])

  useEffect(() => {
    let cancelled = false

    async function loadFavorites() {
      try {
        const list = await listFavorites()
        if (!cancelled) setFavoriteIds(list.map((entry) => entry.questionId))
      } catch {
        if (!cancelled) setFavoriteError('读取收藏夹失败，收藏状态可能不准确。')
      }
    }

    void loadFavorites()
    return () => {
      cancelled = true
    }
  }, [])

  const currentIndex = useMemo(() => {
    if (!currentSession || questions.length === 0) return 0
    return Math.min(Math.max(currentSession.currentIndex, 0), questions.length - 1)
  }, [currentSession, questions.length])

  useEffect(() => {
    const previous = previousIndexRef.current
    previousIndexRef.current = currentIndex
    if (previous !== null && previous !== currentIndex) {
      const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' })
    }
  }, [currentIndex])

  /** E6：快捷键只读取当前会话状态；弹窗、输入框与组合键不接管。 */
  const shortcutQuestion =
    currentSession && questions.length > 0 ? questions[currentIndex] : null
  const shortcutRecord = shortcutQuestion
    ? currentSession?.answers[shortcutQuestion.id]
    : undefined
  const shortcutSelected = shortcutQuestion
    ? shortcutRecord?.selected ?? drafts[shortcutQuestion.id] ?? []
    : []

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (
        event.defaultPrevented ||
        event.repeat ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        !shortcutQuestion
      ) {
        return
      }

      const target = event.target
      if (target instanceof HTMLElement) {
        if (target.isContentEditable) return
        if (target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return
        if (target.tagName === 'INPUT') {
          const type = (target as HTMLInputElement).type
          if (type !== 'radio' && type !== 'checkbox') return
        }
      }
      if (document.querySelector('dialog[open]')) return

      const action = resolvePracticeShortcut({
        key: event.key,
        optionKeys: shortcutQuestion.options.map((option) => option.key),
        locked: Boolean(shortcutRecord),
        canSubmit: !shortcutRecord && shortcutSelected.length > 0,
      })
      if (!action) return

      event.preventDefault()
      if (action.type === 'select') {
        select(
          shortcutQuestion.id,
          action.key,
          shortcutQuestion.type === 'multi',
        )
      } else if (action.type === 'submit') {
        void submitCurrent()
      } else if (action.type === 'prev') {
        if (currentIndex > 0) void goTo(currentIndex - 1)
      } else if (currentIndex < questions.length - 1) {
        void goTo(currentIndex + 1)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    currentIndex,
    drafts,
    goTo,
    questions.length,
    select,
    shortcutQuestion,
    shortcutRecord,
    shortcutSelected,
    submitCurrent,
  ])

  if (currentSession?.finishedAt != null) {
    return <Navigate to={`/result/${currentSession.id}`} replace />
  }

  const loading = loadingId !== null || (!currentSession && !error)

  if (loading) {
    return (
      <section className="py-16 text-center text-slate-600 dark:text-slate-300">
        <Loader2 className="mx-auto size-6 animate-spin" aria-hidden="true" />
        <p className="mt-3 text-sm">正在加载练习…</p>
      </section>
    )
  }

  if (!currentSession || questions.length === 0) {
    return (
      <section className="rounded-[var(--radius-card)] border border-slate-200/80 bg-white/85 p-8 text-center shadow-soft backdrop-blur-sm dark:border-slate-700/70 dark:bg-slate-900/80">
        <AlertTriangle
          className="mx-auto size-8 text-amber-500"
          aria-hidden="true"
        />
        <h1 className="mt-3 text-lg font-semibold">无法打开本次练习</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          {error ?? '练习记录不存在或已损坏。'}
        </p>
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

  const question = questions[currentIndex]
  const bankId = currentSession.bankId
  const record = currentSession.answers[question.id]
  const selected = record?.selected ?? drafts[question.id] ?? []
  const stats = getSessionStats(currentSession)
  const progress = stats.total === 0 ? 0 : (stats.answered / stats.total) * 100
  const canSubmit = !record && selected.length > 0 && !submitting
  const favorited = favoriteIds.includes(question.id)

  async function handleToggleFavorite() {
    if (favoritePending) return

    const questionId = question.id
    const wasFavorited = favoriteIds.includes(questionId)
    setFavoritePending(true)
    setFavoriteError(null)
    try {
      if (wasFavorited) {
        await removeFavorite(questionId)
        setFavoriteIds((prev) => prev.filter((id) => id !== questionId))
      } else {
        await addFavorite({ questionId, bankId })
        setFavoriteIds((prev) =>
          prev.includes(questionId) ? prev : [...prev, questionId],
        )
      }
    } catch {
      setFavoriteError('收藏操作失败，请重试。')
    } finally {
      setFavoritePending(false)
    }
  }

  function handlePaletteSelect(index: number) {
    setPaletteOpen(false)
    void goTo(index)
  }

  async function handleFinish() {
    if (!currentSession) return

    if (stats.unanswered > 0) {
      const firstConfirmed = window.confirm(
        `还有 ${stats.unanswered} 题未提交，未作答将按错误计入正确率。确定交卷吗？`,
      )
      if (!firstConfirmed) return

      const secondConfirmed = window.confirm(
        '再次确认：交卷后不能再修改答案，确认现在交卷吗？',
      )
      if (!secondConfirmed) return
    }

    const id = await finish()
    if (id) navigate(`/result/${id}`)
  }

  return (
    <section className="pb-24 lg:pb-0">
      <div className="mb-4 flex items-center justify-between gap-3">
        <Link
          to="/banks"
          className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm text-slate-600 transition-colors hover:bg-white/70 hover:text-blue-700 dark:text-slate-300 dark:hover:bg-slate-900/70 dark:hover:text-blue-300"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          题库
        </Link>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void handleToggleFavorite()}
            disabled={favoritePending}
            aria-pressed={favorited}
            className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
              favorited
                ? 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200 dark:hover:bg-amber-950/70'
                : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800'
            }`}
          >
            {favoritePending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Star
                className="size-4"
                fill={favorited ? 'currentColor' : 'none'}
                aria-hidden="true"
              />
            )}
            {favorited ? '已收藏' : '收藏'}
          </button>
          <button
            type="button"
            onClick={handleFinish}
            className="hidden min-h-11 items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-4 text-sm font-medium text-amber-800 transition-colors hover:bg-amber-100 lg:inline-flex dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200 dark:hover:bg-amber-950/70"
          >
            <CheckCheck className="size-4" aria-hidden="true" />
            交卷
          </button>
        </div>
      </div>

      <div className="mb-4 rounded-[1.5rem] border border-slate-200/80 bg-white/80 px-4 py-3.5 shadow-soft backdrop-blur-sm dark:border-slate-700/70 dark:bg-slate-900/75">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
          <span className="font-medium tabular-nums">
            第 {currentIndex + 1} / {stats.total} 题
          </span>
          <span className="tabular-nums">
            已答 {stats.answered} · 答对 {stats.correct} · 正确率{' '}
            {Math.round(stats.accuracy * 100)}%
          </span>
        </div>
        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-amber-400 transition-[width]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {favoriteError && (
        <div
          role="alert"
          className="mb-4 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50/80 p-3.5 text-sm text-red-700 shadow-sm backdrop-blur dark:border-red-900 dark:bg-red-950/50 dark:text-red-300"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{favoriteError}</span>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mb-4 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50/80 p-3.5 text-sm text-red-700 shadow-sm backdrop-blur dark:border-red-900 dark:bg-red-950/50 dark:text-red-300"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_15rem] lg:items-start lg:gap-6">
        <div className="min-w-0">
          <QuestionCard
            question={question}
            index={currentIndex}
            total={questions.length}
            selected={selected}
            record={record}
            onSelect={(key) => select(question.id, key, question.type === 'multi')}
          />

          <div className="mt-4 hidden flex-wrap items-center gap-2 lg:flex">
            <button
              type="button"
              onClick={() => void submitCurrent()}
              disabled={!canSubmit}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-full bg-blue-600 px-6 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 sm:flex-none dark:disabled:bg-slate-700 dark:disabled:text-slate-400"
            >
              {submitting ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Send className="size-4" aria-hidden="true" />
              )}
              {record ? '已提交' : '提交答案'}
            </button>
            {!record && selected.length === 0 && (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                选择答案后可提交
              </span>
            )}
            {record && (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                已提交，答案已锁定
              </span>
            )}
          </div>

          <div className="mt-4 hidden items-center justify-between gap-2 lg:flex">
            <button
              type="button"
              onClick={() => void goTo(currentIndex - 1)}
              disabled={currentIndex === 0}
              className="inline-flex min-h-11 items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-sm font-medium transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
              上一题
            </button>
            <button
              type="button"
              onClick={() => void goTo(currentIndex + 1)}
              disabled={currentIndex === questions.length - 1}
              className="inline-flex min-h-11 items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-sm font-medium transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
            >
              下一题
              <ChevronRight className="size-4" aria-hidden="true" />
            </button>
          </div>

          <p className="mt-3 hidden text-center text-xs text-slate-500 lg:block dark:text-slate-400">
            键盘：字母键选择答案 · Enter 提交 · ← / → 翻题
          </p>
        </div>

        <aside className="hidden rounded-[var(--radius-card)] border border-slate-200/80 bg-white/85 p-4 shadow-soft backdrop-blur-sm lg:sticky lg:top-4 lg:block dark:border-slate-700/70 dark:bg-slate-900/80">
          <QuestionPalette
            questions={questions}
            session={currentSession}
            currentIndex={currentIndex}
            onSelect={handlePaletteSelect}
          />
        </aside>
      </div>

      <nav
        aria-label="答题操作"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--color-border)] bg-white/90 shadow-[0_-18px_40px_-30px_rgb(74_52_28/0.5)] backdrop-blur-xl lg:hidden dark:border-slate-700 dark:bg-slate-900/90"
        style={{ paddingBottom: 'calc(0.375rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="mx-auto flex max-w-4xl items-stretch gap-1 px-2 pt-1.5">
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="flex min-h-12 min-w-12 flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-[10px] font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <LayoutGrid className="size-5" aria-hidden="true" />
            题号
          </button>
          <button
            type="button"
            onClick={() => void goTo(currentIndex - 1)}
            disabled={currentIndex === 0}
            aria-label="上一题"
            className="flex min-h-12 min-w-12 flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-[10px] font-medium text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <ChevronLeft className="size-5" aria-hidden="true" />
            上一题
          </button>
          <button
            type="button"
            onClick={() => void submitCurrent()}
            disabled={!canSubmit}
            className="flex min-h-12 flex-1 items-center justify-center gap-1.5 rounded-2xl bg-blue-600 px-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 dark:disabled:bg-slate-700 dark:disabled:text-slate-400"
          >
            {submitting ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Send className="size-4" aria-hidden="true" />
            )}
            {record ? '已提交' : '提交答案'}
          </button>
          <button
            type="button"
            onClick={() => void goTo(currentIndex + 1)}
            disabled={currentIndex === questions.length - 1}
            aria-label="下一题"
            className="flex min-h-12 min-w-12 flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-[10px] font-medium text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <ChevronRight className="size-5" aria-hidden="true" />
            下一题
          </button>
          <button
            type="button"
            onClick={handleFinish}
            className="flex min-h-12 min-w-12 flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-[10px] font-medium text-amber-700 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-950/40"
          >
            <CheckCheck className="size-5" aria-hidden="true" />
            交卷
          </button>
        </div>
      </nav>

      {paletteOpen && (
        <MobilePaletteSheet
          questions={questions}
          session={currentSession}
          currentIndex={currentIndex}
          onSelect={handlePaletteSelect}
          onClose={() => setPaletteOpen(false)}
        />
      )}
    </section>
  )
}

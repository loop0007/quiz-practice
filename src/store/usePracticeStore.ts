/**
 * 当前练习会话状态（M5）。
 *
 * 唯一数据源是 IndexedDB 中的 session：
 * - 答案只在首次提交时写入，重复提交不改成绩。
 * - 未提交的勾选暂存在 drafts，仅用于当前页面内翻题保留。
 */
import { create } from 'zustand'
import { getQuestion } from '@/lib/banks'
import { addWrong, getSession, saveSession } from '@/lib/db'
import { submitAnswer } from '@/lib/scoring'
import type { PracticeSession, Question } from '@/types'

interface PracticeState {
  session: PracticeSession | null
  /** 按 session.questionIds 顺序展开的题目。 */
  questions: Question[]
  loadingId: string | null
  submitting: boolean
  error: string | null
  /** 未提交的选择，键为 questionId。 */
  drafts: Record<string, string[]>
  loadSession: (sessionId: string) => Promise<void>
  select: (questionId: string, key: string, multi: boolean) => void
  submitCurrent: () => Promise<void>
  goTo: (index: number) => Promise<void>
  finish: () => Promise<string | null>
  reset: () => void
}

const initialState = {
  session: null,
  questions: [] as Question[],
  loadingId: null,
  submitting: false,
  error: null,
  drafts: {} as Record<string, string[]>,
}

function messageOf(cause: unknown, fallback: string): string {
  return cause instanceof Error && cause.message ? cause.message : fallback
}

export const usePracticeStore = create<PracticeState>()((set, get) => ({
  ...initialState,

  loadSession: async (sessionId) => {
    const state = get()
    if (state.session?.id === sessionId && !state.error) return
    if (state.loadingId === sessionId) return

    set({
      ...initialState,
      loadingId: sessionId,
    })

    try {
      const session = await getSession(sessionId)
      if (!session) throw new Error('练习记录不存在或已被删除')

      const missing = session.questionIds.filter((id) => !getQuestion(id))
      if (missing.length > 0) {
        throw new Error('部分题目已不存在，无法继续本次练习')
      }

      const questions = session.questionIds.map((id) => getQuestion(id)!)

      if (get().loadingId !== sessionId) return

      set({
        session,
        questions,
        drafts: Object.fromEntries(
          Object.entries(session.answers).map(([id, record]) => [id, [...record.selected]]),
        ),
        loadingId: null,
      })
    } catch (cause) {
      if (get().loadingId !== sessionId) return
      set({
        loadingId: null,
        error: messageOf(cause, '加载练习失败，请返回题库重试'),
      })
    }
  },

  select: (questionId, key, multi) => {
    const { session, drafts } = get()
    if (!session || session.answers[questionId]) return

    const current = drafts[questionId] ?? []
    const next = multi
      ? current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key]
      : [key]

    set({ drafts: { ...drafts, [questionId]: next } })
  },

  submitCurrent: async () => {
    const { session, questions, drafts, submitting } = get()
    if (!session || submitting) return

    const question = questions[session.currentIndex]
    if (!question) return

    // 幂等：已有记录直接返回，双击 / 重复点击无副作用。
    if (session.answers[question.id]) return

    const selected = drafts[question.id] ?? []
    if (selected.length === 0) return

    set({ submitting: true, error: null })

    try {
      const result = submitAnswer(session, question, selected)
      if (!result.applied) return

      await saveSession(result.session)
      set({ session: result.session })

      // 首次答错才写错题本；错题本跨 session 累计。
      if (!result.record.correct) {
        try {
          await addWrong({
            questionId: question.id,
            bankId: session.bankId,
            selected: result.record.selected,
          })
        } catch (cause) {
          set({
            error: messageOf(cause, '答案已保存，但写入错题本失败'),
          })
        }
      }
    } catch (cause) {
      set({ error: messageOf(cause, '提交失败，请重试') })
    } finally {
      set({ submitting: false })
    }
  },

  goTo: async (index) => {
    const { session, questions } = get()
    if (!session) return

    const next = Math.max(0, Math.min(index, questions.length - 1))
    if (next === session.currentIndex) return

    const nextSession = { ...session, currentIndex: next }
    set({ session: nextSession })

    try {
      await saveSession(nextSession)
    } catch (cause) {
      set({ error: messageOf(cause, '进度保存失败，刷新后可能回到上一次的题号') })
    }
  },

  finish: async () => {
    const { session, submitting } = get()
    if (!session || submitting) return null
    if (session.finishedAt != null) return session.id

    const nextSession = { ...session, finishedAt: Date.now() }

    try {
      await saveSession(nextSession)
      set({ session: nextSession })
      return nextSession.id
    } catch (cause) {
      set({ error: messageOf(cause, '交卷失败，请重试') })
      return null
    }
  },

  reset: () => set({ ...initialState }),
}))

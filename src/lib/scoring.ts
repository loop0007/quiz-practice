/**
 * 判分与统计（M3）。
 *
 * 约束：
 * - 纯函数，不 import React / Dexie / 页面组件。
 * - 判分只在本文件实现，页面与 store 不得另写一套。
 * - 统计以 session.questionIds 快照为准，未作答按错误计入正确率分母。
 */
import type {
  AnswerRecord,
  PracticeSession,
  Question,
  QuestionType,
} from '../types'

export type QuestionStatus = 'unanswered' | 'correct' | 'wrong'

export interface SessionStats {
  /** 本次练习题目总数（快照长度）。 */
  total: number
  /** 已提交题数。 */
  answered: number
  /** 提交且正确。 */
  correct: number
  /** 提交且错误。 */
  wrong: number
  /** 未提交题数；交卷时按错误计入正确率。 */
  unanswered: number
  /** 0–1；分母为快照总数，未作答计入分母。 */
  accuracy: number
  /** 本次答错（已提交且错误）的题号。 */
  wrongQuestionIds: string[]
  /** 本次未作答的题号。 */
  unansweredQuestionIds: string[]
}

export interface SubmitAnswerResult {
  /** 首次提交返回新对象；重复提交原样返回入参，不产生副作用。 */
  session: PracticeSession
  record: AnswerRecord
  /** false 表示该题此前已提交，本次未改变 session。 */
  applied: boolean
}

/** 统一为大写、去空、去重、排序后的选项字母。 */
export function normalizeSelected(selected: readonly string[]): string[] {
  return Array.from(
    new Set(
      selected
        .map((key) => key.trim().toUpperCase())
        .filter((key) => key.length > 0),
    ),
  ).sort()
}

/**
 * 选项集合完全一致才算正确。
 * 单选 / 判断 / 多选统一按集合比较：顺序无关，少选、多选、空选均错。
 */
export function isAnswerCorrect(
  question: Pick<Question, 'answer'>,
  selected: readonly string[],
): boolean {
  const picked = normalizeSelected(selected)
  const expected = normalizeSelected(question.answer)

  if (expected.length === 0 || picked.length !== expected.length) return false
  return expected.every((key, index) => key === picked[index])
}

/**
 * 首次提交计分。
 * 已存在该题记录时直接返回原 session 与旧记录，重复提交 / 双击不改变成绩。
 * 题目不在本次快照中时抛错，避免把记录写到统计口径之外。
 */
export function submitAnswer(
  session: PracticeSession,
  question: Question,
  selected: readonly string[],
  answeredAt: number = Date.now(),
): SubmitAnswerResult {
  const existing = session.answers[question.id]
  if (existing) return { session, record: existing, applied: false }

  if (!session.questionIds.includes(question.id)) {
    throw new Error(`submitAnswer: 题目 ${question.id} 不在本次练习中`)
  }

  const record: AnswerRecord = {
    questionId: question.id,
    selected: normalizeSelected(selected),
    correct: isAnswerCorrect(question, selected),
    answeredAt,
  }

  return {
    session: {
      ...session,
      answers: { ...session.answers, [question.id]: record },
    },
    record,
    applied: true,
  }
}

/**
 * 会话统计。
 *
 * `_questions` 保留在签名中与计划一致，当前统计以 session 快照为唯一口径，
 * 不读取题库数据，以免题库更新影响已开始练习的成绩。
 */
export function getSessionStats(
  session: PracticeSession,
  _questions?: Record<string, Question>,
): SessionStats {
  const wrongQuestionIds: string[] = []
  const unansweredQuestionIds: string[] = []
  let answered = 0
  let correct = 0

  for (const questionId of session.questionIds) {
    const record = session.answers[questionId]
    if (!record) {
      unansweredQuestionIds.push(questionId)
      continue
    }

    answered += 1
    if (record.correct) {
      correct += 1
    } else {
      wrongQuestionIds.push(questionId)
    }
  }

  const total = session.questionIds.length
  const unanswered = total - answered

  return {
    total,
    answered,
    correct,
    wrong: answered - correct,
    unanswered,
    accuracy: total === 0 ? 0 : correct / total,
    wrongQuestionIds,
    unansweredQuestionIds,
  }
}

/** 题目状态：未提交 / 已提交且正确 / 已提交且错误。 */
export function getQuestionStatus(
  session: PracticeSession,
  questionId: string,
): QuestionStatus {
  const record = session.answers[questionId]
  if (!record) return 'unanswered'
  return record.correct ? 'correct' : 'wrong'
}

/**
 * 错题重练的题目快照：本次未答对的所有题（已提交且错误 + 未提交），
 * 保持原 session.questionIds 顺序。
 *
 * 未提交的题即使已勾选正确答案，也属于未作答并进入重练。
 */
export function getRedoQuestionIds(session: PracticeSession): string[] {
  const stats = getSessionStats(session)
  const retry = new Set([
    ...stats.wrongQuestionIds,
    ...stats.unansweredQuestionIds,
  ])
  return session.questionIds.filter((questionId) => retry.has(questionId))
}

/** 题型是否允许多选；供答题控件选择 radio / checkbox。 */
export function isMultiChoice(type: QuestionType): boolean {
  return type === 'multi'
}

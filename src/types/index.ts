/**
 * 题库解析产物与运行时共享契约（M1 冻结）。
 * 修改本文件时必须同步 scripts/parse-banks.mjs 并补 T1 测试。
 */

export type QuestionType = 'single' | 'multi' | 'judge'

export interface QuestionOption {
  /** 选项字母，统一大写，如 "A"。 */
  key: string
  text: string
}

export interface Question {
  /** `${bankId}:${number}`，全局唯一。 */
  id: string
  bankId: string
  chapterId: string
  number: number
  type: QuestionType
  stem: string
  options: QuestionOption[]
  /** 统一大写、去重、排序后的选项字母。 */
  answer: string[]
  explanation: string
}

export interface ChapterMeta {
  id: string
  title: string
  questionIds: string[]
}

export interface TypeCounts {
  single: number
  multi: number
  judge: number
}

export interface BankMeta {
  id: string
  name: string
  sourceFile: string
  /** 文件头声明的题量。 */
  declaredCount: number
  declaredTypeCounts: TypeCounts | null
  /** 实际识别出的题目块数量（含异常题）。 */
  parsedCount: number
  /** 可进入练习的题目数量（不含异常题）。 */
  validCount: number
  /** 有效题按题型统计。 */
  typeCounts: TypeCounts
  anomalyCount: number
  chapters: ChapterMeta[]
}

export type AnomalyCode =
  | 'missing-stem'
  | 'missing-answer'
  | 'answer-not-in-options'
  | 'invalid-options'
  | 'duplicate-id'
  | 'answer-count-mismatch'
  | 'unparsable-structure'
  | 'declared-count-mismatch'
  | 'declared-type-mismatch'

export interface Anomaly {
  code: AnomalyCode
  bankId: string
  questionId?: string
  number?: number
  /** 源文件行号（从 1 开始）。 */
  line?: number
  message: string
  /** 原文摘要，便于人工核对。 */
  excerpt: string
}

export interface BankData {
  banks: BankMeta[]
  /** 仅包含有效题；键为 `${bankId}:${number}`。 */
  questions: Record<string, Question>
}

/* ------------------------------------------------------------------ */
/* 会话与记录（M2 冻结）                                                */
/* ------------------------------------------------------------------ */

export interface AnswerRecord {
  questionId: string
  /** 已提交的选项字母，统一大写、排序、去重。 */
  selected: string[]
  correct: boolean
  /** 首次提交时间（毫秒时间戳）。 */
  answeredAt: number
}

export interface PracticeSession {
  id: string
  bankId: string
  startedAt: number
  /** null 表示进行中。 */
  finishedAt: number | null
  /** 开始练习时冻结的题目 ID 快照；统计以快照为准。 */
  questionIds: string[]
  /** 首次提交即写入；键为 questionId，后续提交不再覆盖。 */
  answers: Record<string, AnswerRecord>
  /** 当前题在 questionIds 中的下标，用于刷新后恢复。 */
  currentIndex: number
}

export interface FavoriteEntry {
  /** 作为主键，一题一条。 */
  questionId: string
  bankId: string
  createdAt: number
}

export interface WallpaperEntry {
  /** 固定为 custom：本机只保留一张自定义壁纸。 */
  id: string
  /** data URL，直接用作 CSS 背景图，避免额外的对象 URL 生命周期。 */
  dataUrl: string
  updatedAt: number
}

export interface WrongEntry {
  /** 作为主键，一题一条。 */
  questionId: string
  bankId: string
  /** 最近一次答错时的选择，用于错题本对照。 */
  selected: string[]
  /** 首次答错时间；重复答错不覆盖。 */
  firstWrongAt: number
  lastWrongAt: number
  wrongCount: number
}

export type FeedbackType =
  | 'wrong-answer'
  | 'missing-option'
  | 'wrong-explanation'
  | 'suggestion'
  | 'other'

export interface Feedback {
  /** Dexie 自增主键。 */
  id?: number
  /** 关联题目；主页通用反馈时为空。 */
  questionId?: string
  /** 关联题库；主页通用反馈时为空。 */
  bankId?: string
  type: FeedbackType
  note: string
  createdAt: number
}

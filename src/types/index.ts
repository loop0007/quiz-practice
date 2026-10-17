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

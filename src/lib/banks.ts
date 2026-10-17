/**
 * 题库静态数据访问（M4）。
 *
 * banks.json 只由 scripts/parse-banks.mjs 生成，本文件不修改数据。
 * 页面与 store 统一从这里取题库元信息与题目，不直接 import JSON。
 */
import banksJson from '../data/banks.json'
import anomaliesJson from '../data/anomalies.json'
import type { Anomaly, BankData, BankMeta, Question } from '../types'

const data = banksJson as unknown as BankData

export const banks: BankMeta[] = data.banks
export const questions: Record<string, Question> = data.questions
export const anomalies: Anomaly[] = anomaliesJson as unknown as Anomaly[]

const questionsByBank = new Map<string, Question[]>()
for (const question of Object.values(questions)) {
  const list = questionsByBank.get(question.bankId)
  if (list) {
    list.push(question)
  } else {
    questionsByBank.set(question.bankId, [question])
  }
}
for (const list of questionsByBank.values()) {
  list.sort((a, b) => a.number - b.number)
}

export function getBank(bankId: string): BankMeta | undefined {
  return banks.find((bank) => bank.id === bankId)
}

export function getQuestion(questionId: string): Question | undefined {
  return questions[questionId]
}

/** 该题库全部有效题，按题号升序；不含异常题。 */
export function getBankQuestions(bankId: string): Question[] {
  return questionsByBank.get(bankId) ?? []
}

/** 该题库的异常题记录（题库级异常无题号）。 */
export function getBankAnomalies(bankId: string): Anomaly[] {
  return anomalies.filter((anomaly) => anomaly.bankId === bankId)
}

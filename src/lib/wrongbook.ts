import { getQuestion } from './banks'
import type { WrongEntry } from '../types'

/**
 * 错题组卷快照：只保留该题库中仍有效的错题，按题库内题号升序。
 *
 * 题目缺失（解析异常被排除）的记录不进入练习；顺序取题号而非首次答错时间，
 * 保证组卷练习与题库顺序一致。
 */
export function getWrongBookQuestionIds(
  entries: WrongEntry[],
  bankId: string,
): string[] {
  return entries
    .filter((entry) => entry.bankId === bankId)
    .map((entry) => ({
      questionId: entry.questionId,
      number: getQuestion(entry.questionId)?.number,
    }))
    .filter(
      (item): item is { questionId: string; number: number } =>
        item.number !== undefined,
    )
    .sort((a, b) => a.number - b.number)
    .map((item) => item.questionId)
}

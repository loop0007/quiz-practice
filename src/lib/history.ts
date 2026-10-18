/**
 * 历史成绩汇总（E2）。
 * 只做已交卷会话的累计统计，复用 scoring 的统一口径。
 */
import { getSessionStats } from './scoring'
import type { PracticeSession } from '../types'

export interface HistorySummary {
  /** 已完成的练习次数。 */
  sessions: number
  /** 累计题目数（每次练习快照题数之和）。 */
  total: number
  /** 累计已作答题数。 */
  answered: number
  /** 累计答对数。 */
  correct: number
  /** 累计答对 / 累计总题数；未作答计入分母。 */
  accuracy: number
}

export function getHistorySummary(sessions: PracticeSession[]): HistorySummary {
  let total = 0
  let answered = 0
  let correct = 0

  for (const session of sessions) {
    const stats = getSessionStats(session)
    total += stats.total
    answered += stats.answered
    correct += stats.correct
  }

  return {
    sessions: sessions.length,
    total,
    answered,
    correct,
    accuracy: total === 0 ? 0 : correct / total,
  }
}

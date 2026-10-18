import { describe, expect, it } from 'vitest'
import { getHistorySummary } from './history'
import type { PracticeSession } from '../types'

function makeSession(overrides: Partial<PracticeSession> = {}): PracticeSession {
  return {
    id: 'session-1',
    bankId: 'web',
    startedAt: 1,
    finishedAt: 2,
    questionIds: ['web:1', 'web:2'],
    answers: {},
    currentIndex: 0,
    ...overrides,
  }
}

describe('E2 历史成绩汇总', () => {
  it('没有已完成练习时返回全零，正确率不为 NaN', () => {
    expect(getHistorySummary([])).toEqual({
      sessions: 0,
      total: 0,
      answered: 0,
      correct: 0,
      accuracy: 0,
    })
  })

  it('累计多次练习的题数、答对数与正确率', () => {
    const first = makeSession({
      id: 'first',
      answers: {
        'web:1': {
          questionId: 'web:1',
          selected: ['B'],
          correct: true,
          answeredAt: 10,
        },
      },
    })
    const second = makeSession({
      id: 'second',
      questionIds: ['web:3'],
      answers: {
        'web:3': {
          questionId: 'web:3',
          selected: ['A'],
          correct: true,
          answeredAt: 20,
        },
      },
    })

    const summary = getHistorySummary([first, second])
    expect(summary).toMatchObject({
      sessions: 2,
      total: 3,
      answered: 2,
      correct: 2,
    })
    expect(summary.accuracy).toBeCloseTo(2 / 3)
  })

  it('未作答计入正确率分母', () => {
    const summary = getHistorySummary([makeSession()])
    expect(summary.total).toBe(2)
    expect(summary.answered).toBe(0)
    expect(summary.accuracy).toBe(0)
  })
})

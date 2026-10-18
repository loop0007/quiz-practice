import { describe, expect, it } from 'vitest'
import { getWrongBookQuestionIds } from './wrongbook'
import type { WrongEntry } from '../types'

function entry(questionId: string, bankId: string, firstWrongAt = 1): WrongEntry {
  return {
    questionId,
    bankId,
    selected: ['A'],
    firstWrongAt,
    lastWrongAt: firstWrongAt,
    wrongCount: 1,
  }
}

describe('错题组卷', () => {
  it('按题库筛选并按题号升序排列', () => {
    const entries = [
      entry('java:10', 'java'),
      entry('java:2', 'java'),
      entry('web:2', 'web'),
      entry('java:5', 'java'),
    ]

    expect(getWrongBookQuestionIds(entries, 'java')).toEqual([
      'java:2',
      'java:5',
      'java:10',
    ])
  })

  it('忽略已不在题库中的错题', () => {
    const entries = [entry('java:9999', 'java'), entry('java:3', 'java')]

    expect(getWrongBookQuestionIds(entries, 'java')).toEqual(['java:3'])
  })

  it('没有该题库错题时返回空数组', () => {
    expect(getWrongBookQuestionIds([], 'java')).toEqual([])
    expect(getWrongBookQuestionIds([entry('web:1', 'web')], 'java')).toEqual([])
  })
})

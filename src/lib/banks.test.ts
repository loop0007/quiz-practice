import { describe, expect, it } from 'vitest'
import {
  anomalies,
  banks,
  getBank,
  getBankAnomalies,
  getBankQuestions,
  getQuestion,
  questions,
} from './banks'

describe('题库数据访问', () => {
  it('包含 Java 与 Web 两套题库', () => {
    expect(banks.map((bank) => bank.id)).toEqual(['java', 'web'])
  })

  it('有效题数量与元数据一致，且不含异常题', () => {
    for (const bank of banks) {
      const list = getBankQuestions(bank.id)
      expect(list).toHaveLength(bank.validCount)
      expect(list.every((question) => question.bankId === bank.id)).toBe(true)
    }
    expect(Object.keys(questions)).toHaveLength(336)
  })

  it('题目按题号升序，ID 与查询结果一致', () => {
    for (const bank of banks) {
      const list = getBankQuestions(bank.id)
      const numbers = list.map((question) => question.number)
      expect(numbers).toEqual([...numbers].sort((a, b) => a - b))
      expect(getQuestion(list[0].id)).toBe(list[0])
    }
  })

  it('未知题库/题目返回兜底值', () => {
    expect(getBank('nope')).toBeUndefined()
    expect(getQuestion('nope:1')).toBeUndefined()
    expect(getBankQuestions('nope')).toEqual([])
    expect(getBankAnomalies('nope')).toEqual([])
  })

  it('异常记录按题库归组', () => {
    expect(getBankAnomalies('java')).toHaveLength(1)
    expect(getBankAnomalies('web').length).toBeGreaterThanOrEqual(2)
    expect(anomalies).toHaveLength(4)
  })
})

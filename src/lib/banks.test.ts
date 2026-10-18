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

/** T1：题库解析产物与文件头声明的对照基准。 */
const EXPECTED = {
  java: {
    declaredCount: 219,
    validCount: 218,
    anomalyCount: 1,
    chapters: 1,
    types: { single: 192, multi: 12, judge: 15 },
  },
  web: {
    declaredCount: 120,
    validCount: 118,
    anomalyCount: 2,
    chapters: 6,
    types: { single: 65, multi: 13, judge: 42 },
  },
} as const

describe('T1 题库数据质量', () => {
  it('题量与题型与文件头声明一致，且无声明不一致异常', () => {
    for (const bank of banks) {
      const expected = EXPECTED[bank.id as keyof typeof EXPECTED]
      expect(bank.declaredCount).toBe(expected.declaredCount)
      expect(bank.parsedCount).toBe(expected.declaredCount)
      expect(bank.validCount).toBe(expected.validCount)
      expect(bank.anomalyCount).toBe(expected.anomalyCount)
      expect(bank.chapters).toHaveLength(expected.chapters)
      expect(bank.declaredTypeCounts).toEqual(expected.types)
      expect(bank.typeCounts).toEqual({
        single: expected.types.single - expected.anomalyCount,
        multi: expected.types.multi,
        judge: expected.types.judge,
      })
    }

    const codes = anomalies.map((anomaly) => anomaly.code)
    expect(codes).not.toContain('declared-count-mismatch')
    expect(codes).not.toContain('declared-type-mismatch')
  })

  it('题目 ID 唯一且与 bankId、题号一致', () => {
    const entries = Object.entries(questions)
    expect(entries).toHaveLength(336)

    for (const [id, question] of entries) {
      expect(question.id).toBe(id)
      expect(id).toBe(`${question.bankId}:${question.number}`)
    }

    for (const bank of banks) {
      const numbers = getBankQuestions(bank.id).map((question) => question.number)
      expect(new Set(numbers).size).toBe(numbers.length)
    }
  })

  it('题干、选项与答案完整，答案都在选项内', () => {
    for (const question of Object.values(questions)) {
      expect(question.stem.trim()).not.toBe('')
      expect(question.options.length).toBeGreaterThanOrEqual(2)
      expect(question.answer.length).toBeGreaterThan(0)

      const keys = question.options.map((option) => option.key)
      expect(new Set(keys).size).toBe(keys.length)
      for (const key of keys) expect(key).toMatch(/^[A-Z]$/)
      for (const key of question.answer) expect(keys).toContain(key)
    }
  })

  it('单选/判断只有一个答案，多选至少两个且已排序去重', () => {
    for (const question of Object.values(questions)) {
      const answer = question.answer
      expect(answer).toEqual([...new Set(answer)].sort())

      if (question.type === 'multi') {
        expect(answer.length).toBeGreaterThanOrEqual(2)
      } else {
        expect(answer).toHaveLength(1)
      }
    }
  })

  it('判断题均为两个选项，含代码块的题目保留围栏', () => {
    const judges = Object.values(questions).filter(
      (question) => question.type === 'judge',
    )
    expect(judges).toHaveLength(57)
    for (const question of judges) expect(question.options).toHaveLength(2)

    const withCode = Object.values(questions).filter(
      (question) =>
        question.stem.includes('```') || question.explanation.includes('```'),
    )
    expect(withCode.length).toBeGreaterThanOrEqual(30)
    for (const question of withCode) {
      const fences = (
        question.stem + question.explanation
      ).match(/```/g)
      expect(fences?.length ?? 0).toBeGreaterThanOrEqual(2)
    }
  })

  it('异常题不进入有效题集合，也不会进入练习快照', () => {
    const anomalyQuestionIds = [
      ...new Set(
        anomalies
          .map((anomaly) => anomaly.questionId)
          .filter((id): id is string => Boolean(id)),
      ),
    ]
    expect(anomalyQuestionIds.sort()).toEqual(['java:71', 'web:31', 'web:80'])

    for (const id of anomalyQuestionIds) {
      expect(questions[id]).toBeUndefined()
      for (const bank of banks) {
        expect(getBankQuestions(bank.id).some((question) => question.id === id)).toBe(
          false,
        )
      }
    }
  })
})

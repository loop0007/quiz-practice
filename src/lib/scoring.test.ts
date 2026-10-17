import { describe, expect, it } from 'vitest'
import type { PracticeSession, Question, QuestionType } from '../types'
import {
  getQuestionStatus,
  getSessionStats,
  isAnswerCorrect,
  normalizeSelected,
  submitAnswer,
} from './scoring'

function makeQuestion(
  type: QuestionType,
  answer: string[],
  id = `${type}:1`,
): Question {
  return {
    id,
    bankId: 'test',
    chapterId: 'test:1',
    number: 1,
    type,
    stem: '题干',
    options: ['A', 'B', 'C', 'D'].map((key) => ({ key, text: `选项 ${key}` })),
    answer,
    explanation: '解析',
  }
}

function makeSession(questionIds: string[]): PracticeSession {
  return {
    id: 'session-1',
    bankId: 'test',
    startedAt: 1000,
    finishedAt: null,
    questionIds,
    answers: {},
    currentIndex: 0,
  }
}

describe('isAnswerCorrect', () => {
  it('单选：答案一致正确，不一致错误', () => {
    const question = makeQuestion('single', ['B'])
    expect(isAnswerCorrect(question, ['B'])).toBe(true)
    expect(isAnswerCorrect(question, ['A'])).toBe(false)
  })

  it('判断：只接受与答案一致的单个选项', () => {
    const question = makeQuestion('judge', ['A'])
    expect(isAnswerCorrect(question, ['A'])).toBe(true)
    expect(isAnswerCorrect(question, ['B'])).toBe(false)
    expect(isAnswerCorrect(question, ['A', 'B'])).toBe(false)
  })

  it('多选：集合相等即正确，顺序无关', () => {
    const question = makeQuestion('multi', ['A', 'C', 'D'])
    expect(isAnswerCorrect(question, ['A', 'C', 'D'])).toBe(true)
    expect(isAnswerCorrect(question, ['D', 'A', 'C'])).toBe(true)
  })

  it('多选：少选、多选、错选均错误', () => {
    const question = makeQuestion('multi', ['A', 'C'])
    expect(isAnswerCorrect(question, ['A'])).toBe(false)
    expect(isAnswerCorrect(question, ['A', 'B', 'C'])).toBe(false)
    expect(isAnswerCorrect(question, ['B', 'C'])).toBe(false)
    expect(isAnswerCorrect(question, [])).toBe(false)
  })

  it('忽略大小写、空格与重复选项', () => {
    const question = makeQuestion('multi', ['A', 'B'])
    expect(isAnswerCorrect(question, [' b', 'a ', 'A'])).toBe(true)
  })

  it('答案为空时判错', () => {
    expect(isAnswerCorrect(makeQuestion('single', []), [])).toBe(false)
  })
})

describe('normalizeSelected', () => {
  it('转大写、去空、去重、排序', () => {
    expect(normalizeSelected([' c', 'a', '', 'C', 'B '])).toEqual(['A', 'B', 'C'])
  })

  it('不修改入参数组', () => {
    const input = ['b', 'a']
    normalizeSelected(input)
    expect(input).toEqual(['b', 'a'])
  })
})

describe('submitAnswer', () => {
  it('首次提交写入记录并判分', () => {
    const question = makeQuestion('single', ['B'], 'test:1')
    const session = makeSession(['test:1'])

    const result = submitAnswer(session, question, ['B'], 2000)

    expect(result.applied).toBe(true)
    expect(result.record).toEqual({
      questionId: 'test:1',
      selected: ['B'],
      correct: true,
      answeredAt: 2000,
    })
    expect(result.session.answers['test:1']).toEqual(result.record)
    expect(session.answers).toEqual({})
  })

  it('重复提交直接返回旧记录，成绩与 session 不变', () => {
    const question = makeQuestion('single', ['B'], 'test:1')
    const first = submitAnswer(makeSession(['test:1']), question, ['A'], 2000)

    const second = submitAnswer(first.session, question, ['B'], 3000)

    expect(second.applied).toBe(false)
    expect(second.session).toBe(first.session)
    expect(second.record).toBe(first.record)
    expect(second.record.correct).toBe(false)
    expect(second.record.answeredAt).toBe(2000)
  })

  it('题目不在本次快照中时报错', () => {
    const question = makeQuestion('single', ['A'], 'test:9')
    expect(() => submitAnswer(makeSession(['test:1']), question, ['A'])).toThrow(
      '不在本次练习中',
    )
  })
})

describe('getSessionStats', () => {
  it('统计已答、答对、答错、未答与正确率', () => {
    const session = makeSession(['q1', 'q2', 'q3', 'q4'])
    session.answers = {
      q1: { questionId: 'q1', selected: ['A'], correct: true, answeredAt: 1 },
      q2: { questionId: 'q2', selected: ['B'], correct: false, answeredAt: 2 },
      q3: { questionId: 'q3', selected: ['C'], correct: true, answeredAt: 3 },
    }

    const stats = getSessionStats(session)

    expect(stats.total).toBe(4)
    expect(stats.answered).toBe(3)
    expect(stats.correct).toBe(2)
    expect(stats.wrong).toBe(1)
    expect(stats.unanswered).toBe(1)
    expect(stats.accuracy).toBeCloseTo(2 / 4)
    expect(stats.wrongQuestionIds).toEqual(['q2'])
    expect(stats.unansweredQuestionIds).toEqual(['q4'])
  })

  it('未作答计入错误，拉低正确率', () => {
    const session = makeSession(['q1', 'q2'])
    session.answers = {
      q1: { questionId: 'q1', selected: ['A'], correct: true, answeredAt: 1 },
    }

    expect(getSessionStats(session).accuracy).toBe(0.5)
  })

  it('只统计快照内题目，忽略快照外的陈旧记录', () => {
    const session = makeSession(['q1'])
    session.answers = {
      old: { questionId: 'old', selected: ['A'], correct: true, answeredAt: 1 },
    }

    const stats = getSessionStats(session)
    expect(stats.total).toBe(1)
    expect(stats.answered).toBe(0)
    expect(stats.correct).toBe(0)
    expect(stats.unansweredQuestionIds).toEqual(['q1'])
  })

  it('空会话正确率为 0，不产生 NaN', () => {
    const stats = getSessionStats(makeSession([]))
    expect(stats.accuracy).toBe(0)
    expect(stats.total).toBe(0)
  })
})

describe('getQuestionStatus', () => {
  it('区分未答、正确、错误', () => {
    const session = makeSession(['q1', 'q2', 'q3'])
    session.answers = {
      q1: { questionId: 'q1', selected: ['A'], correct: true, answeredAt: 1 },
      q2: { questionId: 'q2', selected: ['B'], correct: false, answeredAt: 2 },
    }

    expect(getQuestionStatus(session, 'q1')).toBe('correct')
    expect(getQuestionStatus(session, 'q2')).toBe('wrong')
    expect(getQuestionStatus(session, 'q3')).toBe('unanswered')
  })
})

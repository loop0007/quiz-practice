import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { getBankQuestions, getQuestion } from '../lib/banks'
import { createSession, db, getSession, listWrong } from '../lib/db'
import { usePracticeStore } from './usePracticeStore'

function state() {
  return usePracticeStore.getState()
}

beforeEach(async () => {
  await db.delete()
  await db.open()
  usePracticeStore.getState().reset()
})

describe('练习会话加载', () => {
  it('按快照顺序加载题目，清空 loading', async () => {
    const session = await createSession({
      bankId: 'java',
      questionIds: ['java:1', 'java:2'],
    })

    await state().loadSession(session.id)

    expect(state().session?.id).toBe(session.id)
    expect(state().questions.map((question) => question.id)).toEqual([
      'java:1',
      'java:2',
    ])
    expect(state().loadingId).toBeNull()
    expect(state().error).toBeNull()
  })

  it('会话不存在时给出错误', async () => {
    await state().loadSession('missing-session')

    expect(state().session).toBeNull()
    expect(state().loadingId).toBeNull()
    expect(state().error).toContain('练习记录不存在')
  })
})

describe('选择答案', () => {
  it('单选重复点击只保留最后一项', async () => {
    const session = await createSession({ bankId: 'java', questionIds: ['java:1'] })
    await state().loadSession(session.id)

    state().select('java:1', 'A', false)
    state().select('java:1', 'B', false)

    expect(state().drafts['java:1']).toEqual(['B'])
  })

  it('多选点击切换选中状态', async () => {
    const multi = getBankQuestions('java').find((question) => question.type === 'multi')
    expect(multi).toBeDefined()

    const session = await createSession({ bankId: 'java', questionIds: [multi!.id] })
    await state().loadSession(session.id)

    state().select(multi!.id, 'A', true)
    state().select(multi!.id, 'C', true)
    state().select(multi!.id, 'A', true)

    expect(state().drafts[multi!.id]).toEqual(['C'])
  })

  it('已提交的题不允许再修改选择', async () => {
    const question = getQuestion('java:1')!
    const session = await createSession({ bankId: 'java', questionIds: [question.id] })
    await state().loadSession(session.id)

    state().select(question.id, question.answer[0], question.type === 'multi')
    await state().submitCurrent()
    const before = state().drafts[question.id]

    state().select(question.id, 'Z', question.type === 'multi')

    expect(state().drafts[question.id]).toEqual(before)
  })
})

describe('提交答案', () => {
  it('答对写入 session，不写错题本', async () => {
    const question = getQuestion('java:1')!
    const session = await createSession({ bankId: 'java', questionIds: [question.id] })
    await state().loadSession(session.id)

    for (const key of question.answer) {
      state().select(question.id, key, question.type === 'multi')
    }
    await state().submitCurrent()

    const record = state().session?.answers[question.id]
    expect(record?.correct).toBe(true)
    expect(record?.selected).toEqual([...question.answer].sort())
    expect(await listWrong()).toHaveLength(0)

    const saved = await getSession(session.id)
    expect(saved?.answers[question.id]?.correct).toBe(true)
  })

  it('答错写入错题本；重复提交不重复累计', async () => {
    const question = getQuestion('java:1')!
    const wrongOption = question.options.find(
      (option) => !question.answer.includes(option.key),
    )
    expect(wrongOption).toBeDefined()

    const session = await createSession({ bankId: 'java', questionIds: [question.id] })
    await state().loadSession(session.id)

    state().select(question.id, wrongOption!.key, question.type === 'multi')
    await state().submitCurrent()

    const record = state().session!.answers[question.id]
    expect(record.correct).toBe(false)

    let wrongList = await listWrong()
    expect(wrongList).toHaveLength(1)
    expect(wrongList[0].wrongCount).toBe(1)

    const answeredAt = record.answeredAt
    await state().submitCurrent()
    await state().submitCurrent()

    wrongList = await listWrong()
    expect(wrongList[0].wrongCount).toBe(1)
    expect(state().session!.answers[question.id].answeredAt).toBe(answeredAt)
  })

  it('未选择时提交无效果', async () => {
    const session = await createSession({ bankId: 'java', questionIds: ['java:1'] })
    await state().loadSession(session.id)

    await state().submitCurrent()

    expect(state().session?.answers).toEqual({})
  })
})

describe('翻题与交卷', () => {
  it('翻题更新 currentIndex 并持久化，越界时收敛', async () => {
    const session = await createSession({
      bankId: 'java',
      questionIds: ['java:1', 'java:2', 'java:3'],
    })
    await state().loadSession(session.id)

    await state().goTo(99)
    expect(state().session?.currentIndex).toBe(2)
    expect((await getSession(session.id))?.currentIndex).toBe(2)

    await state().goTo(-5)
    expect(state().session?.currentIndex).toBe(0)
  })

  it('交卷写入 finishedAt，重复交卷不改变时间', async () => {
    const session = await createSession({ bankId: 'java', questionIds: ['java:1'] })
    await state().loadSession(session.id)

    const id = await state().finish()
    expect(id).toBe(session.id)

    const finishedAt = state().session?.finishedAt
    expect(finishedAt).toBeTypeOf('number')
    expect((await getSession(session.id))?.finishedAt).toBe(finishedAt)

    await state().finish()
    expect(state().session?.finishedAt).toBe(finishedAt)
  })
})

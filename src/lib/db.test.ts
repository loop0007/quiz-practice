import 'fake-indexeddb/auto'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  addFeedback,
  addWrong,
  createSession,
  db,
  deleteSession,
  findActiveSession,
  getSession,
  listFeedback,
  listFinishedSessions,
  listWrong,
  removeWrong,
  saveSession,
} from './db'
import { createSessionId } from './id'
import { getSessionStats } from './scoring'

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

beforeEach(async () => {
  await db.delete()
  await db.open()
})

afterAll(() => {
  db.close()
})

describe('会话', () => {
  it('创建后可读取，保存后可恢复', async () => {
    const session = await createSession({
      bankId: 'java',
      questionIds: ['java:1', 'java:2'],
    })

    expect(session.id).toBeTruthy()
    expect(session.finishedAt).toBeNull()
    expect(session.answers).toEqual({})
    expect(session.questionIds).toEqual(['java:1', 'java:2'])

    session.currentIndex = 1
    session.answers['java:1'] = {
      questionId: 'java:1',
      selected: ['B'],
      correct: true,
      answeredAt: Date.now(),
    }
    await saveSession(session)

    const loaded = await getSession(session.id)
    expect(loaded?.currentIndex).toBe(1)
    expect(loaded?.answers['java:1']?.correct).toBe(true)
  })

  it('每次都创建新 session，重开不复用', async () => {
    const first = await createSession({ bankId: 'web', questionIds: ['web:1'] })
    const second = await createSession({ bankId: 'web', questionIds: ['web:1'] })
    expect(first.id).not.toBe(second.id)
  })

  it('空题库快照拒绝创建', async () => {
    await expect(createSession({ bankId: 'java', questionIds: [] })).rejects.toThrow(
      '题目快照不能为空',
    )
  })

  it('findActiveSession 只返回未交卷会话，且优先最近一次', async () => {
    const older = await createSession({ bankId: 'java', questionIds: ['java:1'] })
    const newer = await createSession({ bankId: 'java', questionIds: ['java:2'] })
    older.startedAt = 1000
    newer.startedAt = 2000
    await saveSession(older)
    await saveSession(newer)

    expect((await findActiveSession('java'))?.id).toBe(newer.id)

    newer.finishedAt = Date.now()
    await saveSession(newer)
    expect((await findActiveSession('java'))?.id).toBe(older.id)

    older.finishedAt = Date.now()
    await saveSession(older)
    expect(await findActiveSession('java')).toBeUndefined()
    expect(await findActiveSession('web')).toBeUndefined()
  })

  it('历史成绩只包含已交卷会话，按交卷时间倒序', async () => {
    const older = await createSession({ bankId: 'java', questionIds: ['java:1'] })
    older.finishedAt = 1000
    await saveSession(older)

    const newer = await createSession({ bankId: 'web', questionIds: ['web:1'] })
    newer.finishedAt = 3000
    await saveSession(newer)

    const active = await createSession({ bankId: 'java', questionIds: ['java:2'] })

    const history = await listFinishedSessions()
    expect(history.map((session) => session.id)).toEqual([newer.id, older.id])
    expect(history.some((session) => session.id === active.id)).toBe(false)
    expect(history.every((session) => session.finishedAt != null)).toBe(true)
  })

  it('删除会话后不再返回', async () => {
    const session = await createSession({ bankId: 'java', questionIds: ['java:1'] })
    await deleteSession(session.id)
    expect(await getSession(session.id)).toBeUndefined()
  })

  it('关闭并重新打开数据库后数据仍在', async () => {
    const session = await createSession({ bankId: 'java', questionIds: ['java:1'] })

    db.close()
    await db.open()

    expect(await getSession(session.id)).toBeDefined()
  })
})

describe('错题本', () => {
  it('首次答错写入，重复答错保留首次时间并累计次数', async () => {
    await addWrong({ questionId: 'java:1', bankId: 'java', selected: ['A'] })
    const first = await db.wrongBook.get('java:1')
    expect(first?.firstWrongAt).toBeTypeOf('number')
    expect(first?.wrongCount).toBe(1)
    expect(first?.selected).toEqual(['A'])

    await wait(5)
    await addWrong({ questionId: 'java:1', bankId: 'java', selected: ['C'] })
    const second = await db.wrongBook.get('java:1')

    expect(second?.firstWrongAt).toBe(first?.firstWrongAt)
    expect(second?.wrongCount).toBe(2)
    expect(second?.selected).toEqual(['C'])
    expect(second!.lastWrongAt).toBeGreaterThan(first!.lastWrongAt)
  })

  it('按首次答错时间倒序返回，并可移除', async () => {
    await addWrong({ questionId: 'java:1', bankId: 'java', selected: ['A'] })
    await wait(5)
    await addWrong({ questionId: 'web:2', bankId: 'web', selected: ['B'] })

    const list = await listWrong()
    expect(list.map((entry) => entry.questionId)).toEqual(['web:2', 'java:1'])

    await removeWrong('java:1')
    expect((await listWrong()).map((entry) => entry.questionId)).toEqual(['web:2'])
  })
})

describe('反馈', () => {
  it('写入后可按时间倒序读取', async () => {
    const id = await addFeedback({
      questionId: 'java:1',
      bankId: 'java',
      type: 'wrong-answer',
      note: '答案应为 C',
    })
    expect(id).toBeTypeOf('number')

    const list = await listFeedback()
    expect(list).toHaveLength(1)
    expect(list[0]).toMatchObject({
      questionId: 'java:1',
      bankId: 'java',
      type: 'wrong-answer',
      note: '答案应为 C',
    })
    expect(list[0].createdAt).toBeTypeOf('number')
  })

  it('支持不带题目的通用反馈', async () => {
    await addFeedback({
      type: 'suggestion',
      note: '希望增加错题组卷练习',
    })

    const list = await listFeedback()
    expect(list).toHaveLength(1)
    expect(list[0]).toMatchObject({
      type: 'suggestion',
      note: '希望增加错题组卷练习',
    })
    expect(list[0].questionId).toBeUndefined()
    expect(list[0].bankId).toBeUndefined()
  })
})

describe('T2 本次错题与错题本累计', () => {
  it('新会话答对不会清除旧错题，两种统计口径互不影响', async () => {
    const first = await createSession({ bankId: 'java', questionIds: ['java:1'] })
    first.answers['java:1'] = {
      questionId: 'java:1',
      selected: ['A'],
      correct: false,
      answeredAt: 1,
    }
    await saveSession(first)
    await addWrong({ questionId: 'java:1', bankId: 'java', selected: ['A'] })

    const second = await createSession({ bankId: 'java', questionIds: ['java:1'] })
    second.answers['java:1'] = {
      questionId: 'java:1',
      selected: ['B'],
      correct: true,
      answeredAt: 2,
    }
    await saveSession(second)

    expect(getSessionStats(first).wrong).toBe(1)
    expect(getSessionStats(second).wrong).toBe(0)
    expect(getSessionStats(second).correct).toBe(1)

    const wrongBook = await listWrong()
    expect(wrongBook).toHaveLength(1)
    expect(wrongBook[0].questionId).toBe('java:1')
  })
})

describe('ID 生成', () => {
  it('生成唯一 ID', () => {
    const ids = new Set(
      Array.from({ length: 100 }, () => createSessionId()),
    )
    expect(ids.size).toBe(100)
  })

  it('安全上下文不可用 randomUUID 时回退', () => {
    vi.stubGlobal('crypto', {
      getRandomValues(bytes: Uint8Array) {
        for (let i = 0; i < bytes.length; i += 1) bytes[i] = i
        return bytes
      },
    })

    const id = createSessionId()
    expect(id).toMatch(/^[a-z0-9]+-[0-9a-f]{24}$/)

    vi.unstubAllGlobals()
  })
})

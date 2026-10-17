/**
 * 本地持久化层（M2 冻结）。
 * 页面与组件不得直接访问 Dexie 表，统一通过本文件导出的 API。
 */
import Dexie, { type Table } from 'dexie'
import type { Feedback, FeedbackType, PracticeSession, WrongEntry } from '../types'
import { createSessionId } from './id'

export const DB_NAME = 'quiz-practice'

class AppDatabase extends Dexie {
  sessions!: Table<PracticeSession, string>
  wrongBook!: Table<WrongEntry, string>
  feedback!: Table<Feedback, number>

  constructor(name = DB_NAME) {
    super(name)
    this.version(1).stores({
      sessions: 'id, bankId, startedAt, finishedAt',
      wrongBook: 'questionId, bankId, firstWrongAt',
      feedback: '++id, questionId, createdAt',
    })
  }
}

export const db = new AppDatabase()

export interface CreateSessionInput {
  bankId: string
  questionIds: string[]
}

export interface AddWrongInput {
  questionId: string
  bankId: string
  selected: string[]
}

export interface AddFeedbackInput {
  /** 主页通用反馈可省略题目与题库。 */
  questionId?: string
  bankId?: string
  type: FeedbackType
  note: string
}

/** 每次开始练习都新建 session；重开练习不会复用旧 session。 */
export async function createSession(input: CreateSessionInput): Promise<PracticeSession> {
  if (!input.bankId) throw new Error('createSession: bankId 不能为空')
  if (input.questionIds.length === 0) throw new Error('createSession: 题目快照不能为空')

  const session: PracticeSession = {
    id: createSessionId(),
    bankId: input.bankId,
    startedAt: Date.now(),
    finishedAt: null,
    questionIds: [...input.questionIds],
    answers: {},
    currentIndex: 0,
  }

  await db.sessions.add(session)
  return session
}

export async function getSession(id: string): Promise<PracticeSession | undefined> {
  return db.sessions.get(id)
}

/** 整体保存；调用方负责只提交一次答案等业务规则。 */
export async function saveSession(session: PracticeSession): Promise<void> {
  await db.sessions.put(session)
}

/** 返回该题库最近一次未交卷的会话。 */
export async function findActiveSession(
  bankId: string,
): Promise<PracticeSession | undefined> {
  const sessions = await db.sessions.where('bankId').equals(bankId).toArray()
  return sessions
    .filter((session) => session.finishedAt == null)
    .sort((a, b) => b.startedAt - a.startedAt)[0]
}

export async function deleteSession(id: string): Promise<void> {
  await db.sessions.delete(id)
}

/**
 * 写入错题本。
 * 同一题重复答错时保留首次时间，只更新最近答案、最近时间和次数。
 */
export async function addWrong(input: AddWrongInput): Promise<void> {
  const now = Date.now()

  await db.transaction('rw', db.wrongBook, async () => {
    const existing = await db.wrongBook.get(input.questionId)

    if (existing) {
      await db.wrongBook.put({
        ...existing,
        selected: [...input.selected],
        lastWrongAt: now,
        wrongCount: existing.wrongCount + 1,
      })
      return
    }

    await db.wrongBook.add({
      questionId: input.questionId,
      bankId: input.bankId,
      selected: [...input.selected],
      firstWrongAt: now,
      lastWrongAt: now,
      wrongCount: 1,
    })
  })
}

/** 按首次答错时间倒序返回全部错题。 */
export async function listWrong(): Promise<WrongEntry[]> {
  return db.wrongBook.orderBy('firstWrongAt').reverse().toArray()
}

export async function removeWrong(questionId: string): Promise<void> {
  await db.wrongBook.delete(questionId)
}

export async function addFeedback(input: AddFeedbackInput): Promise<number> {
  const entry: Feedback = {
    type: input.type,
    note: input.note,
    createdAt: Date.now(),
  }
  if (input.questionId) entry.questionId = input.questionId
  if (input.bankId) entry.bankId = input.bankId

  return db.feedback.add(entry)
}

export async function listFeedback(): Promise<Feedback[]> {
  return db.feedback.orderBy('createdAt').reverse().toArray()
}

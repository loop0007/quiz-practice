import { describe, expect, it } from 'vitest'
import { resolvePracticeShortcut } from './shortcuts'

const base = {
  optionKeys: ['A', 'B', 'C', 'D'],
  locked: false,
  canSubmit: false,
}

describe('答题页快捷键', () => {
  it('字母不区分大小写地选择选项', () => {
    expect(resolvePracticeShortcut({ ...base, key: 'b' })).toEqual({
      type: 'select',
      key: 'B',
    })
    expect(resolvePracticeShortcut({ ...base, key: 'D' })).toEqual({
      type: 'select',
      key: 'D',
    })
  })

  it('数字按选项顺序映射，超出范围不处理', () => {
    expect(resolvePracticeShortcut({ ...base, key: '1' })).toEqual({
      type: 'select',
      key: 'A',
    })
    expect(resolvePracticeShortcut({ ...base, key: '4' })).toEqual({
      type: 'select',
      key: 'D',
    })
    expect(resolvePracticeShortcut({ ...base, key: '5' })).toBeNull()
  })

  it('Enter 仅在可提交时生效', () => {
    expect(resolvePracticeShortcut({ ...base, key: 'Enter' })).toBeNull()
    expect(
      resolvePracticeShortcut({ ...base, key: 'Enter', canSubmit: true }),
    ).toEqual({ type: 'submit' })
  })

  it('左右方向键翻题，提交后仍可用', () => {
    expect(resolvePracticeShortcut({ ...base, key: 'ArrowLeft' })).toEqual({
      type: 'prev',
    })
    expect(resolvePracticeShortcut({ ...base, key: 'ArrowRight' })).toEqual({
      type: 'next',
    })
    expect(
      resolvePracticeShortcut({
        ...base,
        key: 'ArrowRight',
        locked: true,
      }),
    ).toEqual({ type: 'next' })
  })

  it('已提交后忽略选择与提交按键', () => {
    expect(resolvePracticeShortcut({ ...base, key: 'a', locked: true })).toBeNull()
    expect(
      resolvePracticeShortcut({
        ...base,
        key: 'Enter',
        locked: true,
        canSubmit: true,
      }),
    ).toBeNull()
  })

  it('无关按键不产生动作', () => {
    expect(resolvePracticeShortcut({ ...base, key: 'Escape' })).toBeNull()
    expect(resolvePracticeShortcut({ ...base, key: 'Shift' })).toBeNull()
    expect(resolvePracticeShortcut({ ...base, key: 'z' })).toBeNull()
  })
})

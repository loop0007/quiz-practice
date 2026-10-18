/**
 * E6 答题页键盘快捷键：只做按键到动作的纯解析，DOM 事件与守卫由页面负责。
 * 字母按选项 key 匹配（不区分大小写），数字 1–9 按选项顺序映射。
 */
export type PracticeShortcut =
  | { type: 'select'; key: string }
  | { type: 'submit' }
  | { type: 'prev' }
  | { type: 'next' }

export interface ShortcutInput {
  key: string
  optionKeys: string[]
  /** 当前题已提交，选项锁定。 */
  locked: boolean
  /** 当前题有草稿选择且未提交。 */
  canSubmit: boolean
}

export function resolvePracticeShortcut(
  input: ShortcutInput,
): PracticeShortcut | null {
  const { key, optionKeys, locked, canSubmit } = input

  if (key === 'ArrowLeft') return { type: 'prev' }
  if (key === 'ArrowRight') return { type: 'next' }
  if (key === 'Enter') {
    return !locked && canSubmit ? { type: 'submit' } : null
  }
  if (locked) return null

  if (key.length === 1) {
    const letter = key.toUpperCase()
    if (optionKeys.includes(letter)) return { type: 'select', key: letter }
  }

  if (/^[1-9]$/.test(key)) {
    const optionKey = optionKeys[Number(key) - 1]
    if (optionKey) return { type: 'select', key: optionKey }
  }

  return null
}

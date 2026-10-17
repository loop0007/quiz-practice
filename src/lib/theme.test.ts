import { describe, expect, it } from 'vitest'
import {
  nextThemeMode,
  parseThemeMode,
  resolveTheme,
  themeModeLabel,
} from './theme'

describe('主题模式', () => {
  it('未设置或非法值回退为跟随系统', () => {
    expect(parseThemeMode(null)).toBe('system')
    expect(parseThemeMode('')).toBe('system')
    expect(parseThemeMode('sepia')).toBe('system')
  })

  it('识别浅色、深色与跟随系统', () => {
    expect(parseThemeMode('light')).toBe('light')
    expect(parseThemeMode('dark')).toBe('dark')
    expect(parseThemeMode('system')).toBe('system')
  })

  it('跟随系统时按系统偏好解析', () => {
    expect(resolveTheme('system', true)).toBe('dark')
    expect(resolveTheme('system', false)).toBe('light')
  })

  it('手动模式忽略系统偏好', () => {
    expect(resolveTheme('light', true)).toBe('light')
    expect(resolveTheme('dark', false)).toBe('dark')
  })

  it('手动切换按 system → light → dark 循环', () => {
    expect(nextThemeMode('system')).toBe('light')
    expect(nextThemeMode('light')).toBe('dark')
    expect(nextThemeMode('dark')).toBe('system')
  })

  it('提供可读的模式名称', () => {
    expect(themeModeLabel('system')).toBe('跟随系统')
    expect(themeModeLabel('light')).toBe('浅色')
    expect(themeModeLabel('dark')).toBe('深色')
  })
})

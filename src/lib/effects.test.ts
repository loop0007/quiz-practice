import { describe, expect, it } from 'vitest'
import { EFFECT_PRESETS, parseEffectId } from './effects'

describe('动态特效选择', () => {
  it('识别四种特效，非法值回退为关闭', () => {
    expect(parseEffectId('none')).toBe('none')
    expect(parseEffectId('sakura')).toBe('sakura')
    expect(parseEffectId('lines')).toBe('lines')
    expect(parseEffectId('particles')).toBe('particles')
    expect(parseEffectId(null)).toBe('none')
    expect(parseEffectId('')).toBe('none')
    expect(parseEffectId('snow')).toBe('none')
  })

  it('预设顺序固定为关闭、樱花、线条、粒子', () => {
    expect(EFFECT_PRESETS.map((preset) => preset.id)).toEqual([
      'none',
      'sakura',
      'lines',
      'particles',
    ])
  })
})

/**
 * 动态背景特效：只保存一个枚举值，动画由 BackgroundEffects 按需启动。
 * 默认关闭；与壁纸相互独立，可叠加在任意壁纸之上。
 */
export type EffectId = 'none' | 'sakura' | 'lines' | 'particles'

export interface EffectPreset {
  id: EffectId
  label: string
  description: string
}

export const EFFECT_STORAGE_KEY = 'effect'

export const EFFECT_PRESETS: EffectPreset[] = [
  { id: 'none', label: '关闭特效', description: '不显示动态背景' },
  { id: 'sakura', label: '樱花飘落', description: '花瓣随机飘落与旋转' },
  { id: 'lines', label: '动态线条', description: '漂浮节点与连线，随鼠标变化' },
  { id: 'particles', label: '粒子动画', description: '粒子漂浮、连线与鼠标吸引' },
]

const EFFECT_IDS = new Set<string>(EFFECT_PRESETS.map((preset) => preset.id))

/** 未设置或非法值回退为关闭，避免旧数据把页面卡在未知特效上。 */
export function parseEffectId(raw: string | null | undefined): EffectId {
  if (typeof raw !== 'string') return 'none'
  return EFFECT_IDS.has(raw) ? (raw as EffectId) : 'none'
}

export function readStoredEffect(): EffectId {
  if (typeof window === 'undefined') return 'none'
  try {
    return parseEffectId(window.localStorage.getItem(EFFECT_STORAGE_KEY))
  } catch {
    return 'none'
  }
}

export function saveStoredEffect(id: EffectId): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(EFFECT_STORAGE_KEY, id)
  } catch {
    // 隐私模式下仍允许本次会话生效。
  }
}

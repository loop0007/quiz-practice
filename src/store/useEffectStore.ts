import { create } from 'zustand'
import {
  readStoredEffect,
  saveStoredEffect,
  type EffectId,
} from '@/lib/effects'

interface EffectState {
  effect: EffectId
  setEffect: (effect: EffectId) => void
}

/** 外观弹窗切换后，全局布局层立即重绘特效，刷新后从 localStorage 恢复。 */
export const useEffectStore = create<EffectState>((set) => ({
  effect: readStoredEffect(),
  setEffect(effect) {
    saveStoredEffect(effect)
    set({ effect })
  },
}))

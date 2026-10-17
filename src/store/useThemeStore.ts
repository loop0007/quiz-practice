import { create } from 'zustand'
import {
  applyTheme,
  nextThemeMode,
  readStoredTheme,
  type ResolvedTheme,
  type ThemeMode,
} from '@/lib/theme'

interface ThemeState {
  mode: ThemeMode
  resolved: ResolvedTheme
  setMode: (mode: ThemeMode) => void
  cycle: () => ThemeMode
  syncSystem: () => void
}

/** 首屏内联脚本已把 .dark 写到 html 上，这里直接读取，避免再次闪烁。 */
function initialResolved(): ResolvedTheme {
  if (typeof document === 'undefined') return 'light'
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: readStoredTheme(),
  resolved: initialResolved(),
  setMode(mode) {
    set({ mode, resolved: applyTheme(mode) })
  },
  cycle() {
    const next = nextThemeMode(get().mode)
    get().setMode(next)
    return next
  },
  syncSystem() {
    if (get().mode === 'system') {
      set({ resolved: applyTheme('system') })
    }
  },
}))

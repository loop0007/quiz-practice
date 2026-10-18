export type ThemeMode = 'system' | 'light' | 'dark'
export type ResolvedTheme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'theme'

const THEME_COLORS: Record<ResolvedTheme, string> = {
  light: '#f3ede1',
  dark: '#14110d',
}

/** 未设置、旧值或非法值统一回退为跟随系统。 */
export function parseThemeMode(raw: string | null | undefined): ThemeMode {
  return raw === 'light' || raw === 'dark' || raw === 'system' ? raw : 'system'
}

export function resolveTheme(
  mode: ThemeMode,
  systemPrefersDark: boolean,
): ResolvedTheme {
  if (mode === 'system') return systemPrefersDark ? 'dark' : 'light'
  return mode
}

/** 切换顺序：跟随系统 → 浅色 → 深色 → 跟随系统。 */
export function nextThemeMode(mode: ThemeMode): ThemeMode {
  if (mode === 'system') return 'light'
  if (mode === 'light') return 'dark'
  return 'system'
}

export function themeModeLabel(mode: ThemeMode): string {
  if (mode === 'system') return '跟随系统'
  return mode === 'light' ? '浅色' : '深色'
}

function systemPrefersDark(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function readStoredTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'system'
  try {
    return parseThemeMode(window.localStorage.getItem(THEME_STORAGE_KEY))
  } catch {
    return 'system'
  }
}

/**
 * 把模式写入 DOM 与 localStorage，返回实际生效的浅色/深色。
 * 首屏由 index.html 的内联脚本先行应用，避免深色用户看到白屏闪烁。
 */
export function applyTheme(mode: ThemeMode): ResolvedTheme {
  const resolved = resolveTheme(mode, systemPrefersDark())

  if (typeof document === 'undefined') return resolved

  const root = document.documentElement
  root.classList.toggle('dark', resolved === 'dark')
  root.style.setProperty('color-scheme', resolved)

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, mode)
  } catch {
    // 隐私模式或存储被禁用时仍允许本次会话切换。
  }

  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', THEME_COLORS[resolved])

  return resolved
}

/** 订阅系统外观变化；调用方只在“跟随系统”模式下重新应用。 */
export function subscribeSystemTheme(listener: () => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return () => {}
  }

  const query = window.matchMedia('(prefers-color-scheme: dark)')
  query.addEventListener('change', listener)
  return () => query.removeEventListener('change', listener)
}

import { useEffect, useState } from 'react'
import { Monitor, Moon, Sun } from 'lucide-react'
import {
  nextThemeMode,
  parseThemeMode,
  subscribeSystemTheme,
  THEME_STORAGE_KEY,
  themeModeLabel,
  type ThemeMode,
} from '@/lib/theme'
import { useThemeStore } from '@/store/useThemeStore'

const ICONS = {
  system: Monitor,
  light: Sun,
  dark: Moon,
} as const

export default function ThemeToggle() {
  const mode = useThemeStore((state) => state.mode)
  const resolved = useThemeStore((state) => state.resolved)
  const cycle = useThemeStore((state) => state.cycle)
  const setMode = useThemeStore((state) => state.setMode)
  const [announcement, setAnnouncement] = useState('')

  useEffect(() => {
    const unsubscribe = subscribeSystemTheme(() => {
      useThemeStore.getState().syncSystem()
    })

    function handleStorage(event: StorageEvent) {
      if (event.key === THEME_STORAGE_KEY) {
        setMode(parseThemeMode(event.newValue))
      }
    }

    window.addEventListener('storage', handleStorage)
    return () => {
      unsubscribe()
      window.removeEventListener('storage', handleStorage)
    }
  }, [setMode])

  const label = themeModeLabel(mode)
  const Icon = ICONS[mode]
  const next = themeModeLabel(nextThemeMode(mode))

  return (
    <>
      <button
        type="button"
        onClick={() => {
          const nextMode: ThemeMode = cycle()
          setAnnouncement(`主题已切换为${themeModeLabel(nextMode)}`)
        }}
        aria-label={`主题：${label}，当前显示${resolved === 'dark' ? '深色' : '浅色'}；点击切换为${next}`}
        title={`主题：${label}（点击切换为${next}）`}
        className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-lg px-2 text-slate-600 hover:bg-slate-100 hover:text-blue-600 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-blue-400"
      >
        <Icon className="size-5" aria-hidden="true" />
        <span className="hidden text-xs font-medium sm:inline">{label}</span>
      </button>
      <span className="sr-only" aria-live="polite">
        {announcement}
      </span>
    </>
  )
}

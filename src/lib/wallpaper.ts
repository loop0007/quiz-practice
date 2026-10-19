/**
 * E5 壁纸：只把 CSS 变量与 has-wallpaper 类写到根元素，不改动页面结构。
 * 选择存 localStorage；自定义图片由 db 层存 IndexedDB，避免占用 localStorage 配额。
 */
import skyWallpaper from '@/assets/wallpaper-sky.jpg?url'

export type WallpaperId = 'none' | 'aurora' | 'dusk' | 'meadow' | 'sky' | 'custom'

export interface WallpaperPreset {
  id: Exclude<WallpaperId, 'none' | 'custom'>
  label: string
  css: string
}

export const WALLPAPER_STORAGE_KEY = 'wallpaper'
export const MAX_WALLPAPER_BYTES = 5 * 1024 * 1024

export const WALLPAPER_PRESETS: WallpaperPreset[] = [
  {
    id: 'sky',
    label: '云霞',
    css: `url("${skyWallpaper}")`,
  },
  {
    id: 'aurora',
    label: '晨曦',
    css: 'linear-gradient(135deg, #bfdbfe 0%, #ddd6fe 45%, #fbcfe8 100%)',
  },
  {
    id: 'dusk',
    label: '暮色',
    css: 'linear-gradient(135deg, #334155 0%, #1e3a8a 50%, #4c1d95 100%)',
  },
  {
    id: 'meadow',
    label: '青野',
    css: 'linear-gradient(135deg, #bbf7d0 0%, #a7f3d0 45%, #bfdbfe 100%)',
  },
]

const PRESET_IDS = new Set<string>(WALLPAPER_PRESETS.map((preset) => preset.id))

/** 未设置或非法值回退为无壁纸。 */
export function parseWallpaperId(raw: string | null | undefined): WallpaperId {
  if (typeof raw !== 'string') return 'none'
  if (raw === 'custom' || PRESET_IDS.has(raw)) return raw as WallpaperId
  return 'none'
}

export function readStoredWallpaper(): WallpaperId {
  if (typeof window === 'undefined') return 'none'
  try {
    return parseWallpaperId(window.localStorage.getItem(WALLPAPER_STORAGE_KEY))
  } catch {
    return 'none'
  }
}

/** 返回可直接写入 --wallpaper-image 的 CSS 值；无壁纸或缺少自定义图片时返回 null。 */
export function wallpaperCss(
  id: WallpaperId,
  customDataUrl: string | null = null,
): string | null {
  if (id === 'none') return null
  if (id === 'custom') {
    return customDataUrl ? `url("${customDataUrl}")` : null
  }
  return WALLPAPER_PRESETS.find((preset) => preset.id === id)?.css ?? null
}

/**
 * 应用壁纸并持久化选择。自定义图片的数据由调用方读取后传入。
 * 图片缺失时按无壁纸处理，避免留下背景为空的 has-wallpaper 状态。
 */
export function applyWallpaper(
  id: WallpaperId,
  customDataUrl: string | null = null,
): void {
  const effective = id === 'custom' && !customDataUrl ? 'none' : id
  const css = wallpaperCss(effective, customDataUrl)

  try {
    window.localStorage.setItem(WALLPAPER_STORAGE_KEY, css ? effective : 'none')
  } catch {
    // 隐私模式下仍允许本次会话生效。
  }

  if (typeof document === 'undefined') return

  const root = document.documentElement
  if (css) {
    root.style.setProperty('--wallpaper-image', css)
    root.classList.add('has-wallpaper')
  } else {
    root.style.removeProperty('--wallpaper-image')
    root.classList.remove('has-wallpaper')
  }
}

/** 仅校验类型与大小，返回给用户看的错误文案；通过时返回 null。 */
export function validateWallpaperFile(file: {
  type: string
  size: number
}): string | null {
  if (!file.type.startsWith('image/')) {
    return '请选择图片文件（JPG、PNG、WebP 等）。'
  }
  if (file.size === 0) {
    return '图片文件为空，请重新选择。'
  }
  if (file.size > MAX_WALLPAPER_BYTES) {
    return '图片不能超过 5 MB，请先压缩后再上传。'
  }
  return null
}

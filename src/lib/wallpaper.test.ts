import { describe, expect, it } from 'vitest'
import {
  MAX_WALLPAPER_BYTES,
  parseWallpaperId,
  validateWallpaperFile,
  WALLPAPER_PRESETS,
  wallpaperCss,
} from './wallpaper'

describe('壁纸选择', () => {
  it('识别内置壁纸与自定义壁纸，非法值回退为无壁纸', () => {
    expect(parseWallpaperId('none')).toBe('none')
    expect(parseWallpaperId('aurora')).toBe('aurora')
    expect(parseWallpaperId('dusk')).toBe('dusk')
    expect(parseWallpaperId('meadow')).toBe('meadow')
    expect(parseWallpaperId('sky')).toBe('sky')
    expect(parseWallpaperId('custom')).toBe('custom')
    expect(parseWallpaperId(null)).toBe('none')
    expect(parseWallpaperId('')).toBe('none')
    expect(parseWallpaperId('photo.jpg')).toBe('none')
  })

  it('内置壁纸返回对应渐变，无壁纸返回 null', () => {
    for (const preset of WALLPAPER_PRESETS) {
      expect(wallpaperCss(preset.id)).toBe(preset.css)
    }
    expect(wallpaperCss('none')).toBeNull()
  })

  it('自定义壁纸使用 data URL，缺少图片时返回 null', () => {
    expect(wallpaperCss('custom', 'data:image/png;base64,AAAA')).toBe(
      'url("data:image/png;base64,AAAA")',
    )
    expect(wallpaperCss('custom')).toBeNull()
  })
})

describe('壁纸文件校验', () => {
  it('只接受非空且不超过 5 MB 的图片', () => {
    expect(validateWallpaperFile({ type: 'image/png', size: 1024 })).toBeNull()
    expect(
      validateWallpaperFile({ type: 'image/jpeg', size: MAX_WALLPAPER_BYTES }),
    ).toBeNull()
  })

  it('拒绝非图片、空文件与超大图片', () => {
    expect(validateWallpaperFile({ type: 'application/pdf', size: 1024 })).toContain(
      '图片文件',
    )
    expect(validateWallpaperFile({ type: 'image/png', size: 0 })).toContain('为空')
    expect(
      validateWallpaperFile({ type: 'image/png', size: MAX_WALLPAPER_BYTES + 1 }),
    ).toContain('5 MB')
  })
})

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
} from 'react'
import { Check, ImagePlus, Loader2, Trash2, X } from 'lucide-react'
import { getWallpaper, removeWallpaper, saveWallpaper } from '@/lib/db'
import {
  applyWallpaper,
  readStoredWallpaper,
  validateWallpaperFile,
  WALLPAPER_PRESETS,
  type WallpaperId,
} from '@/lib/wallpaper'

interface AppearanceDialogProps {
  onClose: () => void
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result)
      else reject(new Error('读取图片失败'))
    }
    reader.onerror = () => reject(reader.error ?? new Error('读取图片失败'))
    reader.readAsDataURL(file)
  })
}

function optionClass(active: boolean): string {
  return `flex min-h-11 flex-col overflow-hidden rounded-lg border text-left transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-blue-500 has-[:focus-visible]:ring-offset-1 dark:has-[:focus-visible]:ring-offset-slate-900 ${
    active
      ? 'border-blue-600 ring-1 ring-blue-600 dark:border-blue-500 dark:ring-blue-500'
      : 'border-slate-200 hover:border-blue-400 dark:border-slate-700 dark:hover:border-blue-500'
  }`
}

export default function AppearanceDialog({ onClose }: AppearanceDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selected, setSelected] = useState<WallpaperId>(readStoredWallpaper)
  const [customDataUrl, setCustomDataUrl] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])

  useEffect(() => {
    let cancelled = false

    getWallpaper()
      .then((dataUrl) => {
        if (!cancelled) setCustomDataUrl(dataUrl ?? null)
      })
      .catch(() => {
        if (!cancelled) setError('读取自定义壁纸失败，可重新上传。')
      })

    return () => {
      cancelled = true
    }
  }, [])

  function choose(id: WallpaperId) {
    applyWallpaper(id, customDataUrl)
    setSelected(id)
    setError(null)
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    const validation = validateWallpaperFile(file)
    if (validation) {
      setError(validation)
      return
    }

    setPending(true)
    setError(null)
    try {
      const dataUrl = await readFileAsDataUrl(file)
      await saveWallpaper(dataUrl)
      setCustomDataUrl(dataUrl)
      applyWallpaper('custom', dataUrl)
      setSelected('custom')
    } catch {
      setError('上传壁纸失败，请重试。')
    } finally {
      setPending(false)
    }
  }

  async function handleRemoveCustom() {
    if (pending) return

    setPending(true)
    setError(null)
    try {
      await removeWallpaper()
      setCustomDataUrl(null)
      if (selected === 'custom') {
        applyWallpaper('none')
        setSelected('none')
      }
    } catch {
      setError('移除图片失败，请重试。')
    } finally {
      setPending(false)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
      className="w-[min(92vw,30rem)] rounded-xl border border-slate-200 bg-white p-0 text-slate-900 shadow-xl backdrop:bg-slate-900/50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
    >
      <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-700">
        <div>
          <h2 id={titleId} className="text-sm font-semibold">
            外观
          </h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            壁纸只保存在本机浏览器，不影响答题记录
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="关闭"
          className="-mr-1 inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>

      <div className="px-4 py-4">
        <h3 className="text-sm font-medium">壁纸</h3>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          选择内置壁纸，或上传一张本机图片（最大 5 MB）。
        </p>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => choose('none')}
            aria-pressed={selected === 'none'}
            className={optionClass(selected === 'none')}
          >
            <span
              aria-hidden="true"
              className="flex aspect-[16/9] w-full items-center justify-center bg-slate-100 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400"
            >
              纯色
            </span>
            <span className="flex w-full items-center justify-between gap-1 px-2 py-1.5 text-xs font-medium">
              无壁纸
              {selected === 'none' && (
                <Check className="size-3.5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
              )}
            </span>
          </button>

          {WALLPAPER_PRESETS.map((preset) => {
            const active = selected === preset.id
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => choose(preset.id)}
                aria-pressed={active}
                className={optionClass(active)}
              >
                <span
                  aria-hidden="true"
                  className="aspect-[16/9] w-full bg-cover bg-center"
                  style={{ backgroundImage: preset.css }}
                />
                <span className="flex w-full items-center justify-between gap-1 px-2 py-1.5 text-xs font-medium">
                  {preset.label}
                  {active && (
                    <Check
                      className="size-3.5 text-blue-600 dark:text-blue-400"
                      aria-hidden="true"
                    />
                  )}
                </span>
              </button>
            )
          })}

          <button
            type="button"
            onClick={() => {
              if (customDataUrl) choose('custom')
              else fileInputRef.current?.click()
            }}
            disabled={pending}
            aria-pressed={selected === 'custom'}
            className={`${optionClass(selected === 'custom')} disabled:cursor-not-allowed disabled:opacity-60`}
          >
            <span
              aria-hidden="true"
              className={`flex aspect-[16/9] w-full items-center justify-center bg-cover bg-center ${
                customDataUrl
                  ? ''
                  : 'border-b border-dashed border-slate-300 bg-slate-50 text-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400'
              }`}
              style={
                customDataUrl ? { backgroundImage: `url("${customDataUrl}")` } : undefined
              }
            >
              {pending ? (
                <Loader2 className="size-5 animate-spin" aria-hidden="true" />
              ) : customDataUrl ? null : (
                <ImagePlus className="size-5" aria-hidden="true" />
              )}
            </span>
            <span className="flex w-full items-center justify-between gap-1 px-2 py-1.5 text-xs font-medium">
              {customDataUrl ? '自定义图片' : '上传图片'}
              {selected === 'custom' && (
                <Check className="size-3.5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
              )}
            </span>
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={(event) => void handleFileChange(event)}
          aria-label="选择壁纸图片"
          className="sr-only"
        />

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={pending}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-medium hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            <ImagePlus className="size-3.5" aria-hidden="true" />
            {customDataUrl ? '更换图片' : '选择图片'}
          </button>
          {customDataUrl && (
            <button
              type="button"
              onClick={() => void handleRemoveCustom()}
              disabled={pending}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-950/50"
            >
              <Trash2 className="size-3.5" aria-hidden="true" />
              移除图片
            </button>
          )}
        </div>

        {error && (
          <p
            role="alert"
            className="mt-3 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300"
          >
            {error}
          </p>
        )}

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700"
          >
            完成
          </button>
        </div>
      </div>
    </dialog>
  )
}

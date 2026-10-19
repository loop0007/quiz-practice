import { useEffect, useId, useRef, useState } from 'react'
import { Download, Loader2, X } from 'lucide-react'
import { promptInstall } from '@/lib/install'

interface InstallDialogProps {
  canInstall: boolean
  onClose: () => void
}

const MANUAL_STEPS = [
  '电脑端 Chrome / Edge：点击地址栏右侧的安装图标，或打开浏览器菜单选择“安装 在线刷题”。',
  'Android：打开浏览器菜单，选择“安装应用”或“添加到主屏幕”。',
  'iPhone / iPad：用 Safari 打开本站，点击分享按钮后选择“添加到主屏幕”。',
]

export default function InstallDialog({ canInstall, onClose }: InstallDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])

  async function handleInstall() {
    if (pending) return
    setPending(true)
    setMessage(null)
    try {
      const outcome = await promptInstall()
      if (outcome === 'accepted') onClose()
      else if (outcome === 'dismissed') setMessage('已取消安装，可稍后再试。')
      else setMessage('当前浏览器未提供自动安装，请按下方步骤手动添加。')
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
      className="m-auto w-[min(92vw,30rem)] rounded-[1.75rem] border border-slate-200 bg-white/95 p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/45 backdrop:backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-100"
    >
      <div className="flex items-start justify-between gap-3 border-b border-slate-200/80 px-5 py-4 dark:border-slate-700">
        <div>
          <h2 id={titleId} className="font-display text-lg font-semibold">
            下载为应用
          </h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            安装到桌面或主屏幕，像普通应用一样离线刷题
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="关闭"
          className="-mr-1 inline-flex size-11 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>

      <div className="px-5 py-5">
        <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">
          安装后可从桌面或主屏幕直接打开，练习记录仍保存在本机浏览器中。
        </p>

        {canInstall && (
          <button
            type="button"
            onClick={() => void handleInstall()}
            disabled={pending}
            className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-blue-600 px-5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 dark:disabled:bg-slate-700 dark:disabled:text-slate-400"
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Download className="size-4" aria-hidden="true" />
            )}
            立即安装
          </button>
        )}

        {message && (
          <p
            role="status"
            className="mt-3 rounded-xl bg-slate-50 px-3.5 py-2.5 text-xs text-slate-600 dark:bg-slate-950/50 dark:text-slate-300"
          >
            {message}
          </p>
        )}

        <div className="mt-4 border-t border-slate-200/80 pt-4 dark:border-slate-700/80">
          <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
            手动添加
          </p>
          <ol className="mt-2 space-y-2">
            {MANUAL_STEPS.map((step) => (
              <li
                key={step}
                className="flex gap-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400"
              >
                <span
                  aria-hidden="true"
                  className="mt-1.5 size-1 shrink-0 rounded-full bg-slate-400 dark:bg-slate-500"
                />
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-full border border-slate-200 px-5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            关闭
          </button>
        </div>
      </div>
    </dialog>
  )
}

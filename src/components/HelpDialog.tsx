import { useEffect, useId, useRef } from 'react'
import { X } from 'lucide-react'

interface HelpDialogProps {
  onClose: () => void
}

const STEPS = [
  '在「题库」选择题库，按章节与题型筛选后开始练习。',
  '选择答案后点「提交答案」；每题只提交一次，答错自动进入错题本。',
  '交卷后查看成绩，点开本次错题或未作答题号，可针对错题重练。',
  '错题本与收藏夹支持批量选择；错题可按题库组卷。',
  '练习记录只保存在本机浏览器，支持离线使用。',
]

export default function HelpDialog({ onClose }: HelpDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
      className="m-auto w-[min(92vw,28rem)] rounded-[1.75rem] border border-slate-200 bg-white/95 p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/45 backdrop:backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-100"
    >
      <div className="flex items-start justify-between gap-3 border-b border-slate-200/80 px-5 py-4 dark:border-slate-700">
        <div>
          <h2 id={titleId} className="font-display text-lg font-semibold">
            使用说明
          </h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            一分钟了解怎么刷题
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
        <ol className="space-y-3">
          {STEPS.map((step, index) => (
            <li key={step} className="flex gap-3 text-sm leading-relaxed">
              <span
                aria-hidden="true"
                className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-semibold tabular-nums text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
              >
                {index + 1}
              </span>
              <span className="text-slate-700 dark:text-slate-200">{step}</span>
            </li>
          ))}
        </ol>
        <p className="mt-4 rounded-2xl bg-slate-50 px-3.5 py-2.5 text-xs text-slate-500 dark:bg-slate-950/50 dark:text-slate-400">
          键盘：字母键选择 · Enter 提交 · ← / → 翻题
        </p>
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-full bg-blue-600 px-5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            知道了
          </button>
        </div>
      </div>
    </dialog>
  )
}

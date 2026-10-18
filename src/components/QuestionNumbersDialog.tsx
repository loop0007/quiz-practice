import { useEffect, useId, useRef } from 'react'
import { X } from 'lucide-react'

interface QuestionNumbersDialogProps {
  title: string
  numbers: number[]
  tone: 'wrong' | 'unanswered'
  onClose: () => void
}

const TONE_CLASS = {
  wrong:
    'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300',
  unanswered:
    'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200',
} as const

export default function QuestionNumbersDialog({
  title,
  numbers,
  tone,
  onClose,
}: QuestionNumbersDialogProps) {
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
      className="m-auto w-[min(92vw,26rem)] rounded-[1.75rem] border border-slate-200 bg-white/95 p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/45 backdrop:backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-100"
    >
      <div className="flex items-start justify-between gap-3 border-b border-slate-200/80 px-5 py-4 dark:border-slate-700">
        <div>
          <h2 id={titleId} className="font-display text-lg font-semibold">
            {title}
          </h2>
          <p className="mt-0.5 text-xs tabular-nums text-slate-500 dark:text-slate-400">
            共 {numbers.length} 题
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

      <div className="max-h-[60vh] overflow-y-auto px-5 py-4">
        {numbers.length > 0 ? (
          <ul className="flex flex-wrap gap-2" aria-label={`${title}题号`}>
            {numbers.map((number) => (
              <li
                key={number}
                className={`rounded-full border px-3 py-1 text-sm font-medium tabular-nums ${TONE_CLASS[tone]}`}
              >
                第 {number} 题
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">没有题目。</p>
        )}
      </div>
    </dialog>
  )
}

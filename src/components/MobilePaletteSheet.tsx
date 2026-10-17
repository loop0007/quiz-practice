import { useEffect, useId, useRef } from 'react'
import { X } from 'lucide-react'
import QuestionPalette from './QuestionPalette'
import type { PracticeSession, Question } from '@/types'

interface MobilePaletteSheetProps {
  questions: Question[]
  session: PracticeSession
  currentIndex: number
  onSelect: (index: number) => void
  onClose: () => void
}

/** 手机端题号导航：原生 dialog 底部抽屉，自带焦点约束与 Escape 关闭。 */
export default function MobilePaletteSheet({
  questions,
  session,
  currentIndex,
  onSelect,
  onClose,
}: MobilePaletteSheetProps) {
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
      className="fixed inset-x-0 bottom-0 top-auto m-0 flex max-h-[85dvh] w-full max-w-none flex-col overflow-hidden rounded-t-2xl border-0 bg-[var(--color-surface)] p-0 text-slate-900 shadow-2xl backdrop:bg-slate-900/50 dark:bg-slate-900 dark:text-slate-100"
    >
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-700">
        <div>
          <h2 id={titleId} className="text-sm font-semibold">
            题号导航
          </h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            点击题号跳转，关闭后继续答题
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="关闭题号导航"
          className="-mr-1 inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
      </div>

      <div
        className="min-h-0 overflow-y-auto overscroll-contain px-4 pt-3"
        style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <QuestionPalette
          questions={questions}
          session={session}
          currentIndex={currentIndex}
          onSelect={onSelect}
          listClassName="max-h-[50dvh]"
          showHeader={false}
        />
      </div>
    </dialog>
  )
}

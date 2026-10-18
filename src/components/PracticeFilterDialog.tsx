import { useEffect, useId, useRef, useState } from 'react'
import { SlidersHorizontal, X } from 'lucide-react'
import { getBankQuestions } from '@/lib/banks'
import type { BankMeta, QuestionType } from '@/types'

const TYPE_OPTIONS: Array<{ key: QuestionType; label: string }> = [
  { key: 'single', label: '单选' },
  { key: 'multi', label: '多选' },
  { key: 'judge', label: '判断' },
]

const ALL_TYPES: QuestionType[] = ['single', 'multi', 'judge']

interface PracticeFilterDialogProps {
  bank: BankMeta
  onClose: () => void
  /** 用户确认筛选后回调，传入已冻结的题目 ID 列表。 */
  onStart: (questionIds: string[]) => void
}

export default function PracticeFilterDialog({
  bank,
  onClose,
  onStart,
}: PracticeFilterDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const chapterSelectId = useId()
  /** 空字符串表示全部章节。 */
  const [chapterId, setChapterId] = useState('')
  const [types, setTypes] = useState<QuestionType[]>(ALL_TYPES)

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])

  const totalCount = getBankQuestions(bank.id).length
  const chapterFilter = chapterId ? { chapterId } : undefined
  const typeCounts = Object.fromEntries(
    ALL_TYPES.map((type) => [
      type,
      getBankQuestions(bank.id, { ...chapterFilter, types: [type] }).length,
    ]),
  ) as Record<QuestionType, number>
  const selectedQuestions = getBankQuestions(bank.id, { ...chapterFilter, types })

  function toggleType(type: QuestionType) {
    setTypes((previous) =>
      previous.includes(type)
        ? previous.filter((item) => item !== type)
        : [...previous, type],
    )
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
          <h2 id={titleId} className="flex items-center gap-1.5 text-sm font-semibold">
            <SlidersHorizontal className="size-4" aria-hidden="true" />
            筛选练习
          </h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {bank.name} · 异常题不参与筛选
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
        <label htmlFor={chapterSelectId} className="block text-sm font-medium">
          章节
        </label>
        <select
          id={chapterSelectId}
          value={chapterId}
          onChange={(event) => setChapterId(event.target.value)}
          className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950/50"
        >
          <option value="">全部章节（{totalCount} 题）</option>
          {bank.chapters.map((chapter) => {
            const count = getBankQuestions(bank.id, { chapterId: chapter.id }).length
            return (
              <option key={chapter.id} value={chapter.id}>
                {chapter.title}（{count} 题）
              </option>
            )
          })}
        </select>

        <fieldset className="mt-4">
          <legend className="text-sm font-medium">题型</legend>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {TYPE_OPTIONS.map(({ key, label }) => {
              const checked = types.includes(key)
              return (
                <label
                  key={key}
                  className={`flex min-h-11 cursor-pointer flex-col items-center justify-center rounded-lg border px-2 py-1.5 text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-blue-500 has-[:focus-visible]:ring-offset-1 dark:has-[:focus-visible]:ring-offset-slate-900 ${
                    checked
                      ? 'border-blue-600 bg-blue-50 font-medium text-blue-700 dark:border-blue-500 dark:bg-blue-950/50 dark:text-blue-300'
                      : 'border-slate-200 hover:border-blue-400 dark:border-slate-700 dark:hover:border-blue-500'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleType(key)}
                    className="sr-only"
                  />
                  <span>{label}</span>
                  <span className="text-xs font-normal tabular-nums text-slate-500 dark:text-slate-400">
                    {typeCounts[key]} 题
                  </span>
                </label>
              )
            })}
          </div>
        </fieldset>

        <p
          aria-live="polite"
          className="mt-4 rounded-lg bg-slate-50 px-3 py-2.5 text-sm dark:bg-slate-950/50"
        >
          将练习{' '}
          <strong className="text-base tabular-nums">{selectedQuestions.length}</strong>{' '}
          道题
          {selectedQuestions.length === 0 && (
            <span className="mt-0.5 block text-xs text-amber-700 dark:text-amber-300">
              当前条件下没有题目，请调整章节或至少选择一种题型。
            </span>
          )}
        </p>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-lg border border-slate-200 px-4 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            取消
          </button>
          <button
            type="button"
            disabled={selectedQuestions.length === 0}
            onClick={() => onStart(selectedQuestions.map((question) => question.id))}
            className="min-h-11 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 dark:disabled:bg-slate-700 dark:disabled:text-slate-400"
          >
            开始练习
          </button>
        </div>
      </div>
    </dialog>
  )
}

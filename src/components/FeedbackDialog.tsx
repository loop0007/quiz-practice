import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { CheckCircle2, Loader2, X } from 'lucide-react'
import { addFeedback } from '@/lib/db'
import type { FeedbackType, Question } from '@/types'

const QUESTION_TYPE_OPTIONS: Array<{ value: FeedbackType; label: string }> = [
  { value: 'wrong-answer', label: '答案错误' },
  { value: 'missing-option', label: '选项缺失' },
  { value: 'wrong-explanation', label: '解析错误' },
  { value: 'suggestion', label: '建议' },
  { value: 'other', label: '其他' },
]

const GENERAL_TYPE_OPTIONS: Array<{ value: FeedbackType; label: string }> = [
  { value: 'suggestion', label: '建议' },
  { value: 'other', label: '其他' },
]

interface FeedbackDialogProps {
  /** 不传表示主页通用反馈。 */
  question?: Question
  onClose: () => void
}

export default function FeedbackDialog({ question, onClose }: FeedbackDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [type, setType] = useState<FeedbackType>(
    question ? 'wrong-answer' : 'suggestion',
  )
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const titleId = useId()
  const noteId = useId()

  const typeOptions = question ? QUESTION_TYPE_OPTIONS : GENERAL_TYPE_OPTIONS

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return

    setSubmitting(true)
    setError(null)
    try {
      await addFeedback({
        ...(question ? { questionId: question.id, bankId: question.bankId } : {}),
        type,
        note: note.trim(),
      })
      setSaved(true)
    } catch {
      setError('保存失败，请稍后重试。')
    } finally {
      setSubmitting(false)
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
      className="m-auto w-[min(92vw,28rem)] rounded-[1.75rem] border border-slate-200 bg-white/95 p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/45 backdrop:backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-100"
    >
      <div className="flex items-start justify-between gap-3 border-b border-slate-200/80 px-5 py-4 dark:border-slate-700">
        <div>
          <h2 id={titleId} className="font-display text-lg font-semibold">
            反馈
          </h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {question ? `题号 ${question.number} · ` : '通用反馈 · '}
            反馈只保存在本机浏览器
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

      {saved ? (
        <div role="status" aria-live="polite" className="px-5 py-9 text-center">
          <CheckCircle2
            className="mx-auto size-9 text-green-600 dark:text-green-400"
            aria-hidden="true"
          />
          <p className="mt-3 text-sm font-medium">反馈已保存</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            记录已写入本机浏览器，不需要联网；刷新后仍会保留。
          </p>
          <button
            type="button"
            onClick={onClose}
            className="mt-5 min-h-11 rounded-full bg-blue-600 px-5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            关闭
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="px-5 py-5">
          <fieldset>
            <legend className="text-sm font-medium">
              {question ? '异常类型' : '反馈类型'}
            </legend>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {typeOptions.map((option) => (
                <label
                  key={option.value}
                  className={`flex min-h-11 cursor-pointer items-center justify-center rounded-2xl border px-3 text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-blue-500 has-[:focus-visible]:ring-offset-1 dark:has-[:focus-visible]:ring-offset-slate-900 ${
                    type === option.value
                      ? 'border-blue-600 bg-blue-50 font-medium text-blue-700 dark:border-blue-500 dark:bg-blue-950/50 dark:text-blue-300'
                      : 'border-slate-200 hover:border-blue-400 dark:border-slate-700 dark:hover:border-blue-500'
                  }`}
                >
                  <input
                    type="radio"
                    name="feedback-type"
                    value={option.value}
                    checked={type === option.value}
                    onChange={() => setType(option.value)}
                    className="sr-only"
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>

          <label htmlFor={noteId} className="mt-4 block text-sm font-medium">
            备注（选填）
          </label>
          <textarea
            id={noteId}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            maxLength={500}
            placeholder={
              question
                ? '可补充错误位置或修改建议，例如：正确答案应为 B。'
                : '想增加什么功能，或有哪些使用建议？'
            }
            className="mt-1.5 w-full resize-y rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm leading-relaxed placeholder:text-slate-400 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950/50 dark:placeholder:text-slate-400"
          />
          <p className="mt-1 text-right text-xs tabular-nums text-slate-400 dark:text-slate-400">
            {note.length} / 500
          </p>

          {error && (
            <p
              role="alert"
              className="mt-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300"
            >
              {error}
            </p>
          )}

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-11 rounded-full border border-slate-200 px-5 text-sm font-medium transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-blue-600 px-5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 dark:disabled:bg-slate-700 dark:disabled:text-slate-400"
            >
              {submitting && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              提交反馈
            </button>
          </div>
        </form>
      )}
    </dialog>
  )
}

import { CheckCircle2, XCircle } from 'lucide-react'
import type { AnswerRecord, Question, QuestionType } from '@/types'
import MarkdownContent from './MarkdownContent'

const TYPE_LABELS: Record<QuestionType, string> = {
  single: '单选题',
  multi: '多选题',
  judge: '判断题',
}

interface QuestionCardProps {
  question: Question
  index: number
  total: number
  /** 当前已选；未提交时来自 drafts，已提交时来自 AnswerRecord。 */
  selected: string[]
  record?: AnswerRecord
  onSelect: (key: string) => void
}

export default function QuestionCard({
  question,
  index,
  total,
  selected,
  record,
  onSelect,
}: QuestionCardProps) {
  const multi = question.type === 'multi'
  const locked = Boolean(record)

  return (
    <article className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm sm:p-6 dark:border-slate-700 dark:bg-slate-900">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <span className="rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
            {TYPE_LABELS[question.type]}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            题号 {question.number}
          </span>
        </div>
        <span className="text-xs tabular-nums text-slate-500 dark:text-slate-400">
          第 {index + 1} / {total} 题
        </span>
      </header>

      <h2 className="sr-only">题目</h2>
      <MarkdownContent className="mt-3 text-base leading-relaxed">
        {question.stem}
      </MarkdownContent>

      <div className="mt-4 space-y-2.5">
        {question.options.map((option) => {
          const isCorrect = question.answer.includes(option.key)
          const isSelected = selected.includes(option.key)

          let labelClass =
            'border-slate-200 bg-white hover:border-blue-400 dark:border-slate-700 dark:bg-slate-950/40 dark:hover:border-blue-500'
          let indicatorClass =
            'border-slate-300 bg-white text-slate-600 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300'

          if (locked) {
            if (isCorrect) {
              labelClass =
                'border-green-500 bg-green-50 dark:border-green-500 dark:bg-green-950/40'
              indicatorClass =
                'border-green-600 bg-green-600 text-white dark:border-green-500 dark:bg-green-500 dark:text-slate-950'
            } else if (isSelected) {
              labelClass = 'border-red-500 bg-red-50 dark:border-red-500 dark:bg-red-950/40'
              indicatorClass =
                'border-red-600 bg-red-600 text-white dark:border-red-500 dark:bg-red-500 dark:text-white'
            } else {
              labelClass =
                'border-slate-200 bg-white opacity-70 dark:border-slate-700 dark:bg-slate-950/40'
              indicatorClass =
                'border-slate-300 bg-white text-slate-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-400'
            }
          } else if (isSelected) {
            labelClass =
              'border-blue-600 bg-blue-50 dark:border-blue-500 dark:bg-blue-950/50'
            indicatorClass =
              'border-blue-600 bg-blue-600 text-white dark:border-blue-500 dark:bg-blue-500 dark:text-white'
          }

          return (
            <label
              key={option.key}
              className={`flex items-start gap-3 rounded-xl border p-3 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-blue-500 has-[:focus-visible]:ring-offset-1 dark:has-[:focus-visible]:ring-offset-slate-900 ${labelClass} ${
                locked ? 'cursor-default' : 'cursor-pointer'
              }`}
            >
              <input
                type={multi ? 'checkbox' : 'radio'}
                name={`question-${question.id}`}
                value={option.key}
                checked={isSelected}
                onChange={() => onSelect(option.key)}
                disabled={locked}
                className="sr-only"
              />
              <span
                aria-hidden="true"
                className={`mt-0.5 flex size-6 shrink-0 items-center justify-center border text-xs font-semibold tabular-nums ${
                  multi ? 'rounded-md' : 'rounded-full'
                } ${indicatorClass}`}
              >
                {option.key}
              </span>
              <span className="min-w-0 flex-1 pt-0.5 text-sm leading-relaxed">
                {option.text.includes('\n') ? (
                  <span className="block whitespace-pre-wrap break-words font-mono text-xs leading-relaxed">
                    {option.text.trim()}
                  </span>
                ) : (
                  <MarkdownContent inline>{option.text}</MarkdownContent>
                )}
              </span>
              {locked && isCorrect && (
                <CheckCircle2
                  className="mt-0.5 size-5 shrink-0 text-green-600 dark:text-green-400"
                  aria-label="正确答案"
                />
              )}
              {locked && isSelected && !isCorrect && (
                <XCircle
                  className="mt-0.5 size-5 shrink-0 text-red-600 dark:text-red-400"
                  aria-label="你的选择，错误"
                />
              )}
            </label>
          )
        })}
      </div>

      {record && (
        <div
          role="status"
          aria-live="polite"
          className={`mt-5 rounded-xl border p-4 ${
            record.correct
              ? 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/40'
              : 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/40'
          }`}
        >
          <div
            className={`flex items-center gap-2 text-sm font-semibold ${
              record.correct
                ? 'text-green-700 dark:text-green-300'
                : 'text-red-700 dark:text-red-300'
            }`}
          >
            {record.correct ? (
              <CheckCircle2 className="size-5" aria-hidden="true" />
            ) : (
              <XCircle className="size-5" aria-hidden="true" />
            )}
            {record.correct ? '回答正确' : '回答错误'}
          </div>

          <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">
            正确答案：<span className="font-semibold">{question.answer.join('、')}</span>
            {!record.correct && (
              <span className="ml-3 text-slate-600 dark:text-slate-300">
                你的答案：{record.selected.join('、') || '未作答'}
              </span>
            )}
          </p>

          <div className="mt-3 border-t border-slate-200 pt-3 dark:border-slate-700">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">解析</p>
            {question.explanation ? (
              <MarkdownContent className="mt-1 text-sm text-slate-700 dark:text-slate-200">
                {question.explanation}
              </MarkdownContent>
            ) : (
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">暂无解析</p>
            )}
          </div>
        </div>
      )}
    </article>
  )
}

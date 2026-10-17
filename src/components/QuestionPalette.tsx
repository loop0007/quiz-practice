import { Check, Circle, X } from 'lucide-react'
import { getQuestionStatus } from '@/lib/scoring'
import type { PracticeSession, Question } from '@/types'

interface QuestionPaletteProps {
  questions: Question[]
  session: PracticeSession
  currentIndex: number
  onSelect: (index: number) => void
}

const STATUS_LABEL = {
  unanswered: '未做',
  correct: '正确',
  wrong: '错误',
} as const

export default function QuestionPalette({
  questions,
  session,
  currentIndex,
  onSelect,
}: QuestionPaletteProps) {
  const answered = session.questionIds.filter((id) => session.answers[id]).length

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">题号导航</h2>
        <span className="text-xs tabular-nums text-slate-500 dark:text-slate-400">
          已答 {answered} / {questions.length}
        </span>
      </div>

      <div className="mt-2 grid max-h-64 grid-cols-6 gap-1.5 overflow-y-auto pr-1 lg:max-h-[60vh] lg:grid-cols-5">
        {questions.map((question, index) => {
          const status = getQuestionStatus(session, question.id)
          const current = index === currentIndex

          let statusClass =
            'border-slate-200 bg-white text-slate-700 hover:border-blue-400 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-200'
          if (status === 'correct') {
            statusClass =
              'border-green-300 bg-green-50 text-green-800 hover:border-green-500 dark:border-green-800 dark:bg-green-950/50 dark:text-green-200'
          } else if (status === 'wrong') {
            statusClass =
              'border-red-300 bg-red-50 text-red-800 hover:border-red-500 dark:border-red-800 dark:bg-red-950/50 dark:text-red-200'
          }

          return (
            <button
              key={question.id}
              type="button"
              onClick={() => onSelect(index)}
              aria-label={`第 ${question.number} 题，${STATUS_LABEL[status]}${
                current ? '，当前题' : ''
              }`}
              aria-current={current ? 'true' : undefined}
              className={`relative min-h-9 rounded-md border px-1 py-1 text-xs font-medium tabular-nums transition-colors ${statusClass} ${
                current
                  ? 'ring-2 ring-blue-500 ring-offset-1 dark:ring-offset-slate-900'
                  : ''
              }`}
            >
              {question.number}
              {status === 'correct' && (
                <Check
                  className="absolute right-0.5 top-0.5 size-2.5"
                  aria-hidden="true"
                />
              )}
              {status === 'wrong' && (
                <X className="absolute right-0.5 top-0.5 size-2.5" aria-hidden="true" />
              )}
              {status === 'unanswered' && (
                <Circle
                  className="absolute right-0.5 top-0.5 size-1.5 opacity-50"
                  aria-hidden="true"
                />
              )}
            </button>
          )
        })}
      </div>

      <ul className="mt-3 grid grid-cols-2 gap-1.5 text-xs text-slate-600 dark:text-slate-300">
        <li className="flex items-center gap-1">
          <Circle className="size-3 text-slate-400" aria-hidden="true" />
          未做
        </li>
        <li className="flex items-center gap-1">
          <Check className="size-3 text-green-600 dark:text-green-400" aria-hidden="true" />
          正确
        </li>
        <li className="flex items-center gap-1">
          <X className="size-3 text-red-600 dark:text-red-400" aria-hidden="true" />
          错误
        </li>
        <li className="flex items-center gap-1">
          <span
            className="inline-block size-3 rounded-sm border-2 border-blue-500"
            aria-hidden="true"
          />
          当前题
        </li>
      </ul>
    </div>
  )
}

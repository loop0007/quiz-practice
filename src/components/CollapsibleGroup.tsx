import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'

interface CollapsibleGroupProps {
  headingId: string
  title: string
  countText: string
  expanded: boolean
  onToggle: () => void
  action?: ReactNode
  children: ReactNode
}

/**
 * 题库分组的外壳：标题行始终可见，点击后展开题目列表。
 * 错题本与收藏夹共用，保证两边的展开交互和视觉一致。
 */
export default function CollapsibleGroup({
  headingId,
  title,
  countText,
  expanded,
  onToggle,
  action,
  children,
}: CollapsibleGroupProps) {
  const panelId = `${headingId}-panel`

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={headingId} className="min-w-0">
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={expanded}
            aria-controls={expanded ? panelId : undefined}
            className="group inline-flex min-h-11 max-w-full items-center gap-2 rounded-full border border-slate-200/90 bg-white/70 px-4 text-left text-sm font-medium transition-colors hover:bg-white hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900/60 dark:hover:bg-slate-800 dark:hover:text-blue-300"
          >
            <ChevronRight
              aria-hidden="true"
              className={`size-4 shrink-0 text-slate-400 transition-transform duration-200 group-hover:text-blue-600 dark:group-hover:text-blue-300 ${
                expanded ? 'rotate-90' : ''
              }`}
            />
            <span className="truncate text-sm font-semibold">{title}</span>
            <span className="shrink-0 text-xs font-normal tabular-nums text-slate-500 dark:text-slate-400">
              {countText}
            </span>
          </button>
        </h2>
        {action}
      </div>

      {expanded && (
        <div id={panelId} className="mt-2 space-y-2">
          {children}
        </div>
      )}
    </section>
  )
}

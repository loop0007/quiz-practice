import { useEffect, useId, useRef, useState } from 'react'
import { HelpCircle } from 'lucide-react'

const HINT_TEXT = '答对题数 ÷ 总题数，未作答按错误计入'
const HOVER_DELAY = 1000

/** 正确率说明：点击切换；鼠标/触控笔停留 1 秒显示。 */
export default function AccuracyHint() {
  const [open, setOpen] = useState(false)
  const [pinned, setPinned] = useState(false)
  const timerRef = useRef<number | null>(null)
  const containerRef = useRef<HTMLSpanElement>(null)
  const tooltipId = useId()

  function clearTimer() {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  useEffect(() => clearTimer, [])

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: PointerEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false)
        setPinned(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
        setPinned(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return (
    <span ref={containerRef} className="relative inline-flex">
      <button
        type="button"
        aria-label="正确率计算说明"
        aria-expanded={open}
        aria-describedby={open ? tooltipId : undefined}
        onClick={() => {
          clearTimer()
          if (open) {
            if (pinned) {
              setOpen(false)
              setPinned(false)
            } else {
              setPinned(true)
            }
          } else {
            setOpen(true)
            setPinned(true)
          }
        }}
        onPointerEnter={(event) => {
          if (event.pointerType === 'touch') return
          clearTimer()
          timerRef.current = window.setTimeout(() => {
            setOpen(true)
            setPinned(false)
          }, HOVER_DELAY)
        }}
        onPointerLeave={() => {
          clearTimer()
          if (!pinned) setOpen(false)
        }}
        className="relative inline-flex size-4 items-center justify-center rounded-full text-slate-400 after:absolute after:-inset-3.5 after:content-[''] hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
      >
        <HelpCircle className="size-4" aria-hidden="true" />
      </button>

      {open && (
        <span
          id={tooltipId}
          role="tooltip"
          className="absolute right-0 top-full z-20 mt-1.5 w-56 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-left text-xs leading-relaxed text-slate-700 shadow-lg dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
        >
          {HINT_TEXT}
        </span>
      )}
    </span>
  )
}

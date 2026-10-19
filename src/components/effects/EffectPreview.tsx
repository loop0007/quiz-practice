import type { EffectId } from '@/lib/effects'

const ACCENT = '#f26b21'

/** 外观弹窗里的静态示意图，说明每种特效的观感，不启动真实动画。 */
export default function EffectPreview({ id }: { id: EffectId }) {
  if (id === 'none') {
    return (
      <span
        aria-hidden="true"
        className="flex aspect-[16/9] w-full items-center justify-center bg-slate-100 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400"
      >
        无动画
      </span>
    )
  }

  return (
    <span
      aria-hidden="true"
      className="flex aspect-[16/9] w-full items-center justify-center overflow-hidden bg-slate-50 dark:bg-slate-800/80"
    >
      {id === 'sakura' && (
        <svg viewBox="0 0 96 54" className="size-full">
          <ellipse cx="18" cy="12" rx="4.2" ry="2.8" fill="#f9a8d4" transform="rotate(-24 18 12)" />
          <ellipse cx="41" cy="27" rx="3.4" ry="2.3" fill="#f472b6" transform="rotate(38 41 27)" />
          <ellipse cx="67" cy="10" rx="3.8" ry="2.5" fill="#fbcfe8" transform="rotate(12 67 10)" />
          <ellipse cx="79" cy="36" rx="4.6" ry="3" fill="#f9a8d4" transform="rotate(-42 79 36)" />
          <ellipse cx="28" cy="43" rx="3.2" ry="2.1" fill="#fda4af" transform="rotate(58 28 43)" />
          <ellipse cx="55" cy="47" rx="2.8" ry="1.9" fill="#fbcfe8" transform="rotate(-14 55 47)" />
        </svg>
      )}

      {id === 'lines' && (
        <svg viewBox="0 0 96 54" className="size-full">
          <g stroke={ACCENT} strokeWidth="0.8" opacity="0.5">
            <line x1="12" y1="14" x2="34" y2="31" />
            <line x1="34" y1="31" x2="59" y2="17" />
            <line x1="59" y1="17" x2="84" y2="35" />
            <line x1="34" y1="31" x2="52" y2="45" />
            <line x1="52" y1="45" x2="84" y2="35" />
            <line x1="59" y1="17" x2="76" y2="8" />
          </g>
          <g fill={ACCENT} opacity="0.75">
            <circle cx="12" cy="14" r="1.7" />
            <circle cx="34" cy="31" r="2" />
            <circle cx="59" cy="17" r="1.6" />
            <circle cx="84" cy="35" r="1.8" />
            <circle cx="52" cy="45" r="1.5" />
            <circle cx="76" cy="8" r="1.4" />
          </g>
        </svg>
      )}

      {id === 'particles' && (
        <svg viewBox="0 0 96 54" className="size-full">
          <g stroke={ACCENT} strokeWidth="0.6" opacity="0.28">
            <line x1="10" y1="38" x2="26" y2="20" />
            <line x1="26" y1="20" x2="45" y2="33" />
            <line x1="45" y1="33" x2="63" y2="15" />
            <line x1="63" y1="15" x2="86" y2="28" />
            <line x1="45" y1="33" x2="72" y2="43" />
            <line x1="63" y1="15" x2="72" y2="43" />
          </g>
          <g fill={ACCENT} opacity="0.65">
            <circle cx="10" cy="38" r="1.2" />
            <circle cx="26" cy="20" r="1.6" />
            <circle cx="45" cy="33" r="1.1" />
            <circle cx="63" cy="15" r="1.8" />
            <circle cx="86" cy="28" r="1.3" />
            <circle cx="72" cy="43" r="1.5" />
            <circle cx="35" cy="46" r="1" opacity="0.7" />
            <circle cx="80" cy="7" r="1" opacity="0.7" />
          </g>
        </svg>
      )}
    </span>
  )
}

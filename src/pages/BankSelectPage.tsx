import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  BookOpen,
  ChevronRight,
  Layers,
  SlidersHorizontal,
} from 'lucide-react'
import { banks } from '@/lib/banks'
import type { BankMeta } from '@/types'

const TYPE_LABELS: Array<{ key: keyof BankMeta['typeCounts']; label: string }> = [
  { key: 'single', label: '单选' },
  { key: 'multi', label: '多选' },
  { key: 'judge', label: '判断' },
]

export default function BankSelectPage() {
  const totalQuestions = banks.reduce((sum, bank) => sum + bank.validCount, 0)
  const totalChapters = banks.reduce((sum, bank) => sum + bank.chapters.length, 0)

  if (banks.length === 0) {
    return (
      <section className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white/80 p-10 text-center shadow-soft dark:border-slate-700 dark:bg-slate-900/80">
        <BookOpen className="mx-auto size-10 text-slate-400" aria-hidden="true" />
        <h1 className="mt-4 font-display text-2xl font-semibold">暂无题库</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          题库数据为空，请检查解析脚本是否已生成 banks.json。
        </p>
      </section>
    )
  }

  return (
    <section>
      <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.22em] text-blue-700 uppercase dark:text-blue-300">
            <span
              aria-hidden="true"
              className="inline-block size-1.5 rounded-full bg-blue-500"
            />
            Catalog · {totalQuestions} Questions
          </p>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            题库
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            选择一套题库进入，可按章节与题型组合筛选后开始练习。{banks.length} 套题库、
            {totalChapters} 个章节，记录只保存在本机。
          </p>
        </div>
        <Link
          to="/"
          className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-slate-200/90 bg-white/70 px-4 text-sm font-medium shadow-sm backdrop-blur transition-colors hover:border-blue-300 hover:bg-white hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900/60 dark:hover:border-blue-700 dark:hover:text-blue-300"
        >
          返回首页
        </Link>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
        {banks.map((bank, bankIndex) => (
          <Link
            key={bank.id}
            to={`/banks/${bank.id}`}
            aria-label={`进入${bank.name}`}
            className="group block rounded-[var(--radius-card)] focus-visible:outline-offset-4"
          >
            <article className="relative flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] border border-slate-200/80 bg-white/85 p-5 shadow-soft backdrop-blur-sm transition duration-300 group-hover:-translate-y-1 group-hover:border-blue-300/80 group-hover:shadow-lift sm:p-6 dark:border-slate-700/70 dark:bg-slate-900/80 dark:group-hover:border-blue-700">
              <span
                aria-hidden="true"
                className="editorial-ornament pointer-events-none absolute -right-1 -top-7 text-[7.5rem]"
              >
                {bank.name.slice(0, 1)}
              </span>

              <div className="relative flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold tracking-[0.24em] text-blue-700 uppercase dark:text-blue-300">
                    Bank {String(bankIndex + 1).padStart(2, '0')}
                  </p>
                  <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight">
                    {bank.name}
                  </h2>
                </div>
                {bank.anomalyCount > 0 && (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-200/80 bg-amber-50/80 px-2.5 py-1 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/60 dark:text-amber-300">
                    <AlertTriangle className="size-3" aria-hidden="true" />
                    异常 {bank.anomalyCount} 题
                  </span>
                )}
              </div>

              <div className="relative mt-5 flex items-baseline gap-2">
                <span className="font-display text-5xl leading-none font-semibold tabular-nums">
                  {bank.validCount}
                </span>
                <span className="text-sm text-slate-600 dark:text-slate-300">道有效题</span>
              </div>

              <p className="relative mt-2 text-xs text-slate-500 dark:text-slate-400">
                共 {bank.parsedCount} 题
                {bank.anomalyCount > 0 && `，${bank.anomalyCount} 题异常不参与练习`}
              </p>

              <dl className="relative mt-4 flex flex-wrap gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                {TYPE_LABELS.map(({ key, label }) => (
                  <div
                    key={key}
                    className="flex items-center gap-1.5 rounded-full bg-slate-100/90 px-2.5 py-1 dark:bg-slate-800/80"
                  >
                    <dt>{label}</dt>
                    <dd className="font-semibold tabular-nums">{bank.typeCounts[key]}</dd>
                  </div>
                ))}
                <div className="flex items-center gap-1.5 rounded-full bg-slate-100/90 px-2.5 py-1 dark:bg-slate-800/80">
                  <Layers className="size-3.5 text-slate-400" aria-hidden="true" />
                  <dd>{bank.chapters.length} 个章节</dd>
                </div>
              </dl>

              <div className="relative mt-auto flex items-center justify-between gap-3 pt-6">
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-700 dark:text-blue-300">
                  <SlidersHorizontal className="size-4" aria-hidden="true" />
                  进入题库 · 筛选练习
                </span>
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm transition-transform duration-300 group-hover:translate-x-0.5 dark:bg-blue-500 dark:text-slate-950">
                  <ChevronRight className="size-5" aria-hidden="true" />
                </span>
              </div>
            </article>
          </Link>
        ))}
      </div>
    </section>
  )
}

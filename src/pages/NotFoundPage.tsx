import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'

export default function NotFoundPage() {
  return (
    <section className="rounded-[var(--radius-card)] border border-slate-200/80 bg-white/85 p-10 text-center shadow-soft backdrop-blur-sm dark:border-slate-700/70 dark:bg-slate-900/80">
      <Compass className="mx-auto size-10 text-slate-400" aria-hidden="true" />
      <h1 className="mt-3 font-display text-2xl font-semibold tracking-tight">
        页面不存在
      </h1>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
        检查一下地址，或者回到首页重新开始。
      </p>
      <Link
        to="/"
        className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full bg-blue-600 px-5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
      >
        回到首页
      </Link>
    </section>
  )
}

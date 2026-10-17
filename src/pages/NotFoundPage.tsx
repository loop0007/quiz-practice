import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'

export default function NotFoundPage() {
  return (
    <section className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-10 text-center dark:border-slate-700 dark:bg-slate-900">
      <Compass className="mx-auto size-10 text-slate-400" aria-hidden="true" />
      <h1 className="mt-3 text-xl font-bold">页面不存在</h1>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
        检查一下地址，或者回到首页重新开始。
      </p>
      <Link
        to="/"
        className="mt-6 inline-flex min-h-11 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700"
      >
        回到首页
      </Link>
    </section>
  )
}

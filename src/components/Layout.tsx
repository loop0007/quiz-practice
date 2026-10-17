import { Link, Outlet } from 'react-router-dom'
import { BookOpenCheck, SquarePen } from 'lucide-react'

export default function Layout() {
  return (
    <div className="min-h-dvh">
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <BookOpenCheck className="size-5 text-blue-600" aria-hidden="true" />
            在线刷题
          </Link>
          <nav className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-300">
            <Link to="/wrongbook" className="flex items-center gap-1 hover:text-blue-600">
              <SquarePen className="size-4" aria-hidden="true" />
              错题本
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}

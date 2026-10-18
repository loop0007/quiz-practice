import { Link, Outlet, useLocation } from 'react-router-dom'
import { BookOpenCheck, History, SquarePen } from 'lucide-react'
import ThemeToggle from './ThemeToggle'

export default function Layout() {
  const { pathname } = useLocation()

  return (
    <div className="min-h-dvh">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-3 focus:text-sm focus:font-medium focus:text-blue-700 focus:shadow-lg dark:focus:bg-slate-900 dark:focus:text-blue-300"
      >
        跳到主要内容
      </a>

      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between gap-2 px-4">
          <Link
            to="/"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg font-semibold hover:text-blue-600"
          >
            <BookOpenCheck className="size-5 text-blue-600" aria-hidden="true" />
            在线刷题
          </Link>
          <nav
            aria-label="主导航"
            className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-300"
          >
            <Link
              to="/history"
              aria-current={pathname === '/history' ? 'page' : undefined}
              className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 hover:bg-slate-100 hover:text-blue-600 dark:hover:bg-slate-800 dark:hover:text-blue-400"
            >
              <History className="size-4" aria-hidden="true" />
              历史成绩
            </Link>
            <Link
              to="/wrongbook"
              aria-current={pathname === '/wrongbook' ? 'page' : undefined}
              className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 hover:bg-slate-100 hover:text-blue-600 dark:hover:bg-slate-800 dark:hover:text-blue-400"
            >
              <SquarePen className="size-4" aria-hidden="true" />
              错题本
            </Link>
            <ThemeToggle />
          </nav>
        </div>
      </header>

      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto max-w-4xl px-4 py-6 focus:outline-none"
      >
        <Outlet />
      </main>
    </div>
  )
}

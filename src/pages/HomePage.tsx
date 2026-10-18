import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  ArrowUpRight,
  BookOpenCheck,
  Layers,
  ListChecks,
  RotateCcw,
  Sparkles,
  Star,
  WifiOff,
} from 'lucide-react'
import { banks } from '@/lib/banks'
import { listFavorites, listFinishedSessions, listWrong } from '@/lib/db'

interface HomeStats {
  finished: number
  wrong: number
  favorites: number
}

const FEATURES = [
  {
    to: '/banks',
    title: '按章节与题型练习',
    description: '只练今天要考的章节，单选、多选、判断自由组合。',
    Icon: Layers,
    accent: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300',
  },
  {
    to: '/wrongbook',
    title: '错题自动成册',
    description: '答错的题自动收录，可对照解析或一键组卷重练。',
    Icon: RotateCcw,
    accent: 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
  },
  {
    to: '/favorites',
    title: '收藏随时回看',
    description: '把值得反复看的题收进收藏夹，按题库集中复习。',
    Icon: Star,
    accent: 'bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300',
  },
]

const STEPS = [
  { number: '01', label: '选择题库' },
  { number: '02', label: '筛选章节' },
  { number: '03', label: '逐题作答' },
  { number: '04', label: '复盘错题' },
]

export default function HomePage() {
  const [stats, setStats] = useState<HomeStats | null>(null)

  useEffect(() => {
    let cancelled = false

    Promise.allSettled([listFinishedSessions(), listWrong(), listFavorites()]).then(
      ([finished, wrong, favorites]) => {
        if (cancelled) return
        setStats({
          finished: finished.status === 'fulfilled' ? finished.value.length : 0,
          wrong: wrong.status === 'fulfilled' ? wrong.value.length : 0,
          favorites: favorites.status === 'fulfilled' ? favorites.value.length : 0,
        })
      },
    )

    return () => {
      cancelled = true
    }
  }, [])

  const totalQuestions = banks.reduce((sum, bank) => sum + bank.validCount, 0)
  const totalChapters = banks.reduce((sum, bank) => sum + bank.chapters.length, 0)

  return (
    <section>
      <div className="relative grid gap-9 pb-10 pt-4 lg:grid-cols-[minmax(0,1.08fr)_minmax(18rem,0.92fr)] lg:items-center lg:gap-12 lg:pb-16 lg:pt-8">
        <div>
          <p className="flex flex-wrap items-center gap-2 text-[11px] font-semibold tracking-[0.22em] text-blue-700 uppercase dark:text-blue-300">
            <Sparkles className="size-3.5" aria-hidden="true" />
            Java · Web · Learn by doing
          </p>
          <h1 className="mt-4 max-w-2xl font-display text-[clamp(2.6rem,6.5vw,4.6rem)] leading-[1.04] font-semibold tracking-tight text-balance">
            把刷题，变成每天的小进步
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600 dark:text-slate-300">
            两套本地题库，覆盖 Java 与 Web 前端。按章节筛选、逐题判分、错题重练，
            学习记录只留在你的浏览器里。
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-2.5">
            <Link
              to="/banks"
              className="inline-flex min-h-12 items-center gap-2 rounded-full bg-blue-600 px-6 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
            >
              去题库开始
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <Link
              to="/history"
              className="inline-flex min-h-12 items-center gap-2 rounded-full border border-slate-200/90 bg-white/70 px-5 text-sm font-medium shadow-sm backdrop-blur transition-colors hover:border-blue-300 hover:bg-white hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900/60 dark:hover:border-blue-700 dark:hover:text-blue-300"
            >
              <ListChecks className="size-4" aria-hidden="true" />
              查看历史成绩
            </Link>
          </div>

          <dl className="mt-8 grid max-w-lg grid-cols-3 gap-2">
            <div className="rounded-2xl border border-slate-200/80 bg-white/60 px-3 py-3 shadow-sm backdrop-blur dark:border-slate-700/70 dark:bg-slate-900/50">
              <dt className="text-[10px] tracking-wider text-slate-500 dark:text-slate-400">
                有效题
              </dt>
              <dd className="mt-1 font-display text-2xl font-semibold tabular-nums">
                {totalQuestions}
              </dd>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white/60 px-3 py-3 shadow-sm backdrop-blur dark:border-slate-700/70 dark:bg-slate-900/50">
              <dt className="text-[10px] tracking-wider text-slate-500 dark:text-slate-400">
                题库
              </dt>
              <dd className="mt-1 font-display text-2xl font-semibold tabular-nums">
                {banks.length}
              </dd>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white/60 px-3 py-3 shadow-sm backdrop-blur dark:border-slate-700/70 dark:bg-slate-900/50">
              <dt className="text-[10px] tracking-wider text-slate-500 dark:text-slate-400">
                章节
              </dt>
              <dd className="mt-1 font-display text-2xl font-semibold tabular-nums">
                {totalChapters}
              </dd>
            </div>
          </dl>
        </div>

        <div className="relative">
          <div
            aria-hidden="true"
            className="absolute -inset-5 rounded-[2.5rem] bg-blue-400/10 blur-2xl dark:bg-blue-900/20"
          />
          <div className="relative overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/75 p-6 shadow-soft backdrop-blur-xl dark:border-slate-700/70 dark:bg-slate-900/70 sm:p-7">
            <span
              aria-hidden="true"
              className="absolute -right-12 -top-14 size-40 rounded-full border border-blue-300/40 dark:border-blue-800/60"
            />
            <span
              aria-hidden="true"
              className="absolute -right-5 -top-6 size-24 rounded-full border border-blue-300/30 dark:border-blue-800/50"
            />

            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] font-semibold tracking-[0.22em] text-slate-500 uppercase dark:text-slate-400">
                Your progress
              </p>
              <span className="flex size-9 items-center justify-center rounded-full bg-blue-600 text-white dark:bg-blue-500 dark:text-slate-950">
                <BookOpenCheck className="size-4" aria-hidden="true" />
              </span>
            </div>

            <p className="mt-5 font-display text-6xl leading-none font-semibold tabular-nums">
              {stats ? stats.finished : '—'}
            </p>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">次已完成练习</p>

            <div className="mt-6 grid grid-cols-2 divide-x divide-slate-200/80 border-y border-slate-200/80 py-3 text-center dark:divide-slate-700 dark:border-slate-700">
              <div>
                <p className="text-[10px] tracking-wider text-slate-500 dark:text-slate-400">
                  错题本
                </p>
                <p className="mt-1 font-display text-xl font-semibold tabular-nums">
                  {stats ? stats.wrong : '—'}
                  <span className="ml-0.5 font-sans text-xs font-normal">题</span>
                </p>
              </div>
              <div>
                <p className="text-[10px] tracking-wider text-slate-500 dark:text-slate-400">
                  收藏夹
                </p>
                <p className="mt-1 font-display text-xl font-semibold tabular-nums">
                  {stats ? stats.favorites : '—'}
                  <span className="ml-0.5 font-sans text-xs font-normal">题</span>
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>数据只保存在本机浏览器</span>
              <Link
                to="/history"
                className="inline-flex min-h-11 items-center gap-1 rounded-full px-2 font-medium text-blue-700 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-950/50"
              >
                查看记录
                <ArrowUpRight className="size-3.5" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200/80 py-8 dark:border-slate-700/70">
        <ol className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {STEPS.map((step) => (
            <li key={step.number} className="flex items-baseline gap-2">
              <span className="font-display text-2xl font-semibold text-blue-700/80 tabular-nums dark:text-blue-300/80">
                {step.number}
              </span>
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                {step.label}
              </span>
            </li>
          ))}
        </ol>
      </div>

      <div className="grid gap-4 pb-4 sm:grid-cols-3 sm:gap-5">
        {FEATURES.map(({ to, title, description, Icon, accent }) => (
          <Link
            key={title}
            to={to}
            className="group rounded-[var(--radius-card)] border border-slate-200/80 bg-white/70 p-5 shadow-soft backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:shadow-lift dark:border-slate-700/70 dark:bg-slate-900/70 sm:p-6"
          >
            <span
              className={`flex size-11 items-center justify-center rounded-2xl ${accent}`}
            >
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <h2 className="mt-4 font-display text-lg font-semibold tracking-tight">
              {title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {description}
            </p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-blue-700 dark:text-blue-300">
              去看看
              <ArrowRight
                className="size-3.5 transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </span>
          </Link>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-[1.5rem] border border-slate-200/70 bg-white/50 px-4 py-3 text-xs text-slate-500 backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/40 dark:text-slate-400">
        <span className="flex items-center gap-1.5">
          <WifiOff className="size-3.5" aria-hidden="true" />
          已支持离线打开与作答
        </span>
        <span>无需登录 · 不上传题目与记录</span>
      </div>
    </section>
  )
}

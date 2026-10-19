import { useEffect, useRef, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import {
  BookOpenCheck,
  CircleHelp,
  Download,
  Menu,
  MessageSquarePlus,
  Palette,
  X,
} from 'lucide-react'
import { getWallpaper } from '@/lib/db'
import {
  getInstallPrompt,
  isInstalled,
  subscribeInstallPrompt,
  type BeforeInstallPromptEvent,
} from '@/lib/install'
import { applyWallpaper, readStoredWallpaper } from '@/lib/wallpaper'
import AppearanceDialog from './AppearanceDialog'
import BackgroundEffects from './effects/BackgroundEffects'
import FeedbackDialog from './FeedbackDialog'
import HelpDialog from './HelpDialog'
import InstallDialog from './InstallDialog'
import ThemeToggle from './ThemeToggle'

export default function Layout() {
  const { pathname } = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  // 答题页含 fixed 底栏，开场动画的 filter/transform 会临时改变其包含块，因此深链接进入时跳过。
  const [openingAnimation] = useState(() => !pathname.startsWith('/practice'))
  const [appearanceOpen, setAppearanceOpen] = useState(false)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [installOpen, setInstallOpen] = useState(false)
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setInstallPrompt(getInstallPrompt())
    setInstalled(isInstalled())
    return subscribeInstallPrompt(() => {
      setInstallPrompt(getInstallPrompt())
      setInstalled(isInstalled())
    })
  }, [])

  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    let cancelled = false
    const stored = readStoredWallpaper()

    if (stored !== 'custom') {
      applyWallpaper(stored)
      return
    }

    getWallpaper()
      .then((dataUrl) => {
        if (cancelled) return
        if (dataUrl) applyWallpaper('custom', dataUrl)
        else applyWallpaper('none')
      })
      .catch(() => {
        if (!cancelled) applyWallpaper('none')
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!menuOpen) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuOpen(false)
    }

    function handlePointerDown(event: PointerEvent) {
      if (event.target instanceof Node && !menuRef.current?.contains(event.target)) {
        setMenuOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    document.addEventListener('pointerdown', handlePointerDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [menuOpen])

  const navItems = [
    { to: '/', label: '首页', active: pathname === '/' },
    { to: '/banks', label: '题库', active: pathname.startsWith('/banks') },
    { to: '/history', label: '历史成绩', active: pathname === '/history' },
    { to: '/wrongbook', label: '错题本', active: pathname === '/wrongbook' },
    { to: '/favorites', label: '收藏夹', active: pathname === '/favorites' },
  ]

  return (
    <div className={`min-h-dvh${openingAnimation ? ' animate-blur-in' : ''}`}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-white focus:px-4 focus:py-3 focus:text-sm focus:font-medium focus:text-blue-700 focus:shadow-lg dark:focus:bg-slate-900 dark:focus:text-blue-300"
      >
        跳到主要内容
      </a>

      {/* 暖色柔光与细网格：纯装饰，不参与布局和读屏。 */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-20 overflow-hidden"
      >
        <div className="page-grid absolute inset-0" />
        <div className="animate-float-slow absolute -right-40 -top-48 size-[34rem] rounded-full bg-blue-400/15 blur-3xl dark:bg-blue-900/20" />
        <div className="absolute -left-48 top-1/3 size-[28rem] rounded-full bg-amber-200/35 blur-3xl dark:bg-amber-950/20" />
      </div>

      {/* 动态特效层位于壁纸之上、正文之下；关闭或减少动态效果时不渲染。 */}
      <BackgroundEffects />

      {/* 移动端隐藏品牌文字、把五个入口放进顶栏；桌面端的品牌、导航与“三”菜单保持原样。 */}
      <header className="app-topbar sticky top-0 z-40 px-2 pt-3 sm:px-4">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-2 rounded-full border border-slate-200/80 bg-white/80 px-2 shadow-soft backdrop-blur-xl sm:px-5 dark:border-slate-700/70 dark:bg-slate-900/75">
          <Link
            to="/"
            aria-label="在线刷题首页"
            className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2.5 rounded-full pr-0 font-semibold tracking-tight md:min-w-0 md:justify-start md:pr-2"
          >
            <span className="flex size-9 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm dark:bg-blue-500 dark:text-slate-950">
              <BookOpenCheck className="size-4.5" aria-hidden="true" />
            </span>
            <span className="hidden flex-col leading-none md:flex">
              <span className="font-display text-[17px] font-semibold tracking-tight">
                在线刷题
              </span>
              <span className="mt-1 text-[9px] font-medium tracking-[0.22em] text-slate-500 uppercase dark:text-slate-400">
                Quiz Studio
              </span>
            </span>
          </Link>
          <div className="flex min-w-0 flex-1 items-center gap-1 md:flex-none">
            <nav
              aria-label="主导航"
              className="flex min-w-0 flex-1 items-center justify-center gap-0.5 text-xs text-slate-600 md:flex-none md:text-sm dark:text-slate-300"
            >
              {navItems.map(({ to, label, active }) => (
                <Link
                  key={to}
                  to={to}
                  aria-label={label}
                  aria-current={active ? 'page' : undefined}
                  className={`inline-flex min-h-11 flex-1 items-center justify-center rounded-full px-1.5 font-medium transition-colors sm:px-2 md:flex-none md:px-3 ${
                    active
                      ? 'bg-blue-50 text-blue-700 md:bg-transparent dark:bg-blue-950/60 dark:text-blue-300 md:dark:bg-transparent'
                      : 'hover:text-blue-700 dark:hover:text-blue-300'
                  }`}
                >
                  {label === '历史成绩' ? (
                    <>
                      <span className="md:hidden">历史</span>
                      <span className="hidden md:inline">历史成绩</span>
                    </>
                  ) : label === '错题本' ? (
                    <>
                      <span className="md:hidden">错题</span>
                      <span className="hidden md:inline">错题本</span>
                    </>
                  ) : label === '收藏夹' ? (
                    <>
                      <span className="md:hidden">收藏</span>
                      <span className="hidden md:inline">收藏夹</span>
                    </>
                  ) : (
                    label
                  )}
                </Link>
              ))}
            </nav>

            <div ref={menuRef} className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                aria-label={menuOpen ? '关闭菜单' : '打开菜单'}
                aria-expanded={menuOpen}
                className="inline-flex size-11 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-slate-100 hover:text-blue-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-blue-300"
              >
                {menuOpen ? (
                  <X className="size-5" aria-hidden="true" />
                ) : (
                  <Menu className="size-5" aria-hidden="true" />
                )}
              </button>

              {menuOpen && (
                <nav
                  aria-label="菜单"
                  className="absolute right-0 top-full z-50 mt-2 w-[min(18rem,calc(100vw-2rem))]"
                >
                  <div className="rounded-[1.75rem] border border-slate-200/80 bg-white/95 p-2.5 shadow-lift backdrop-blur-xl dark:border-slate-700/70 dark:bg-slate-900/95">
                    <div className="grid gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false)
                          setHelpOpen(true)
                        }}
                        className="inline-flex min-h-11 items-center gap-2 rounded-2xl px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        <CircleHelp className="size-4" aria-hidden="true" />
                        使用说明
                      </button>
                      {!installed && (
                        <button
                          type="button"
                          onClick={() => {
                            setMenuOpen(false)
                            setInstallOpen(true)
                          }}
                          className="inline-flex min-h-11 items-center gap-2 rounded-2xl px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          <Download className="size-4" aria-hidden="true" />
                          下载为应用
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false)
                          setAppearanceOpen(true)
                        }}
                        className="inline-flex min-h-11 items-center gap-2 rounded-2xl px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        <Palette className="size-4" aria-hidden="true" />
                        外观
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false)
                          setFeedbackOpen(true)
                        }}
                        className="inline-flex min-h-11 items-center gap-2 rounded-2xl px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        <MessageSquarePlus className="size-4" aria-hidden="true" />
                        反馈
                      </button>
                    </div>

                    <div className="mt-1.5 flex items-center justify-between border-t border-slate-200/80 px-1 pt-1.5 dark:border-slate-700">
                      <span className="px-2 text-xs text-slate-500 dark:text-slate-400">
                        深色模式
                      </span>
                      <ThemeToggle />
                    </div>
                  </div>
                </nav>
              )}
            </div>
          </div>
        </div>
      </header>

      <main
        id="main-content"
        tabIndex={-1}
        className="relative z-10 mx-auto max-w-5xl px-4 py-7 focus:outline-none sm:px-6 sm:py-10"
      >
        {/* 路由切换时重新挂载容器以重播动画；首页沿用标题错峰动画，答题页因含 fixed 底栏只淡入。 */}
        <div
          key={pathname}
          className={
            pathname === '/'
              ? undefined
              : pathname.startsWith('/practice')
                ? 'animate-page-fade'
                : 'animate-page-in'
          }
        >
          <Outlet />
        </div>
      </main>

      {appearanceOpen && (
        <AppearanceDialog onClose={() => setAppearanceOpen(false)} />
      )}
      {feedbackOpen && <FeedbackDialog onClose={() => setFeedbackOpen(false)} />}
      {helpOpen && <HelpDialog onClose={() => setHelpOpen(false)} />}
      {installOpen && (
        <InstallDialog
          canInstall={installPrompt !== null}
          onClose={() => setInstallOpen(false)}
        />
      )}
    </div>
  )
}

/**
 * PWA 安装入口：捕获 Chromium 的 beforeinstallprompt，
 * 其他浏览器没有该事件时由安装弹窗展示手动添加步骤。
 */
export interface BeforeInstallPromptEvent extends Event {
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt: () => Promise<void>
}

let deferredPrompt: BeforeInstallPromptEvent | null = null
let installedThisSession = false
const listeners = new Set<() => void>()

function notify(): void {
  for (const listener of listeners) listener()
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    // 阻止浏览器自带的迷你安装条，改由菜单入口触发。
    event.preventDefault()
    deferredPrompt = event as BeforeInstallPromptEvent
    notify()
  })

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    installedThisSession = true
    notify()
  })
}

export function getInstallPrompt(): BeforeInstallPromptEvent | null {
  return deferredPrompt
}

export function subscribeInstallPrompt(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** 已经以独立窗口 / 主屏幕方式运行时，不再展示“下载为应用”。 */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  const navigatorStandalone = (
    window.navigator as Navigator & { standalone?: boolean }
  ).standalone
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    navigatorStandalone === true
  )
}

/** 已以独立窗口运行，或本次会话刚完成安装。 */
export function isInstalled(): boolean {
  return isStandalone() || installedThisSession
}

export async function promptInstall(): Promise<
  'accepted' | 'dismissed' | 'unavailable'
> {
  const event = deferredPrompt
  if (!event) return 'unavailable'

  await event.prompt()
  const choice = await event.userChoice
  deferredPrompt = null
  notify()
  return choice.outcome
}

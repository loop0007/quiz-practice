/**
 * E6：仅在生产构建注册 Service Worker。
 * 开发环境不注册，避免缓存干扰 Vite 热更新；注册失败不影响在线使用。
 */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD) return
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

  const register = () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      // 离线增强失败时保持普通在线页面。
    })
  }

  if (document.readyState === 'complete') register()
  else window.addEventListener('load', register, { once: true })
}

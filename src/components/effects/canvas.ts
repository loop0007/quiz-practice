/**
 * Canvas 动画的公共底座：统一 DPR、尺寸监听、页面隐藏暂停与指针跟踪。
 * 每个特效只需提供逐帧绘制函数，清理逻辑集中在这里。
 */
export interface CanvasSize {
  width: number
  height: number
}

export interface PointerState {
  x: number
  y: number
  active: boolean
}

export type DrawFrame = (
  ctx: CanvasRenderingContext2D,
  dt: number,
  size: CanvasSize,
) => void

const MAX_DPR = 2
const MAX_DELTA = 0.05

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/** 移动端按比例缩减粒子数量，避免低端设备掉帧。 */
export function particleBudget(desktop: number, mobile: number): number {
  if (typeof window === 'undefined') return desktop
  return window.matchMedia('(max-width: 640px)').matches ? mobile : desktop
}

function resizeCanvas(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
): CanvasSize {
  const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
  const width = window.innerWidth
  const height = window.innerHeight

  canvas.width = Math.round(width * dpr)
  canvas.height = Math.round(height * dpr)
  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  return { width, height }
}

/**
 * 启动画布循环，返回一次性清理函数：
 * 取消 requestAnimationFrame 并移除 resize / visibilitychange 监听。
 */
export function startAnimation(
  canvas: HTMLCanvasElement,
  draw: DrawFrame,
  onResize?: (size: CanvasSize) => void,
): () => void {
  const context = canvas.getContext('2d')
  if (!context) return () => {}
  const ctx: CanvasRenderingContext2D = context

  let size = resizeCanvas(canvas, ctx)
  let frame = 0
  let last = 0
  let running = true

  function tick(time: number) {
    if (!running) return
    const dt = last ? Math.min((time - last) / 1000, MAX_DELTA) : 1 / 60
    last = time
    draw(ctx, dt, size)
    frame = window.requestAnimationFrame(tick)
  }

  function start() {
    if (!running || frame) return
    last = 0
    frame = window.requestAnimationFrame(tick)
  }

  function stop() {
    if (frame) window.cancelAnimationFrame(frame)
    frame = 0
    last = 0
  }

  function handleResize() {
    size = resizeCanvas(canvas, ctx)
    onResize?.(size)
  }

  function handleVisibility() {
    if (document.hidden) stop()
    else start()
  }

  window.addEventListener('resize', handleResize)
  document.addEventListener('visibilitychange', handleVisibility)
  start()

  return () => {
    running = false
    stop()
    window.removeEventListener('resize', handleResize)
    document.removeEventListener('visibilitychange', handleVisibility)
  }
}

/** 被动监听指针位置，供线条与粒子特效做轻量交互。 */
export function trackPointer(): { state: PointerState; destroy: () => void } {
  const state: PointerState = { x: 0, y: 0, active: false }

  function handleMove(event: PointerEvent) {
    state.x = event.clientX
    state.y = event.clientY
    state.active = true
  }

  function handleOut(event: PointerEvent) {
    if (!event.relatedTarget) state.active = false
  }

  function handleBlur() {
    state.active = false
  }

  window.addEventListener('pointermove', handleMove, { passive: true })
  window.addEventListener('pointerout', handleOut, { passive: true })
  window.addEventListener('blur', handleBlur)

  return {
    state,
    destroy() {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerout', handleOut)
      window.removeEventListener('blur', handleBlur)
    },
  }
}

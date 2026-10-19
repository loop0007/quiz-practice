import { useEffect, useRef, useState } from 'react'
import type { EffectId } from '@/lib/effects'
import { useEffectStore } from '@/store/useEffectStore'
import { prefersReducedMotion } from './canvas'
import { createLinesEffect } from './lines'
import { createParticlesEffect } from './particles'
import { createSakuraEffect } from './sakura'

type Engine = (canvas: HTMLCanvasElement) => () => void

const ENGINES: Record<Exclude<EffectId, 'none'>, Engine> = {
  sakura: createSakuraEffect,
  lines: createLinesEffect,
  particles: createParticlesEffect,
}

/**
 * 全局动态特效层：固定在最底层之上、正文之下，不拦截点击与滚动。
 * 同一时间只挂载一个 canvas；切换或关闭时销毁旧动画与监听。
 */
export default function BackgroundEffects() {
  const effect = useEffectStore((state) => state.effect)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [reducedMotion, setReducedMotion] = useState(prefersReducedMotion)

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    function handleChange() {
      setReducedMotion(query.matches)
    }

    handleChange()
    query.addEventListener('change', handleChange)
    return () => query.removeEventListener('change', handleChange)
  }, [])

  const active = effect !== 'none' && !reducedMotion

  useEffect(() => {
    if (!active) return
    const canvas = canvasRef.current
    if (!canvas) return

    return ENGINES[effect](canvas)
  }, [active, effect])

  if (!active) return null

  return (
    <canvas
      ref={canvasRef}
      data-effect={effect}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0"
    />
  )
}

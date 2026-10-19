import { particleBudget, startAnimation } from './canvas'

interface Petal {
  x: number
  y: number
  size: number
  speed: number
  drift: number
  sway: number
  phase: number
  angle: number
  spin: number
  alpha: number
  color: string
}

const COLORS = ['#f9a8d4', '#fbcfe8', '#f472b6', '#fda4af']

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

function createPetal(width: number, height: number, initial: boolean): Petal {
  const size = randomBetween(3.5, 8)
  return {
    x: randomBetween(-20, width + 20),
    y: initial ? randomBetween(-20, height) : randomBetween(-80, -20),
    size,
    speed: randomBetween(18, 46),
    drift: randomBetween(8, 26),
    sway: randomBetween(0.6, 1.5),
    phase: randomBetween(0, Math.PI * 2),
    angle: randomBetween(0, Math.PI * 2),
    spin: randomBetween(-1.4, 1.4),
    alpha: randomBetween(0.35, 0.7),
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
  }
}

/** 樱花飘落：位置、速度、大小、旋转与左右摆动均为随机值。 */
export function createSakuraEffect(canvas: HTMLCanvasElement): () => void {
  const count = particleBudget(26, 14)
  let petals: Petal[] = []

  return startAnimation(
    canvas,
    (ctx, dt, size) => {
      if (petals.length === 0) {
        petals = Array.from({ length: count }, () =>
          createPetal(size.width, size.height, true),
        )
      }

      ctx.clearRect(0, 0, size.width, size.height)

      for (let i = 0; i < petals.length; i += 1) {
        const petal = petals[i]
        petal.phase += dt * petal.sway
        petal.y += petal.speed * dt
        petal.x += Math.sin(petal.phase) * petal.drift * dt
        petal.angle += petal.spin * dt

        if (petal.x < -30) petal.x = size.width + 30
        if (petal.x > size.width + 30) petal.x = -30
        if (petal.y > size.height + 30) {
          petals[i] = createPetal(size.width, size.height, false)
          continue
        }

        const s = petal.size
        ctx.save()
        ctx.translate(petal.x, petal.y)
        ctx.rotate(petal.angle)
        ctx.scale(1, 0.72)
        ctx.globalAlpha = petal.alpha
        ctx.fillStyle = petal.color
        ctx.beginPath()
        ctx.moveTo(0, -s)
        ctx.bezierCurveTo(s * 0.9, -s * 0.55, s * 0.8, s * 0.6, 0, s)
        ctx.bezierCurveTo(-s * 0.8, s * 0.6, -s * 0.9, -s * 0.55, 0, -s)
        ctx.fill()
        ctx.restore()
      }
    },
    () => {
      // 视口变化后按新尺寸重新分布，避免花瓣长时间集中在旧区域。
      petals = []
    },
  )
}

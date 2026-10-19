import {
  particleBudget,
  startAnimation,
  trackPointer,
} from './canvas'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
}

const COLOR = '242, 107, 33'

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

function createParticle(width: number, height: number): Particle {
  return {
    x: Math.random() * width,
    y: Math.random() * height,
    vx: randomBetween(-12, 12),
    vy: randomBetween(-12, 12),
    radius: randomBetween(0.8, 1.8),
  }
}

/**
 * 粒子动画：参考 particles.js 的漂浮与连线，鼠标靠近时产生轻微吸引。
 * 阻尼与速度上限让粒子保持舒缓，不会追着鼠标乱飞。
 */
export function createParticlesEffect(canvas: HTMLCanvasElement): () => void {
  const count = particleBudget(68, 32)
  const linkDistance = particleBudget(112, 84)
  const pointer = trackPointer()
  let particles: Particle[] = []

  const stopAnimation = startAnimation(
    canvas,
    (ctx, dt, size) => {
      if (particles.length === 0) {
        particles = Array.from({ length: count }, () =>
          createParticle(size.width, size.height),
        )
      }

      ctx.clearRect(0, 0, size.width, size.height)

      for (const particle of particles) {
        if (pointer.state.active) {
          const dx = pointer.state.x - particle.x
          const dy = pointer.state.y - particle.y
          const distance = Math.hypot(dx, dy)
          if (distance > 0 && distance < 150) {
            const force = (1 - distance / 150) * 30
            particle.vx += (dx / distance) * force * dt
            particle.vy += (dy / distance) * force * dt
          }
        }

        // 阻尼让粒子在鼠标离开后逐渐回到缓慢漂浮的状态。
        particle.vx *= Math.exp(-0.8 * dt)
        particle.vy *= Math.exp(-0.8 * dt)

        const speed = Math.hypot(particle.vx, particle.vy)
        const maxSpeed = 40
        if (speed > maxSpeed) {
          particle.vx = (particle.vx / speed) * maxSpeed
          particle.vy = (particle.vy / speed) * maxSpeed
        }

        particle.x += particle.vx * dt
        particle.y += particle.vy * dt

        if (particle.x < -10) particle.x = size.width + 10
        else if (particle.x > size.width + 10) particle.x = -10
        if (particle.y < -10) particle.y = size.height + 10
        else if (particle.y > size.height + 10) particle.y = -10
      }

      for (let i = 0; i < particles.length; i += 1) {
        const a = particles[i]
        for (let j = i + 1; j < particles.length; j += 1) {
          const b = particles[j]
          const distance = Math.hypot(a.x - b.x, a.y - b.y)
          if (distance >= linkDistance) continue

          const alpha = (1 - distance / linkDistance) * 0.65
          ctx.strokeStyle = `rgba(${COLOR}, ${alpha})`
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(a.x, a.y)
          ctx.lineTo(b.x, b.y)
          ctx.stroke()
        }
      }

      ctx.fillStyle = `rgba(${COLOR}, 0.85)`
      for (const particle of particles) {
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2)
        ctx.fill()
      }
    },
    () => {
      particles = []
    },
  )

  return () => {
    stopAnimation()
    pointer.destroy()
  }
}

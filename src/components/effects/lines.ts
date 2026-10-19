import {
  particleBudget,
  startAnimation,
  trackPointer,
} from './canvas'

interface Node {
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

function createNode(width: number, height: number): Node {
  return {
    x: Math.random() * width,
    y: Math.random() * height,
    vx: randomBetween(-22, 22),
    vy: randomBetween(-22, 22),
    radius: randomBetween(1.1, 2.2),
  }
}

/** 动态线条：漂浮节点在距离阈值内互相连线，并额外连接鼠标位置。 */
export function createLinesEffect(canvas: HTMLCanvasElement): () => void {
  const count = particleBudget(62, 32)
  const linkDistance = particleBudget(135, 96)
  const pointer = trackPointer()
  let nodes: Node[] = []

  const stopAnimation = startAnimation(
    canvas,
    (ctx, dt, size) => {
      if (nodes.length === 0) {
        nodes = Array.from({ length: count }, () =>
          createNode(size.width, size.height),
        )
      }

      ctx.clearRect(0, 0, size.width, size.height)

      for (const node of nodes) {
        // 鼠标附近轻轻加速，离开后自然恢复漂浮。
        if (pointer.state.active) {
          const dx = pointer.state.x - node.x
          const dy = pointer.state.y - node.y
          const distance = Math.hypot(dx, dy)
          if (distance > 0 && distance < 170) {
            const force = (1 - distance / 170) * 26
            node.vx += (dx / distance) * force * dt
            node.vy += (dy / distance) * force * dt
          }
        }

        const speed = Math.hypot(node.vx, node.vy)
        const maxSpeed = 52
        if (speed > maxSpeed) {
          node.vx = (node.vx / speed) * maxSpeed
          node.vy = (node.vy / speed) * maxSpeed
        }

        node.x += node.vx * dt
        node.y += node.vy * dt

        if (node.x < 0) {
          node.x = 0
          node.vx = Math.abs(node.vx)
        } else if (node.x > size.width) {
          node.x = size.width
          node.vx = -Math.abs(node.vx)
        }
        if (node.y < 0) {
          node.y = 0
          node.vy = Math.abs(node.vy)
        } else if (node.y > size.height) {
          node.y = size.height
          node.vy = -Math.abs(node.vy)
        }
      }

      for (let i = 0; i < nodes.length; i += 1) {
        const a = nodes[i]
        for (let j = i + 1; j < nodes.length; j += 1) {
          const b = nodes[j]
          const distance = Math.hypot(a.x - b.x, a.y - b.y)
          if (distance >= linkDistance) continue

          const alpha = (1 - distance / linkDistance) * 0.62
          ctx.strokeStyle = `rgba(${COLOR}, ${alpha})`
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(a.x, a.y)
          ctx.lineTo(b.x, b.y)
          ctx.stroke()
        }

        if (pointer.state.active) {
          const distance = Math.hypot(a.x - pointer.state.x, a.y - pointer.state.y)
          if (distance < 180) {
            const alpha = (1 - distance / 180) * 0.65
            ctx.strokeStyle = `rgba(${COLOR}, ${alpha})`
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(pointer.state.x, pointer.state.y)
            ctx.stroke()
          }
        }
      }

      ctx.fillStyle = `rgba(${COLOR}, 0.85)`
      for (const node of nodes) {
        ctx.beginPath()
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2)
        ctx.fill()
      }
    },
    () => {
      nodes = []
    },
  )

  return () => {
    stopAnimation()
    pointer.destroy()
  }
}

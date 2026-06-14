'use client'

import { useEffect, useRef } from 'react'

const COLORS = ['#FF6B9D', '#FFD700', '#4A7C59', '#FF8C42', '#A78BFA', '#60E0D0', '#FF4444', '#00DDFF']

type Particle = { x: number; y: number; vx: number; vy: number; color: string; size: number; alpha: number }

export default function Fireworks() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const resize = () => {
      canvas.width = canvas.clientWidth
      canvas.height = canvas.clientHeight
    }
    resize()
    window.addEventListener('resize', resize)

    let particles: Particle[] = []
    let launched = 0
    const totalLaunches = 8 + Math.floor(Math.random() * 3) // 8〜10発

    const launch = () => {
      const x = canvas.width * (0.2 + Math.random() * 0.6)
      const y = canvas.height * (0.2 + Math.random() * 0.4)
      for (let i = 0; i < 40; i++) {
        const angle = Math.random() * Math.PI * 2
        const speed = 3 + Math.random() * 5 // 3〜8
        particles.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          size: 2 + Math.random() * 2, // 2〜4px
          alpha: 1,
        })
      }
    }

    const launchTimer = window.setInterval(() => {
      if (launched >= totalLaunches) {
        window.clearInterval(launchTimer)
        return
      }
      launch()
      launched++
    }, 300)

    let raf = 0
    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particles.forEach(p => {
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.08 // 重力
        p.alpha -= 0.008 // フェードアウト
        if (p.alpha > 0) {
          ctx.globalAlpha = p.alpha
          ctx.fillStyle = p.color
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
          ctx.fill()
        }
      })
      particles = particles.filter(p => p.alpha > 0)
      ctx.globalAlpha = 1
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      window.clearInterval(launchTimer)
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'fixed', inset: 0, maxWidth: 390, margin: '0 auto', width: '100%', height: '100%', zIndex: 310, pointerEvents: 'none' }}
    />
  )
}

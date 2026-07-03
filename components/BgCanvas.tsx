'use client'

import { useEffect, useRef } from 'react'

interface Props {
  opacity?: number
  particleCount?: number
  connectDistance?: number
}

const MOUSE_REPEL = 130   // px radius particles are pushed away from the cursor
const MOUSE_LINK = 170    // px radius for cursor-to-particle connection lines

export default function BgCanvas({ opacity = 0.5, particleCount = 80, connectDistance = 110 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const coarse = window.matchMedia('(hover: none), (pointer: coarse)').matches

    let W = 0, H = 0
    let animId = 0
    const mouse = { x: -9999, y: -9999 }

    interface Particle {
      x: number; y: number; vx: number; vy: number
      r: number; a: number; ph: number
      reset(): void; update(): void; draw(): void
    }

    const particles: Particle[] = []

    const resize = () => {
      W = canvas.width = window.innerWidth
      H = canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    class P implements Particle {
      x = 0; y = 0; vx = 0; vy = 0; r = 0; a = 0; ph = 0
      constructor() { this.reset() }
      reset() {
        this.x = Math.random() * W; this.y = Math.random() * H
        this.vx = (Math.random() - 0.5) * 0.25; this.vy = (Math.random() - 0.5) * 0.25
        this.r = Math.random() * 1.2 + 0.3; this.a = Math.random() * 0.4 + 0.08
        this.ph = Math.random() * Math.PI * 2
      }
      update() {
        // Cursor repulsion — particles drift away from the pointer
        const dx = this.x - mouse.x
        const dy = this.y - mouse.y
        const d = Math.sqrt(dx * dx + dy * dy)
        if (d < MOUSE_REPEL && d > 0.001) {
          const f = ((MOUSE_REPEL - d) / MOUSE_REPEL) * 0.6
          this.x += (dx / d) * f
          this.y += (dy / d) * f
        }
        this.x += this.vx; this.y += this.vy; this.ph += 0.018
        if (this.x < 0 || this.x > W || this.y < 0 || this.y > H) this.reset()
      }
      draw() {
        ctx!.beginPath()
        ctx!.arc(this.x, this.y, this.r, 0, Math.PI * 2)
        ctx!.fillStyle = `rgba(0,212,255,${this.a * (0.5 + Math.sin(this.ph) * 0.5)})`
        ctx!.fill()
      }
    }

    for (let i = 0; i < particleCount; i++) particles.push(new P())

    const drawGrid = () => {
      ctx.strokeStyle = 'rgba(26,37,53,0.5)'
      ctx.lineWidth = 0.4
      for (let x = 0; x < W; x += 80) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke() }
      for (let y = 0; y < H; y += 80) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke() }
    }

    const connect = () => {
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const d = Math.sqrt(dx * dx + dy * dy)
          if (d < connectDistance) {
            ctx.beginPath()
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.strokeStyle = `rgba(0,212,255,${0.1 * (1 - d / connectDistance)})`
            ctx.lineWidth = 0.4
            ctx.stroke()
          }
        }
      }
    }

    // Cursor web — lines from the pointer to nearby particles
    const connectMouse = () => {
      if (mouse.x < 0) return
      for (const p of particles) {
        const dx = p.x - mouse.x
        const dy = p.y - mouse.y
        const d = Math.sqrt(dx * dx + dy * dy)
        if (d < MOUSE_LINK) {
          ctx.beginPath()
          ctx.moveTo(mouse.x, mouse.y)
          ctx.lineTo(p.x, p.y)
          ctx.strokeStyle = `rgba(0,212,255,${0.18 * (1 - d / MOUSE_LINK)})`
          ctx.lineWidth = 0.5
          ctx.stroke()
        }
      }
    }

    const drawFrame = () => {
      ctx.clearRect(0, 0, W, H)
      drawGrid()
      particles.forEach(p => { p.update(); p.draw() })
      connect()
      connectMouse()
    }

    // Reduced motion: render one static frame, no animation loop
    if (reduced) {
      drawFrame()
      return () => window.removeEventListener('resize', resize)
    }

    const onPointerMove = (e: PointerEvent) => { mouse.x = e.clientX; mouse.y = e.clientY }
    const onPointerLeave = () => { mouse.x = -9999; mouse.y = -9999 }
    if (!coarse) {
      document.addEventListener('pointermove', onPointerMove, { passive: true })
      document.documentElement.addEventListener('pointerleave', onPointerLeave)
    }

    let running = true
    const loop = () => {
      if (!running) return
      drawFrame()
      animId = requestAnimationFrame(loop)
    }
    loop()

    // Pause rendering when the tab is hidden
    const onVisibility = () => {
      if (document.hidden) {
        running = false
        cancelAnimationFrame(animId)
      } else if (!running) {
        running = true
        loop()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      running = false
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', onVisibility)
      if (!coarse) {
        document.removeEventListener('pointermove', onPointerMove)
        document.documentElement.removeEventListener('pointerleave', onPointerLeave)
      }
      cancelAnimationFrame(animId)
    }
  }, [particleCount, connectDistance])

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'fixed', inset: 0, zIndex: 0, opacity, pointerEvents: 'none' }}
    />
  )
}

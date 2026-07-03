'use client'

import { useEffect, useRef } from 'react'

/**
 * Global motion layer for the landing page:
 *  - scroll progress bar (top edge)
 *  - spotlight glow tracking the cursor on cards (--mx / --my)
 *  - 3D tilt on build & use-case cards
 *  - magnetic pull on primary CTAs
 *  - subtle hero parallax
 * All effects are skipped on touch devices and when the user
 * prefers reduced motion.
 */

const SPOT_SEL = '.build-card-v2, .feature-card, .usecase-card, .price-card, .budget-pill, .goal-pill'
const TILT_SEL = '.build-card-v2, .usecase-card'
const MAG_SEL = '.btn-primary, .builder-cta-btn.ready'

const TILT_MAX = 6 // degrees
const MAG_PULL = 0.16
const MAG_RANGE = 4 // multiplier of half-size cap

export default function MotionFX() {
  const barRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const coarse = window.matchMedia('(hover: none), (pointer: coarse)').matches

    // ── Scroll progress + hero parallax ──────────────────────────
    const bar = barRef.current
    const heroTitle = document.querySelector<HTMLElement>('.hero-title')
    const heroSub = document.querySelector<HTMLElement>('.hero-sub')

    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      if (bar) bar.style.transform = `scaleX(${max > 0 ? Math.min(window.scrollY / max, 1) : 0})`
      if (!reduced && window.scrollY < window.innerHeight) {
        if (heroTitle) heroTitle.style.transform = `translateY(${window.scrollY * 0.18}px)`
        if (heroSub) heroSub.style.transform = `translateY(${window.scrollY * 0.1}px)`
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()

    if (reduced || coarse) {
      return () => window.removeEventListener('scroll', onScroll)
    }

    // ── Pointer-driven effects (spotlight / tilt / magnetic) ─────
    let tiltEl: HTMLElement | null = null
    let magEl: HTMLElement | null = null

    const resetTilt = () => {
      if (!tiltEl) return
      tiltEl.style.transition = 'transform 0.5s var(--ease)'
      tiltEl.style.transform = ''
      tiltEl = null
    }
    const resetMag = () => {
      if (!magEl) return
      magEl.style.transition = 'transform 0.4s var(--ease)'
      magEl.style.transform = ''
      magEl = null
    }

    const onMove = (e: PointerEvent) => {
      const t = e.target as HTMLElement | null
      if (!t) return

      // Spotlight — write cursor position into CSS vars
      const spot = t.closest<HTMLElement>(SPOT_SEL)
      if (spot) {
        const r = spot.getBoundingClientRect()
        spot.style.setProperty('--mx', `${e.clientX - r.left}px`)
        spot.style.setProperty('--my', `${e.clientY - r.top}px`)
      }

      // Tilt — only after entrance animation has finished
      const tilt = t.closest<HTMLElement>(TILT_SEL)
      if (tilt !== tiltEl) resetTilt()
      if (tilt && (!tilt.classList.contains('build-card-v2') || tilt.classList.contains('visible'))) {
        const r = tilt.getBoundingClientRect()
        const px = (e.clientX - r.left) / r.width - 0.5
        const py = (e.clientY - r.top) / r.height - 0.5
        tilt.style.transition = 'transform 0.12s ease-out'
        tilt.style.transform = `perspective(900px) rotateX(${(-py * TILT_MAX).toFixed(2)}deg) rotateY(${(px * TILT_MAX).toFixed(2)}deg) translateZ(0)`
        tiltEl = tilt
      }

      // Magnetic — CTA leans toward the cursor
      const mag = t.closest<HTMLElement>(MAG_SEL)
      if (mag !== magEl) resetMag()
      if (mag) {
        const r = mag.getBoundingClientRect()
        const dx = e.clientX - (r.left + r.width / 2)
        const dy = e.clientY - (r.top + r.height / 2)
        const cap = Math.min(r.width, r.height) / MAG_RANGE
        const mx = Math.max(-cap, Math.min(cap, dx * MAG_PULL))
        const my = Math.max(-cap, Math.min(cap, dy * MAG_PULL))
        mag.style.transition = 'transform 0.15s ease-out'
        mag.style.transform = `translate(${mx.toFixed(1)}px, ${(my - 2).toFixed(1)}px)`
        magEl = mag
      }
    }

    const onLeave = () => { resetTilt(); resetMag() }

    document.addEventListener('pointermove', onMove, { passive: true })
    document.documentElement.addEventListener('pointerleave', onLeave)

    return () => {
      window.removeEventListener('scroll', onScroll)
      document.removeEventListener('pointermove', onMove)
      document.documentElement.removeEventListener('pointerleave', onLeave)
      resetTilt()
      resetMag()
    }
  }, [])

  return <div ref={barRef} className="scroll-progress" aria-hidden="true" />
}

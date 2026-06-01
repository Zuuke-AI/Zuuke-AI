'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

interface SiteNavProps {
  /** Pass the current page key to highlight the active link */
  activePage?: 'about' | 'privacy' | 'terms' | 'affiliate'
}

export default function SiteNav({ activePage }: SiteNavProps) {
  const navRef = useRef<HTMLElement>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => navRef.current?.classList.toggle('scrolled', window.scrollY > 40)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileMenuOpen])

  return (
    <>
      <nav ref={navRef} className="nav">
        <Link href="/" className="nav-logo">
          <div className="nav-logo-mark">
            <img src="/zuukelogo-sq.png" style={{ width: 38, height: 38, objectFit: 'cover' }} alt="Zuuke logo" />
          </div>
          <span className="nav-wordmark">ZUUKE<span>.</span></span>
        </Link>

        <div className="nav-links">
          <Link href="/#how-it-works">How It Works</Link>
          <Link href="/#features">Features</Link>
          <Link href="/#pricing">Pricing</Link>
          <Link href="/about" className={activePage === 'about' ? 'active' : ''}>About Us</Link>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/auth?mode=login" className="nav-login">Log In</Link>
          <Link href="/chat" className="nav-cta"><span>Start Building →</span></Link>
        </div>

        {/* Hamburger — mobile only */}
        <button className="nav-hamburger" onClick={() => setMobileMenuOpen(true)} aria-label="Open menu">
          <svg width="20" height="14" viewBox="0 0 20 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="0" y1="1" x2="20" y2="1" />
            <line x1="0" y1="7" x2="20" y2="7" />
            <line x1="0" y1="13" x2="20" y2="13" />
          </svg>
        </button>
      </nav>

      {/* Mobile nav overlay */}
      {mobileMenuOpen && (
        <div className="mobile-nav-menu open">
          <button className="mobile-nav-close" onClick={() => setMobileMenuOpen(false)}>✕</button>
          <Link href="/#how-it-works" onClick={() => setMobileMenuOpen(false)}>How It Works</Link>
          <Link href="/#features" onClick={() => setMobileMenuOpen(false)}>Features</Link>
          <Link href="/#pricing" onClick={() => setMobileMenuOpen(false)}>Pricing</Link>
          <Link href="/about" onClick={() => setMobileMenuOpen(false)}>About</Link>
          <Link href="/auth?mode=login" onClick={() => setMobileMenuOpen(false)}>Log In</Link>
          <Link href="/chat" className="nav-cta" style={{ marginTop: 8 }} onClick={() => setMobileMenuOpen(false)}>
            <span>Start Building →</span>
          </Link>
        </div>
      )}
    </>
  )
}

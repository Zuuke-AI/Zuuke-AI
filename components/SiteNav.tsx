'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@/lib/supabase'
import NotificationBell from '@/components/NotificationBell'

interface SiteNavProps {
  activePage?: 'about' | 'privacy' | 'terms' | 'affiliate' | 'community'
  style?: React.CSSProperties
}

interface UserInfo {
  username: string | null
  initial: string
  avatar_url: string | null
}

export default function SiteNav({ activePage, style }: SiteNavProps) {
  const navRef = useRef<HTMLElement>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [user, setUser] = useState<UserInfo | null>(null)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)
  const supabase = createBrowserClient()

  useEffect(() => {
    const onScroll = () => navRef.current?.classList.toggle('scrolled', window.scrollY > 40)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileMenuOpen])

  useEffect(() => {
    async function loadUser() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const meta = session.user.user_metadata ?? {}
      const firstName: string = meta.first_name ?? meta.full_name?.split(' ')[0] ?? ''
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', session.user.id)
        .single()
      setUser({
        username: profile?.username ?? null,
        initial: (firstName || profile?.username || 'U')[0].toUpperCase(),
        avatar_url: profile?.avatar_url ?? null,
      })
    }
    loadUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') setUser(null)
      if (event === 'SIGNED_IN') loadUser()
    })
    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Close profile menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    setUser(null)
    setProfileMenuOpen(false)
    window.location.href = '/'
  }

  return (
    <>
      <nav ref={navRef} className="nav" style={style}>
        <Link href="/" className="nav-logo">
          <div className="nav-logo-mark">
            <img src="/zuukelogo-sq.png" style={{ width: 38, height: 38, objectFit: 'cover' }} alt="Zuuke logo" />
          </div>
          <span className="nav-wordmark">ZUUKE<span>.</span></span>
        </Link>

        <div className="nav-links">
          <Link href="/#how-it-works">How It Works</Link>
          <Link href="/#features">Features</Link>
          <Link href="/community" className={activePage === 'community' ? 'active' : ''}>Community</Link>
          <Link href="/#pricing">Pricing</Link>
          <Link href="/about" className={activePage === 'about' ? 'active' : ''}>About Us</Link>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {user && <NotificationBell />}
          {user ? (
            <div className="nav-profile-wrap" ref={profileRef}>
              <button
                className="nav-profile-btn"
                onClick={() => setProfileMenuOpen(p => !p)}
                aria-label="Profile menu"
              >
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt="avatar" className="nav-avatar-img" />
                ) : (
                  <span className="nav-avatar-letter">{user.initial}</span>
                )}
              </button>
              {profileMenuOpen && (
                <div className="nav-profile-menu">
                  {user.username && (
                    <Link href={`/u/${user.username}`} className="nav-profile-item" onClick={() => setProfileMenuOpen(false)}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                      </svg>
                      Profile
                    </Link>
                  )}
                  <Link href="/settings" className="nav-profile-item" onClick={() => setProfileMenuOpen(false)}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="3"/>
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                    </svg>
                    Settings
                  </Link>
                  <Link href="/chat" className="nav-profile-item" onClick={() => setProfileMenuOpen(false)}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                    </svg>
                    New Build
                  </Link>
                  <div className="nav-profile-divider" />
                  <button className="nav-profile-item nav-signout" onClick={handleSignOut}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                    </svg>
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link href="/auth?mode=login" className="nav-login">Log In</Link>
              <Link href="/auth" className="nav-cta"><span>Sign Up Free →</span></Link>
            </>
          )}
          <Link href="/chat" className="nav-cta" style={user ? {} : { display: 'none' }}><span>Build →</span></Link>
        </div>

        <button className="nav-hamburger" onClick={() => setMobileMenuOpen(true)} aria-label="Open menu">
          <svg width="20" height="14" viewBox="0 0 20 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="0" y1="1" x2="20" y2="1"/>
            <line x1="0" y1="7" x2="20" y2="7"/>
            <line x1="0" y1="13" x2="20" y2="13"/>
          </svg>
        </button>
      </nav>

      {mobileMenuOpen && (
        <div className="mobile-nav-menu open">
          <button className="mobile-nav-close" onClick={() => setMobileMenuOpen(false)}>✕</button>
          <Link href="/#how-it-works" onClick={() => setMobileMenuOpen(false)}>How It Works</Link>
          <Link href="/#features" onClick={() => setMobileMenuOpen(false)}>Features</Link>
          <Link href="/community" onClick={() => setMobileMenuOpen(false)}>Community</Link>
          <Link href="/#pricing" onClick={() => setMobileMenuOpen(false)}>Pricing</Link>
          <Link href="/about" onClick={() => setMobileMenuOpen(false)}>About</Link>
          {user ? (
            <>
              {user.username && <Link href={`/u/${user.username}`} onClick={() => setMobileMenuOpen(false)}>My Profile</Link>}
              <Link href="/settings" onClick={() => setMobileMenuOpen(false)}>Settings</Link>
              <button onClick={() => { handleSignOut(); setMobileMenuOpen(false) }} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 14, textAlign: 'left', padding: '12px 0' }}>Sign Out</button>
            </>
          ) : (
            <>
              <Link href="/auth?mode=login" onClick={() => setMobileMenuOpen(false)}>Log In</Link>
              <Link href="/auth" onClick={() => setMobileMenuOpen(false)}>Sign Up Free</Link>
            </>
          )}
          <Link href="/chat" className="nav-cta" style={{ marginTop: 8 }} onClick={() => setMobileMenuOpen(false)}>
            <span>Start Building →</span>
          </Link>
        </div>
      )}
    </>
  )
}

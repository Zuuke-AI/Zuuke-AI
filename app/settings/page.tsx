'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@/lib/supabase'
import SiteNav from '@/components/SiteNav'
import BgCanvas from '@/components/BgCanvas'

type AvailStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'same'

export default function SettingsPage() {
  const router = useRouter()
  const supabase = createBrowserClient()

  const [loading, setLoading] = useState(true)
  const [currentUsername, setCurrentUsername] = useState('')
  const [newUsername, setNewUsername] = useState('')
  const [saving, setSaving] = useState(false)
  const [alert, setAlert] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [firstName, setFirstName] = useState('')
  const [userId, setUserId] = useState('')
  const [availStatus, setAvailStatus] = useState<AvailStatus>('idle')

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth?mode=login'); return }

      setUserId(session.user.id)
      setFirstName(session.user.user_metadata?.first_name ?? '')

      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', session.user.id)
        .single()

      if (profile?.username) {
        setCurrentUsername(profile.username)
        setNewUsername(profile.username)
      }
      setLoading(false)
    }
    load()
  }, [])

  // ── Live availability check (debounced 500ms) ──────────────────────
  const checkAvailability = useCallback(async (value: string, uid: string, current: string) => {
    const clean = value.trim().toLowerCase().replace(/[^a-z0-9_]/g, '')

    if (!clean || clean.length < 3 || clean.length > 30) {
      setAvailStatus(clean.length > 0 ? 'invalid' : 'idle')
      return
    }
    if (clean === current) {
      setAvailStatus('same')
      return
    }

    setAvailStatus('checking')
    try {
      const res = await fetch(`/api/profile/username?check=${encodeURIComponent(clean)}&userId=${uid}`)
      const data = await res.json()
      setAvailStatus(data.available ? 'available' : 'taken')
    } catch {
      setAvailStatus('idle')
    }
  }, [])

  function handleUsernameChange(value: string) {
    setNewUsername(value)
    setAlert(null)
    setAvailStatus('idle')

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      checkAvailability(value, userId, currentUsername)
    }, 500)
  }

  // ── Save ───────────────────────────────────────────────────────────
  async function saveUsername() {
    if (!newUsername.trim() || !userId) return
    if (availStatus === 'taken') return

    setSaving(true)
    setAlert(null)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const res = await fetch('/api/profile/username', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ username: newUsername.trim() }),
    })

    const data = await res.json()
    if (res.ok) {
      setCurrentUsername(data.username)
      setNewUsername(data.username)
      setAvailStatus('same')
      setAlert({ msg: '✓ Username updated successfully!', type: 'success' })
    } else {
      setAlert({ msg: data.error ?? 'Something went wrong.', type: 'error' })
      if (data.error === 'Username already taken') setAvailStatus('taken')
    }
    setSaving(false)
  }

  // ── Derived state ──────────────────────────────────────────────────
  const clean = newUsername.trim().toLowerCase().replace(/[^a-z0-9_]/g, '')
  const isValid = clean.length >= 3 && clean.length <= 30
  const changed = clean !== currentUsername
  const canSave = isValid && changed && availStatus !== 'taken' && availStatus !== 'checking' && availStatus !== 'invalid' && !saving

  function statusIcon() {
    if (availStatus === 'checking') return <span className="avail-checking">⏳ Checking…</span>
    if (availStatus === 'available') return <span className="avail-ok">✓ Available</span>
    if (availStatus === 'taken') return <span className="avail-taken">✗ Already taken</span>
    if (availStatus === 'same') return <span className="avail-ok">✓ Your current username</span>
    if (availStatus === 'invalid') return <span className="avail-invalid">Must be 3–30 chars, letters/numbers/underscores only</span>
    return null
  }

  if (loading) {
    return (
      <>
        <BgCanvas opacity={0.2} particleCount={40} connectDistance={80} />
        <SiteNav />
        <div style={{ paddingTop: 160, textAlign: 'center', color: 'var(--mist)' }}>Loading…</div>
      </>
    )
  }

  return (
    <>
      <BgCanvas opacity={0.2} particleCount={40} connectDistance={80} />
      <SiteNav />

      <div className="page" style={{ position: 'relative', zIndex: 1, paddingTop: 100 }}>
        <div className="settings-wrap">

          <div className="settings-header">
            <div className="community-eyebrow">ACCOUNT</div>
            <h1 className="community-title">SETTINGS</h1>
          </div>

          <div className="settings-card">
            <h2 className="settings-section-title">Profile</h2>

            <div className="settings-field">
              <label className="settings-label">Display Name</label>
              <div className="settings-value">{firstName || '—'}</div>
            </div>

            <div className="settings-field">
              <label className="settings-label">Username</label>
              <p className="settings-hint">
                Your public @username — shown on every build and comment you post. Only letters, numbers, and underscores. Must be unique.
              </p>
              <div className={`settings-input-row${availStatus === 'taken' ? ' error' : availStatus === 'available' ? ' ok' : ''}`}>
                <span className="settings-at">@</span>
                <input
                  className="settings-input"
                  type="text"
                  value={newUsername}
                  onChange={e => handleUsernameChange(e.target.value)}
                  placeholder="yourname"
                  maxLength={30}
                  spellCheck={false}
                  autoComplete="off"
                />
              </div>
              {newUsername.length > 0 && (
                <div className="settings-avail-row">{statusIcon()}</div>
              )}
            </div>

            {alert && (
              <div className={`settings-alert ${alert.type}`}>{alert.msg}</div>
            )}

            <div className="settings-actions">
              <button
                className="btn-primary"
                style={{ padding: '12px 32px', fontSize: 13 }}
                onClick={saveUsername}
                disabled={!canSave}
              >
                {saving ? 'Saving…' : 'Save Username'}
              </button>
              {currentUsername && (
                <Link href={`/u/${currentUsername}`} className="btn-secondary" style={{ padding: '11px 28px', fontSize: 13 }}>
                  View Profile →
                </Link>
              )}
            </div>
          </div>

        </div>
      </div>

      <footer style={{ position: 'relative', zIndex: 1 }}>
        <div className="footer-logo">ZUUKE<span>.</span></div>
        <div className="footer-text">© 2026 Zuuke AI · All rights reserved</div>
        <div className="footer-links">
          <Link href="/about">About Us</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/affiliate">Affiliate Disclosure</Link>
        </div>
      </footer>
    </>
  )
}

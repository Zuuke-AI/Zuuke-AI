'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@/lib/supabase'
import SiteNav from '@/components/SiteNav'
import BgCanvas from '@/components/BgCanvas'

export default function SettingsPage() {
  const router = useRouter()
  const supabase = createBrowserClient()

  const [loading, setLoading] = useState(true)
  const [username, setUsername] = useState('')
  const [newUsername, setNewUsername] = useState('')
  const [saving, setSaving] = useState(false)
  const [alert, setAlert] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [firstName, setFirstName] = useState('')
  const [userId, setUserId] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth?mode=login'); return }

      setUserId(session.user.id)
      const meta = session.user.user_metadata
      setFirstName(meta?.first_name ?? '')

      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', session.user.id)
        .single()

      if (profile?.username) {
        setUsername(profile.username)
        setNewUsername(profile.username)
      }
      setLoading(false)
    }
    load()
  }, [])

  async function saveUsername() {
    if (!newUsername.trim() || !userId) return
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
      setUsername(data.username)
      setNewUsername(data.username)
      setAlert({ msg: 'Username updated!', type: 'success' })
    } else {
      setAlert({ msg: data.error ?? 'Something went wrong.', type: 'error' })
    }
    setSaving(false)
  }

  const clean = newUsername.trim().toLowerCase().replace(/[^a-z0-9_]/g, '')
  const isValid = clean.length >= 3 && clean.length <= 30
  const changed = clean !== username

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
                Your public @username shown on builds and comments. Only letters, numbers, and underscores.
              </p>
              <div className="settings-input-row">
                <span className="settings-at">@</span>
                <input
                  className="settings-input"
                  type="text"
                  value={newUsername}
                  onChange={e => {
                    setNewUsername(e.target.value)
                    setAlert(null)
                  }}
                  placeholder="yourname"
                  maxLength={30}
                  spellCheck={false}
                />
              </div>
              {newUsername && (
                <p className={`settings-preview ${!isValid ? 'error' : ''}`}>
                  {isValid
                    ? `Will appear as @${clean}`
                    : 'Must be 3–30 characters, letters/numbers/underscores only'}
                </p>
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
                disabled={saving || !isValid || !changed}
              >
                {saving ? 'Saving…' : 'Save Username'}
              </button>
              {username && (
                <Link href={`/u/${username}`} className="btn-secondary" style={{ padding: '11px 28px', fontSize: 13 }}>
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

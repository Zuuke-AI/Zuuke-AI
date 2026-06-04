'use client'

import { useEffect, useState, useRef, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@/lib/supabase'
import SiteNav from '@/components/SiteNav'
import BgCanvas from '@/components/BgCanvas'

type AvailStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'same'

function SettingsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createBrowserClient()

  // ── Load state ─────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState('')
  const [isWelcome, setIsWelcome] = useState(false)

  // Profile
  const [currentUsername, setCurrentUsername] = useState('')
  const [newUsername, setNewUsername] = useState('')
  const [availStatus, setAvailStatus] = useState<AvailStatus>('idle')
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)

  // Account
  const [currentEmail, setCurrentEmail] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPwd, setShowNewPwd] = useState(false)
  const [showConfirmPwd, setShowConfirmPwd] = useState(false)

  // Parts I Own
  const [ownedParts, setOwnedParts] = useState('')
  const [savingParts, setSavingParts] = useState(false)

  // Referral
  const [referralCode, setReferralCode] = useState('')
  const [referralCopied, setReferralCopied] = useState(false)

  // Subscription
  const [subscriptionStatus, setSubscriptionStatus] = useState('free')

  // Danger zone
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [cancellingSub, setCancellingSub] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)

  // Saving states
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingUsername, setSavingUsername] = useState(false)
  const [savingEmail, setSavingEmail] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  // Alert
  const [alert, setAlert] = useState<{ msg: string; type: 'success' | 'error'; section?: string } | null>(null)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  // ── Load ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    setIsWelcome(searchParams.get('welcome') === '1')

    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth?mode=login'); return }

      setUserId(session.user.id)
      setCurrentEmail(session.user.email ?? '')
      setNewEmail(session.user.email ?? '')

      const { data: profile } = await supabase
        .from('profiles')
        .select('username, subscription_status, bio, avatar_url, first_name, owned_parts')
        .eq('id', session.user.id)
        .single()

      if (profile?.subscription_status) setSubscriptionStatus(profile.subscription_status)
      if (profile?.bio) setBio(profile.bio)
      if (profile?.avatar_url) setAvatarUrl(profile.avatar_url)
      if (profile?.owned_parts) setOwnedParts(profile.owned_parts)

      // Fetch/generate referral code
      try {
        const refRes = await fetch('/api/referral', { headers: { Authorization: `Bearer ${session.access_token}` } })
        if (refRes.ok) setReferralCode((await refRes.json()).code)
      } catch { /* noop */ }

      const meta = session.user.user_metadata ?? {}
      const name = profile?.first_name ?? meta.first_name ?? meta.full_name?.split(' ')[0] ?? ''
      setDisplayName(name)

      if (profile?.username) {
        setCurrentUsername(profile.username)
        setNewUsername(profile.username)
      } else {
        // Auto-assign username for existing users
        const rawName = (meta.first_name ?? '') + (meta.last_name ?? meta.full_name?.split(' ').slice(1).join('') ?? '')
        const base = rawName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 18) || 'user'
        const autoUsername = base + Math.random().toString(36).slice(2, 6)
        await supabase.from('profiles').upsert(
          { id: session.user.id, username: autoUsername, subscription_status: profile?.subscription_status ?? 'free', message_count_today: 0 },
          { onConflict: 'id' }
        )
        setCurrentUsername(autoUsername)
        setNewUsername(autoUsername)
      }

      setLoading(false)
    }
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Username availability ──────────────────────────────────────────────────
  const checkAvailability = useCallback(async (value: string, uid: string, current: string) => {
    const clean = value.trim().toLowerCase().replace(/[^a-z0-9_]/g, '')
    if (!clean || clean.length < 3 || clean.length > 30) { setAvailStatus(clean.length > 0 ? 'invalid' : 'idle'); return }
    if (clean === current) { setAvailStatus('same'); return }
    setAvailStatus('checking')
    try {
      const res = await fetch(`/api/profile/username?check=${encodeURIComponent(clean)}&userId=${uid}`)
      setAvailStatus((await res.json()).available ? 'available' : 'taken')
    } catch { setAvailStatus('idle') }
  }, [])

  function handleUsernameChange(value: string) {
    setNewUsername(value)
    setAvailStatus('idle')
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => checkAvailability(value, userId, currentUsername), 500)
  }

  // ── Save username ──────────────────────────────────────────────────────────
  async function saveUsername() {
    if (availStatus === 'taken' || !userId) return
    setSavingUsername(true)
    setAlert(null)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const res = await fetch('/api/profile/username', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ username: newUsername.trim() }),
    })
    const data = await res.json()
    if (res.ok) {
      setCurrentUsername(data.username)
      setNewUsername(data.username)
      setAvailStatus('same')
      setIsWelcome(false)
      setAlert({ msg: '✓ Username saved!', type: 'success', section: 'username' })
    } else {
      setAlert({ msg: data.error ?? 'Something went wrong.', type: 'error', section: 'username' })
    }
    setSavingUsername(false)
  }

  // ── Avatar upload ──────────────────────────────────────────────────────────
  function handleAvatarSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { window.alert('Avatar must be under 5MB.'); return }
    setAvatarFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  async function uploadAvatar(): Promise<string | null> {
    if (!avatarFile) return avatarUrl || null
    setUploadingAvatar(true)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setUploadingAvatar(false); return null }

    const form = new FormData()
    form.append('file', avatarFile)

    const res = await fetch('/api/storage/upload-avatar', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
      body: form,
    })

    setUploadingAvatar(false)

    if (!res.ok) {
      const json = await res.json()
      setAvatarFile(null)
      setAvatarPreview(null)
      setAlert({ msg: `Avatar upload failed: ${json.error ?? 'Unknown error'}`, type: 'error', section: 'profile' })
      return null
    }

    const { url } = await res.json()
    return url
  }

  // ── Save profile (bio + avatar + display name) ─────────────────────────────
  async function saveProfile() {
    setSavingProfile(true)
    setAlert(null)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    let finalAvatarUrl = avatarUrl
    if (avatarFile) {
      const url = await uploadAvatar()
      if (!url) { setSavingProfile(false); return }
      finalAvatarUrl = url
      setAvatarUrl(url)
    }

    const res = await fetch('/api/profile/update', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ bio, avatar_url: finalAvatarUrl, first_name: displayName }),
    })
    if (res.ok) {
      setAvatarFile(null)
      setAvatarPreview(null)
      setAlert({ msg: '✓ Profile updated!', type: 'success', section: 'profile' })
    } else {
      const json = await res.json()
      setAlert({ msg: json.error ?? 'Failed to update profile.', type: 'error', section: 'profile' })
    }
    setSavingProfile(false)
  }

  // ── Save owned parts ───────────────────────────────────────────────────────
  async function saveOwnedParts() {
    setSavingParts(true)
    setAlert(null)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const res = await fetch('/api/profile/update', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ owned_parts: ownedParts }),
    })
    if (res.ok) {
      setAlert({ msg: '✓ Parts saved! Zuuke will now build around what you own.', type: 'success', section: 'parts' })
    } else {
      setAlert({ msg: 'Failed to save.', type: 'error', section: 'parts' })
    }
    setSavingParts(false)
  }

  async function copyReferralLink() {
    const link = `https://zuuke.shop/auth?ref=${referralCode}`
    try {
      await navigator.clipboard.writeText(link)
      setReferralCopied(true)
      setTimeout(() => setReferralCopied(false), 2500)
    } catch { /* clipboard unavailable — button stays at default label */ }
  }

  // ── Change email ───────────────────────────────────────────────────────────
  async function changeEmail() {
    if (!newEmail || newEmail === currentEmail) return
    setSavingEmail(true)
    setAlert(null)
    const { error } = await supabase.auth.updateUser({ email: newEmail })
    if (error) {
      setAlert({ msg: error.message, type: 'error', section: 'account' })
    } else {
      setAlert({ msg: '✓ Confirmation sent to both addresses. Check your inbox to confirm the change.', type: 'success', section: 'account' })
    }
    setSavingEmail(false)
  }

  // ── Change password ────────────────────────────────────────────────────────
  async function changePassword() {
    if (newPassword.length < 8) { setAlert({ msg: 'Password must be at least 8 characters.', type: 'error', section: 'account' }); return }
    if (newPassword !== confirmPassword) { setAlert({ msg: 'Passwords do not match.', type: 'error', section: 'account' }); return }
    setSavingPassword(true)
    setAlert(null)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) {
      setAlert({ msg: error.message, type: 'error', section: 'account' })
    } else {
      setNewPassword('')
      setConfirmPassword('')
      setAlert({ msg: '✓ Password updated successfully!', type: 'success', section: 'account' })
    }
    setSavingPassword(false)
  }

  // ── Cancel subscription ────────────────────────────────────────────────────
  async function cancelSubscription() {
    setCancellingSub(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const res = await fetch('/api/profile/delete-account', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    if (res.ok) {
      setSubscriptionStatus('free')
      setShowCancelConfirm(false)
      setAlert({ msg: '✓ Subscription cancelled. You\'re now on the free plan.', type: 'success', section: 'sub' })
    } else {
      setAlert({ msg: (await res.json()).error ?? 'Failed to cancel.', type: 'error', section: 'sub' })
    }
    setCancellingSub(false)
  }

  // ── Delete account ─────────────────────────────────────────────────────────
  async function deleteAccount() {
    if (deleteConfirm !== 'DELETE') return
    setDeleting(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const res = await fetch('/api/profile/delete-account', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    if (res.ok) {
      await supabase.auth.signOut()
      router.push('/?deleted=1')
    } else {
      setAlert({ msg: (await res.json()).error ?? 'Failed to delete account.', type: 'error' })
      setDeleting(false)
      setShowDeleteModal(false)
    }
  }

  // ── Derived ────────────────────────────────────────────────────────────────
  const uClean = newUsername.trim().toLowerCase().replace(/[^a-z0-9_]/g, '')
  const usernameChanged = uClean !== currentUsername
  const canSaveUsername = uClean.length >= 3 && uClean.length <= 30 && usernameChanged &&
    availStatus !== 'taken' && availStatus !== 'checking' && availStatus !== 'invalid' && !savingUsername

  function statusBadge() {
    if (availStatus === 'checking') return <span className="avail-checking">⏳ Checking…</span>
    if (availStatus === 'available') return <span className="avail-ok">✓ Available</span>
    if (availStatus === 'taken') return <span className="avail-taken">✗ Already taken</span>
    if (availStatus === 'same') return <span className="avail-ok">✓ Current username</span>
    if (availStatus === 'invalid') return <span className="avail-invalid">3–30 chars, letters/numbers/underscores only</span>
    return null
  }

  const previewUrl = avatarPreview ?? (avatarUrl || null)
  const avatarInitial = (displayName || currentUsername || 'U')[0].toUpperCase()

  if (loading) return (
    <>
      <BgCanvas opacity={0.2} particleCount={40} connectDistance={80} />
      <SiteNav />
      <div style={{ paddingTop: 160, textAlign: 'center', color: 'var(--mist)' }}>Loading…</div>
    </>
  )

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

          {isWelcome && (
            <div className="settings-welcome-banner">
              <strong>Welcome to Zuuke!</strong> You&apos;ve been assigned <code>@{currentUsername}</code> — change it below anytime.
            </div>
          )}

          {/* ── Profile card ── */}
          <div className="settings-card">
            <h2 className="settings-section-title">Public Profile</h2>

            {/* Avatar */}
            <div className="settings-avatar-row">
              <div className="settings-avatar-preview" onClick={() => avatarInputRef.current?.click()}>
                {previewUrl ? (
                  <img src={previewUrl} alt="avatar" className="settings-avatar-img" />
                ) : (
                  <span className="settings-avatar-initial">{avatarInitial}</span>
                )}
                <div className="settings-avatar-overlay">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                </div>
              </div>
              <div>
                <div className="settings-avatar-hint">Click to upload a profile photo</div>
                <div className="settings-avatar-sub">JPG, PNG, WEBP · Max 5MB</div>
              </div>
              <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handleAvatarSelect} />
            </div>

            <div className="form-group" style={{ marginTop: 20 }}>
              <label className="settings-label">Display Name</label>
              <input
                className="form-input"
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="Your name"
                maxLength={50}
              />
            </div>

            <div className="form-group" style={{ marginTop: 16 }}>
              <label className="settings-label">Bio</label>
              <textarea
                className="settings-textarea"
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder="Tell the community about yourself — your setup, what you build, your gaming style…"
                maxLength={200}
                rows={3}
              />
              <div style={{ fontSize: 10, color: 'var(--mist)', textAlign: 'right', marginTop: 4, fontFamily: 'var(--font-mono)' }}>{bio.length}/200</div>
            </div>

            {alert?.section === 'profile' && (
              <div className={`settings-alert ${alert.type}`}>{alert.msg}</div>
            )}

            <div className="settings-actions" style={{ marginTop: 8 }}>
              <button className="btn-primary" style={{ padding: '12px 32px', fontSize: 13 }} onClick={saveProfile} disabled={savingProfile || uploadingAvatar}>
                {uploadingAvatar ? 'Uploading…' : savingProfile ? 'Saving…' : 'Save Profile'}
              </button>
              {currentUsername && (
                <Link href={`/u/${currentUsername}`} className="btn-secondary" style={{ padding: '11px 28px', fontSize: 13 }}>
                  View Profile →
                </Link>
              )}
            </div>
          </div>

          {/* ── Username card ── */}
          <div className="settings-card" style={{ marginTop: 12 }}>
            <h2 className="settings-section-title">Username</h2>
            <p className="settings-hint">Your public @handle — shown on builds and comments. Unique to you.</p>

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
            {newUsername.length > 0 && <div className="settings-avail-row">{statusBadge()}</div>}

            {alert?.section === 'username' && (
              <div className={`settings-alert ${alert.type}`}>{alert.msg}</div>
            )}

            <div className="settings-actions" style={{ marginTop: 16 }}>
              <button className="btn-primary" style={{ padding: '12px 32px', fontSize: 13 }} onClick={saveUsername} disabled={!canSaveUsername}>
                {savingUsername ? 'Saving…' : 'Save Username'}
              </button>
            </div>
          </div>

          {/* ── Account / Email + Password ── */}
          <div className="settings-card" style={{ marginTop: 12 }}>
            <h2 className="settings-section-title">Account</h2>

            <div className="form-group">
              <label className="settings-label">Email Address</label>
              <input
                className="form-input"
                type="email"
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                autoComplete="email"
              />
              <div className="settings-hint" style={{ marginTop: 6 }}>Changing your email sends a confirmation to both addresses.</div>
            </div>

            {alert?.section === 'account' && (
              <div className={`settings-alert ${alert.type}`}>{alert.msg}</div>
            )}

            <div className="settings-actions">
              <button
                className="btn-primary"
                style={{ padding: '12px 32px', fontSize: 13 }}
                onClick={changeEmail}
                disabled={savingEmail || !newEmail || newEmail === currentEmail}
              >
                {savingEmail ? 'Sending…' : 'Update Email'}
              </button>
            </div>

            <div style={{ borderTop: '1px solid var(--border)', margin: '28px 0 24px' }} />

            <div className="form-group">
              <label className="settings-label">New Password</label>
              <div className="input-wrap">
                <input
                  className="form-input"
                  type={showNewPwd ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  autoComplete="new-password"
                />
                <button className="pwd-toggle" type="button" onClick={() => setShowNewPwd(p => !p)} tabIndex={-1}>
                  {showNewPwd
                    ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  }
                </button>
              </div>
            </div>
            <div className="form-group">
              <label className="settings-label">Confirm New Password</label>
              <div className="input-wrap">
                <input
                  className="form-input"
                  type={showConfirmPwd ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Repeat password"
                  autoComplete="new-password"
                />
                <button className="pwd-toggle" type="button" onClick={() => setShowConfirmPwd(p => !p)} tabIndex={-1}>
                  {showConfirmPwd
                    ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  }
                </button>
              </div>
            </div>
            <button
              className="btn-primary"
              style={{ padding: '12px 32px', fontSize: 13 }}
              onClick={changePassword}
              disabled={savingPassword || !newPassword || !confirmPassword}
            >
              {savingPassword ? 'Updating…' : 'Update Password'}
            </button>
          </div>

          {/* ── Parts I Own ── */}
          <div className="settings-card" style={{ marginTop: 12 }}>
            <h2 className="settings-section-title">Parts I Own</h2>
            <p className="settings-hint">Tell Zuuke what hardware you already have. It will build around your existing parts instead of recommending them again.</p>
            <div className="form-group" style={{ marginTop: 14 }}>
              <textarea
                className="settings-textarea"
                value={ownedParts}
                onChange={e => setOwnedParts(e.target.value)}
                placeholder={`List your current parts, e.g:\nCPU: Intel i7-9700K\nGPU: RTX 2070\nRAM: 16GB DDR4-3200\nMotherboard: ASUS Z390-F\nCase: NZXT H510\nPSU: Corsair RM650x`}
                rows={6}
                maxLength={1000}
              />
              <div style={{ fontSize: 10, color: 'var(--mist)', textAlign: 'right', marginTop: 4, fontFamily: 'var(--font-mono)' }}>{ownedParts.length}/1000</div>
            </div>
            {alert?.section === 'parts' && (
              <div className={`settings-alert ${alert.type}`}>{alert.msg}</div>
            )}
            <button className="btn-primary" style={{ padding: '12px 32px', fontSize: 13, marginTop: 8 }} onClick={saveOwnedParts} disabled={savingParts}>
              {savingParts ? 'Saving…' : 'Save My Parts'}
            </button>
          </div>

          {/* ── Referral ── */}
          {referralCode && (
            <div className="settings-card" style={{ marginTop: 12 }}>
              <h2 className="settings-section-title">Refer a Friend</h2>
              <p className="settings-hint">Share your link. When someone signs up through it, they'll be credited to you — and you'll both be recognized in the community.</p>
              <div className="settings-input-row" style={{ marginTop: 14 }}>
                <input
                  className="settings-input"
                  type="text"
                  value={`zuuke.shop/auth?ref=${referralCode}`}
                  readOnly
                  onClick={e => (e.target as HTMLInputElement).select()}
                  style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}
                />
              </div>
              <button className="btn-secondary" style={{ padding: '10px 24px', fontSize: 12, marginTop: 12 }} onClick={copyReferralLink}>
                {referralCopied ? '✓ Copied!' : 'Copy Referral Link'}
              </button>
            </div>
          )}

          {/* ── Subscription ── */}
          <div className="settings-card" style={{ marginTop: 12 }}>
            <h2 className="settings-section-title">Subscription</h2>
            <div className="settings-field">
              <label className="settings-label">Current Plan</label>
              <div className="settings-value">
                {subscriptionStatus === 'pro'
                  ? <span style={{ color: 'var(--cyan)' }}>● Pro — Unlimited builds</span>
                  : <span style={{ color: 'var(--mist)' }}>● Free — 10 builds/day</span>}
              </div>
            </div>
            {alert?.section === 'sub' && <div className={`settings-alert ${alert.type}`}>{alert.msg}</div>}
            {subscriptionStatus === 'pro' ? (
              !showCancelConfirm ? (
                <button className="btn-secondary" style={{ padding: '11px 28px', fontSize: 13 }} onClick={() => setShowCancelConfirm(true)}>
                  Cancel Subscription
                </button>
              ) : (
                <div>
                  <p className="settings-hint" style={{ color: 'var(--danger)', marginBottom: 12 }}>Are you sure? You&apos;ll lose Pro access immediately.</p>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button className="btn-danger" onClick={cancelSubscription} disabled={cancellingSub}>{cancellingSub ? 'Cancelling…' : 'Yes, Cancel'}</button>
                    <button className="btn-secondary" style={{ padding: '10px 20px', fontSize: 12 }} onClick={() => setShowCancelConfirm(false)}>Keep Pro</button>
                  </div>
                </div>
              )
            ) : (
              <Link href="/chat" className="btn-primary" style={{ display: 'inline-flex', padding: '12px 32px', fontSize: 13 }}>
                Upgrade to Pro →
              </Link>
            )}
          </div>

          {/* ── Danger zone ── */}
          <div className="settings-card settings-danger-zone" style={{ marginTop: 12 }}>
            <h2 className="settings-section-title" style={{ color: 'var(--danger)' }}>Danger Zone</h2>
            <p className="settings-hint">
              Permanently deletes your account, all builds, comments, and data.
              {subscriptionStatus === 'pro' && ' Active subscription will be cancelled.'}{' '}
              <strong>Cannot be undone.</strong>
            </p>
            <button className="btn-danger" style={{ marginTop: 16 }} onClick={() => { setShowDeleteModal(true); setDeleteConfirm('') }}>
              Delete My Account
            </button>
          </div>

        </div>
      </div>

      {/* ── Delete modal ── */}
      {showDeleteModal && (
        <div className="delete-modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowDeleteModal(false) }}>
          <div className="delete-modal">
            <div className="delete-modal-title">DELETE ACCOUNT</div>
            <div className="delete-modal-body">
              This will permanently erase your account, builds, comments, and all data.
              {subscriptionStatus === 'pro' && ' Your Pro subscription will be cancelled.'}
              <br /><br />Type <strong>DELETE</strong> to confirm.
            </div>
            <input className="form-input" type="text" placeholder="Type DELETE to confirm" value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)} style={{ marginBottom: 20 }} />
            <div className="delete-modal-actions">
              <button className="btn-danger" onClick={deleteAccount} disabled={deleteConfirm !== 'DELETE' || deleting}>
                {deleting ? 'Deleting…' : 'Permanently Delete'}
              </button>
              <button className="btn-secondary" style={{ padding: '10px 24px', fontSize: 12 }} onClick={() => setShowDeleteModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <footer style={{ position: 'relative', zIndex: 1 }}>
        <div className="footer-logo">ZUUKE<span>.</span></div>
        <div className="footer-text">© 2026 Zuuke AI · All rights reserved</div>
        <div className="footer-links">
          <Link href="/about">About Us</Link><Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link><Link href="/affiliate">Affiliate Disclosure</Link>
        </div>
      </footer>
    </>
  )
}

export default function SettingsPage() {
  return <Suspense><SettingsContent /></Suspense>
}

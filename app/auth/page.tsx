'use client'

import { useEffect, useState, useRef, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import BgCanvas from '@/components/BgCanvas'
import { createBrowserClient } from '@/lib/supabase'

const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)

function AuthForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createBrowserClient()

  const [mode, setMode] = useState<'signup' | 'login'>(
    searchParams.get('mode') === 'login' ? 'login' : 'signup'
  )
  const [loading, setLoading] = useState(false)
  const [alert, setAlert] = useState<{ msg: string; type: 'error' | 'success' } | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [showPwd, setShowPwd] = useState(false)
  const [showLoginPwd, setShowLoginPwd] = useState(false)

  // Signup fields
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [signupUsername, setSignupUsername] = useState('')
  const [signupEmail, setSignupEmail] = useState('')
  const [signupPassword, setSignupPassword] = useState('')

  // Login fields — email OR username
  const [loginIdentifier, setLoginIdentifier] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  // Username availability
  type AvailStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid'
  const [availStatus, setAvailStatus] = useState<AvailStatus>('idle')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Field errors
  const [errors, setErrors] = useState<Record<string, boolean>>({})

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.push('/')
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const switchMode = (m: 'signup' | 'login') => {
    setMode(m)
    setAlert(null)
    setErrors({})
    setAvailStatus('idle')
    const url = new URL(window.location.href)
    url.searchParams.set('mode', m)
    window.history.replaceState({}, '', url)
  }

  // ── Username availability check ───────────────────────────────────────────

  const checkAvailability = useCallback(async (value: string) => {
    const clean = value.trim().toLowerCase().replace(/[^a-z0-9_]/g, '')
    if (!clean || clean.length < 3 || clean.length > 30) {
      setAvailStatus(clean.length > 0 ? 'invalid' : 'idle')
      return
    }
    setAvailStatus('checking')
    try {
      const res = await fetch(`/api/profile/username?check=${encodeURIComponent(clean)}`)
      const data = await res.json()
      setAvailStatus(data.available ? 'available' : 'taken')
    } catch {
      setAvailStatus('idle')
    }
  }, [])

  function handleUsernameInput(value: string) {
    setSignupUsername(value)
    setAvailStatus('idle')
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => checkAvailability(value), 500)
  }

  // ── Sign up ───────────────────────────────────────────────────────────────

  const handleSignup = async () => {
    const errs: Record<string, boolean> = {}
    if (!firstName.trim()) errs.firstName = true
    if (!lastName.trim()) errs.lastName = true
    const uClean = signupUsername.trim().toLowerCase().replace(/[^a-z0-9_]/g, '')
    if (uClean.length < 3 || uClean.length > 30 || availStatus === 'taken' || availStatus === 'invalid') {
      errs.signupUsername = true
    }
    if (!isEmail(signupEmail)) errs.signupEmail = true
    if (signupPassword.length < 8) errs.signupPassword = true
    setErrors(errs)
    if (Object.keys(errs).length) return

    if (availStatus === 'checking') {
      setAlert({ msg: 'Still checking username availability — please wait a moment.', type: 'error' })
      return
    }

    setLoading(true)
    try {
      const refCode = searchParams.get('ref')?.toUpperCase() ?? null
      const { data, error } = await supabase.auth.signUp({
        email: signupEmail,
        password: signupPassword,
        options: {
          data: { first_name: firstName.trim(), last_name: lastName.trim() },
          emailRedirectTo: window.location.origin + '/auth/callback',
        },
      })
      if (error) throw error

      if (data.user) {
        const { error: profileError } = await supabase.from('profiles').upsert(
          {
            id: data.user.id,
            username: uClean,
            first_name: firstName.trim(),
            subscription_status: 'free',
            message_count_today: 0,
            ...(refCode ? { referred_by: refCode } : {}),
          },
          { onConflict: 'id', ignoreDuplicates: false }
        )
        if (profileError) {
          // Profile creation failed (likely RLS with unconfirmed session).
          // Store intent in localStorage so the callback can finish setup.
          localStorage.setItem('pending_profile', JSON.stringify({
            username: uClean,
            first_name: firstName.trim(),
            ref: refCode,
          }))
        }
      }

      setShowSuccess(true)
    } catch (err) {
      setAlert({ msg: (err as Error).message || 'Something went wrong.', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  // ── Log in ────────────────────────────────────────────────────────────────

  const handleLogin = async () => {
    const errs: Record<string, boolean> = {}
    if (!loginIdentifier.trim()) errs.loginIdentifier = true
    if (!loginPassword) errs.loginPassword = true
    setErrors(errs)
    if (Object.keys(errs).length) return

    setLoading(true)
    try {
      let email = loginIdentifier.trim()

      // If not an email, look up the email by username
      if (!isEmail(email)) {
        const clean = email.toLowerCase().replace(/^@/, '').replace(/[^a-z0-9_]/g, '')
        const res = await fetch(`/api/profile/lookup?username=${encodeURIComponent(clean)}`)
        if (!res.ok) {
          throw new Error('Username not found. Try logging in with your email address instead.')
        }
        const json = await res.json()
        email = json.email
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email, password: loginPassword })
      if (error) throw error

      if (searchParams.get('next') === 'upgrade' && data.session) {
        const res = await fetch('/api/create-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session.access_token}` },
        })
        const json = await res.json()
        if (json.url) { window.location.href = json.url; return }
      }
      router.push('/')
    } catch (err) {
      setAlert({ msg: (err as Error).message || 'Invalid credentials.', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  // ── Forgot password ───────────────────────────────────────────────────────

  const handleForgot = async (e: React.MouseEvent) => {
    e.preventDefault()
    const email = loginIdentifier.trim()
    if (!isEmail(email)) {
      setErrors({ loginIdentifier: true })
      setAlert({ msg: 'Enter your email address first, then click Forgot Password.', type: 'error' })
      return
    }
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/auth?mode=login',
    })
    setAlert({ msg: 'Password reset email sent! Check your inbox.', type: 'success' })
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter') return
    mode === 'login' ? handleLogin() : handleSignup()
  }

  function usernameStatus() {
    if (availStatus === 'checking') return <span className="avail-checking">⏳ Checking…</span>
    if (availStatus === 'available') return <span className="avail-ok">✓ Available</span>
    if (availStatus === 'taken') return <span className="avail-taken">✗ Already taken</span>
    if (availStatus === 'invalid') return <span className="avail-invalid">3–30 chars, letters / numbers / underscores only</span>
    return null
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="auth-layout" onKeyDown={onKeyDown}>
      {/* Left panel */}
      <div className="auth-left">
        <Link href="/" className="auth-logo">
          <div className="logo-mark">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <rect x="2" y="3" width="20" height="14" rx="1"/><path d="M8 21h8M12 17v4"/>
            </svg>
          </div>
          <div className="logo-name">ZUUKE<span>.</span></div>
        </Link>
        <div className="auth-hero-text">
          <div className="auth-hero-title">
            <span className="t1">YOUR PERFECT</span>
            <span className="t2">PC BUILD</span>
          </div>
          <p className="auth-hero-sub">Create your free account and get instant access to AI-powered PC build recommendations, saved build history, and expert guidance — all in one place.</p>
        </div>
        <div className="auth-testimonial">
          <div className="testimonial-text">&ldquo;Zuuke specced my entire $1,400 editing build in under a minute. I would have spent three weekends on Reddit doing this myself.&rdquo;</div>
          <div className="testimonial-author">
            <div className="testimonial-avatar">JM</div>
            <div className="testimonial-name">Jake M. · Video Editor</div>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="auth-right">
        <div className="auth-box">
          <div className="auth-tabs">
            <button className={`auth-tab${mode === 'signup' ? ' active' : ''}`} onClick={() => switchMode('signup')}>Sign Up</button>
            <button className={`auth-tab${mode === 'login' ? ' active' : ''}`} onClick={() => switchMode('login')}>Log In</button>
          </div>

          {alert && <div className={`auth-alert ${alert.type} show`}>{alert.msg}</div>}

          {/* ── SIGN UP ── */}
          {mode === 'signup' && !showSuccess && (
            <div>
              <div className="auth-heading">CREATE ACCOUNT</div>
              <div className="auth-subheading">// Free forever · No credit card needed</div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">First Name</label>
                  <input
                    className={`form-input${errors.firstName ? ' error' : ''}`}
                    type="text"
                    placeholder="Alex"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    autoComplete="given-name"
                  />
                  {errors.firstName && <div className="form-error show">Required</div>}
                </div>
                <div className="form-group">
                  <label className="form-label">Last Name</label>
                  <input
                    className={`form-input${errors.lastName ? ' error' : ''}`}
                    type="text"
                    placeholder="Chen"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    autoComplete="family-name"
                  />
                  {errors.lastName && <div className="form-error show">Required</div>}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Username</label>
                <div className={`settings-input-row${availStatus === 'taken' || availStatus === 'invalid' ? ' error' : availStatus === 'available' ? ' ok' : ''}`} style={{ marginBottom: 0 }}>
                  <span className="settings-at">@</span>
                  <input
                    className="settings-input"
                    type="text"
                    placeholder="yourname"
                    value={signupUsername}
                    onChange={(e) => handleUsernameInput(e.target.value)}
                    maxLength={30}
                    spellCheck={false}
                    autoComplete="off"
                  />
                </div>
                {signupUsername.length > 0 && (
                  <div className="settings-avail-row" style={{ marginTop: 5 }}>{usernameStatus()}</div>
                )}
                {errors.signupUsername && availStatus !== 'taken' && availStatus !== 'invalid' && (
                  <div className="form-error show">Choose a valid username (3–30 chars)</div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  className={`form-input${errors.signupEmail ? ' error' : ''}`}
                  type="email"
                  placeholder="you@example.com"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  autoComplete="email"
                />
                {errors.signupEmail && <div className="form-error show">Enter a valid email</div>}
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <div className="input-wrap">
                  <input
                    className={`form-input${errors.signupPassword ? ' error' : ''}`}
                    type={showPwd ? 'text' : 'password'}
                    placeholder="Min. 8 characters"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                  <button className="pwd-toggle" type="button" onClick={() => setShowPwd(!showPwd)} tabIndex={-1}>
                    {showPwd
                      ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    }
                  </button>
                </div>
                <div className="form-hint">At least 8 characters</div>
                {errors.signupPassword && <div className="form-error show">Password must be at least 8 characters</div>}
              </div>

              <button
                className={`submit-btn${loading ? ' loading' : ''}`}
                onClick={handleSignup}
                disabled={loading || availStatus === 'taken' || availStatus === 'checking'}
              >
                <span className="btn-text">Create Free Account →</span>
                <div className="btn-spinner" />
              </button>
              <div className="terms-note">
                By signing up you agree to our <Link href="/terms">Terms of Service</Link> and <Link href="/privacy">Privacy Policy</Link>.
              </div>
            </div>
          )}

          {mode === 'signup' && showSuccess && (
            <div className="success-state">
              <div className="success-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <div className="success-title">CHECK YOUR EMAIL</div>
              <div className="success-text">
                We sent a confirmation link to <strong>{signupEmail}</strong>.<br />
                Click it to activate your account.
              </div>
            </div>
          )}

          {/* ── LOG IN ── */}
          {mode === 'login' && (
            <div>
              <div className="auth-heading">WELCOME BACK</div>
              <div className="auth-subheading">// Sign in to your Zuuke account</div>

              <div className="form-group">
                <label className="form-label">Email or Username</label>
                <input
                  className={`form-input${errors.loginIdentifier ? ' error' : ''}`}
                  type="text"
                  placeholder="you@example.com or yourname"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  autoComplete="username"
                />
                {errors.loginIdentifier && <div className="form-error show">Required</div>}
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <a href="#" className="forgot-link" onClick={handleForgot}>Forgot password?</a>
                <div className="input-wrap">
                  <input
                    className={`form-input${errors.loginPassword ? ' error' : ''}`}
                    type={showLoginPwd ? 'text' : 'password'}
                    placeholder="Your password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                  <button className="pwd-toggle" type="button" onClick={() => setShowLoginPwd(!showLoginPwd)} tabIndex={-1}>
                    {showLoginPwd
                      ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    }
                  </button>
                </div>
                {errors.loginPassword && <div className="form-error show">Required</div>}
              </div>

              <button
                className={`submit-btn${loading ? ' loading' : ''}`}
                onClick={handleLogin}
                disabled={loading}
              >
                <span className="btn-text">Sign In →</span>
                <div className="btn-spinner" />
              </button>
              <div className="auth-footer-text" style={{ marginTop: 20 }}>
                Don&apos;t have an account?{' '}
                <a href="#" onClick={(e) => { e.preventDefault(); switchMode('signup') }}>Sign up free</a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AuthPage() {
  return (
    <>
      <BgCanvas opacity={0.35} particleCount={60} />
      <Suspense>
        <AuthForm />
      </Suspense>
    </>
  )
}

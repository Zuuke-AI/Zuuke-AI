'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import BgCanvas from '@/components/BgCanvas'
import { createBrowserClient } from '@/lib/supabase'

function ResetForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createBrowserClient()

  const [ready, setReady] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [alert, setAlert] = useState<{ msg: string; type: 'error' | 'success' } | null>(null)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [errors, setErrors] = useState<Record<string, boolean>>({})

  useEffect(() => {
    async function init() {
      const code = searchParams.get('code')
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) {
          setAlert({ msg: 'This reset link has expired or already been used. Please request a new one.', type: 'error' })
          return
        }
      }
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setAlert({ msg: 'No valid session. Please request a new password reset link.', type: 'error' })
        return
      }
      setReady(true)
    }
    init()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleReset = async () => {
    const errs: Record<string, boolean> = {}
    if (password.length < 8) errs.password = true
    if (password !== confirm) errs.confirm = true
    setErrors(errs)
    if (Object.keys(errs).length) return

    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setDone(true)
    } catch (err) {
      setAlert({ msg: (err as Error).message || 'Something went wrong.', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-layout">
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
            <span className="t1">RESET YOUR</span>
            <span className="t2">PASSWORD</span>
          </div>
          <p className="auth-hero-sub">Choose a new secure password for your Zuuke account.</p>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-box">
          {alert && <div className={`auth-alert ${alert.type} show`}>{alert.msg}</div>}

          {!done && !ready && !alert && (
            <div style={{ color: 'var(--mist)', fontFamily: 'var(--font-mono, monospace)', fontSize: 13, letterSpacing: '0.1em', padding: '40px 0' }}>
              Verifying reset link…
            </div>
          )}

          {!done && !ready && alert && (
            <div className="auth-footer-text" style={{ marginTop: 20 }}>
              <a href="/auth?mode=login" onClick={(e) => { e.preventDefault(); router.push('/auth?mode=login') }}>← Back to login</a>
            </div>
          )}

          {!done && ready && (
            <div>
              <div className="auth-heading">SET NEW PASSWORD</div>
              <div className="auth-subheading">// Choose a secure password for your account</div>

              <div className="form-group">
                <label className="form-label">New Password</label>
                <div className="input-wrap">
                  <input
                    className={`form-input${errors.password ? ' error' : ''}`}
                    type={showPwd ? 'text' : 'password'}
                    placeholder="Min. 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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
                {errors.password && <div className="form-error show">Password must be at least 8 characters</div>}
              </div>

              <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <input
                  className={`form-input${errors.confirm ? ' error' : ''}`}
                  type={showPwd ? 'text' : 'password'}
                  placeholder="Repeat your new password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                />
                {errors.confirm && <div className="form-error show">Passwords do not match</div>}
              </div>

              <button
                className={`submit-btn${loading ? ' loading' : ''}`}
                onClick={handleReset}
                disabled={loading}
              >
                <span className="btn-text">Update Password →</span>
                <div className="btn-spinner" />
              </button>
            </div>
          )}

          {done && (
            <div className="success-state">
              <div className="success-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <div className="success-title">PASSWORD UPDATED</div>
              <div className="success-text">Your password has been changed successfully.</div>
              <button className="submit-btn" style={{ marginTop: 24 }} onClick={() => router.push('/auth?mode=login')}>
                <span className="btn-text">Sign In →</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ResetPage() {
  return (
    <>
      <BgCanvas opacity={0.35} particleCount={60} />
      <Suspense>
        <ResetForm />
      </Suspense>
    </>
  )
}

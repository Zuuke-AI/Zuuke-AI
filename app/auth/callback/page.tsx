'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'

function CallbackHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createBrowserClient()

  useEffect(() => {
    async function handle() {
      const code = searchParams.get('code')
      const errorParam = searchParams.get('error')

      if (errorParam) {
        router.replace('/auth?error=' + encodeURIComponent(errorParam))
        return
      }

      // PKCE flow — exchange the code for a session
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) {
          router.replace('/auth?error=oauth_failed')
          return
        }
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.replace('/auth?error=no_session')
        return
      }

      // Check if user has a username already
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', session.user.id)
        .single()

      // Helper: fire-and-forget welcome email (non-blocking)
      const accessToken = session.access_token
      const sendWelcome = () => {
        fetch('/api/auth/welcome', {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}` },
        }).catch(() => { /* noop */ })
      }

      if (!profile?.username) {
        // ── New OAuth user ──────────────────────────────────────────────────
        const meta = session.user.user_metadata ?? {}
        const rawName =
          meta.full_name ?? meta.name ?? meta.given_name ?? meta.preferred_username ?? 'user'
        const base = String(rawName).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 18) || 'user'
        const suffix = Math.random().toString(36).slice(2, 6)
        const autoUsername = base + suffix

        await supabase.from('profiles').upsert(
          {
            id: session.user.id,
            username: autoUsername,
            subscription_status: 'free',
            message_count_today: 0,
          },
          { onConflict: 'id' }
        )

        // Send welcome email to new OAuth user
        sendWelcome()

        // Send them to settings so they can customise the auto-assigned username
        router.replace('/settings?welcome=1')
        return
      }

      // ── Returning user OR first email confirmation ──────────────────────
      // If the account is <24 h old and we arrived here with a code, this is
      // the first email-confirmation click — send the welcome email.
      const accountAgeMs = Date.now() - new Date(session.user.created_at).getTime()
      if (code && accountAgeMs < 24 * 60 * 60 * 1000) {
        sendWelcome()
      }

      router.replace('/chat')
    }

    handle()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        color: 'var(--mist)',
        fontFamily: 'var(--font-mono, monospace)',
        fontSize: 13,
        letterSpacing: '0.1em',
      }}
    >
      Signing you in…
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            color: 'var(--mist)',
            fontFamily: 'var(--font-mono, monospace)',
            fontSize: 13,
            letterSpacing: '0.1em',
          }}
        >
          Loading…
        </div>
      }
    >
      <CallbackHandler />
    </Suspense>
  )
}

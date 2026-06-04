'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@/lib/supabase'

export default function JoinBanner() {
  const [show, setShow] = useState(false)
  const supabase = createBrowserClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) setShow(true)
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (!show) return null

  return (
    <div className="community-join-banner">
      <div className="cjb-left">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, color: 'var(--cyan)' }}>
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
        <span>Join the community — post your builds, vote, and follow other builders.</span>
      </div>
      <div className="cjb-right">
        <Link href="/auth?mode=signup" className="cjb-btn">Create Free Account →</Link>
        <button className="cjb-dismiss" onClick={() => setShow(false)} aria-label="Dismiss">✕</button>
      </div>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'

interface MarkBuiltButtonProps {
  buildId: string
  buildOwnerId: string | null
  initialIsBuilt: boolean
}

export default function MarkBuiltButton({ buildId, buildOwnerId, initialIsBuilt }: MarkBuiltButtonProps) {
  const [isOwner, setIsOwner] = useState(false)
  const [isBuilt, setIsBuilt] = useState(initialIsBuilt)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const supabase = createBrowserClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && session.user.id === buildOwnerId) {
        setIsOwner(true)
        setToken(session.access_token)
      }
      setLoading(false)
    })
  }, [buildOwnerId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function toggle() {
    if (toggling || !token) return
    setToggling(true)
    const next = !isBuilt
    setIsBuilt(next)
    try {
      await fetch(`/api/builds/${buildId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ is_built: next }),
      })
    } catch {
      setIsBuilt(!next)
    }
    setToggling(false)
  }

  if (loading || !isOwner) return null

  return (
    <button
      className={`mark-built-btn${isBuilt ? ' built' : ''}`}
      onClick={toggle}
      disabled={toggling}
      title={isBuilt ? 'Mark as not built' : 'Mark as built — I have this PC!'}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
      </svg>
      {toggling ? '…' : isBuilt ? 'Built ✓' : 'Mark as Built'}
    </button>
  )
}

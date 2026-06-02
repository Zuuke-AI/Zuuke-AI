'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'

interface FollowButtonProps {
  profileId: string
}

export default function FollowButton({ profileId }: FollowButtonProps) {
  const [isOwner, setIsOwner] = useState(false)
  const [isFollowing, setIsFollowing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const supabase = createBrowserClient()

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setLoading(false); return }
      if (session.user.id === profileId) { setIsOwner(true); setLoading(false); return }

      setToken(session.access_token)
      try {
        const res = await fetch(`/api/follow?following_id=${profileId}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        if (res.ok) {
          const { isFollowing: f } = await res.json()
          setIsFollowing(f)
        }
      } catch { /* noop */ }
      setLoading(false)
    }
    init()
  }, [profileId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function toggle() {
    if (toggling || !token) return
    setToggling(true)
    const wasFollowing = isFollowing
    setIsFollowing(!wasFollowing)

    try {
      if (wasFollowing) {
        await fetch(`/api/follow?following_id=${profileId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        })
      } else {
        await fetch('/api/follow', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ following_id: profileId }),
        })
      }
    } catch {
      setIsFollowing(wasFollowing) // revert on error
    }
    setToggling(false)
  }

  // Don't render for owners, unauthenticated users, or while loading
  if (loading || isOwner || !token) return null

  return (
    <button
      className={`follow-btn${isFollowing ? ' following' : ''}`}
      onClick={toggle}
      disabled={toggling}
    >
      {toggling
        ? '...'
        : isFollowing
        ? 'Following'
        : 'Follow'}
    </button>
  )
}

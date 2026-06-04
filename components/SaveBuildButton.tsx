'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'

interface SaveBuildButtonProps {
  buildId: string
  buildOwnerId?: string | null
  size?: 'sm' | 'md'
}

export default function SaveBuildButton({ buildId, buildOwnerId, size = 'md' }: SaveBuildButtonProps) {
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)
  const [isOwner, setIsOwner] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const supabase = createBrowserClient()

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setLoading(false); return }
      if (buildOwnerId && session.user.id === buildOwnerId) { setIsOwner(true); setLoading(false); return }
      setToken(session.access_token)
      try {
        const res = await fetch(`/api/saved-builds?build_id=${buildId}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        if (res.ok) setSaved((await res.json()).saved)
      } catch { /* noop */ }
      setLoading(false)
    }
    init()
  }, [buildId, buildOwnerId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function toggle() {
    if (toggling || !token) return
    setToggling(true)
    const wasSaved = saved
    setSaved(!wasSaved)
    try {
      if (wasSaved) {
        await fetch(`/api/saved-builds?build_id=${buildId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        })
      } else {
        await fetch('/api/saved-builds', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ build_id: buildId }),
        })
      }
    } catch {
      setSaved(wasSaved)
    }
    setToggling(false)
  }

  if (loading || isOwner || !token) return null

  const iconSize = size === 'sm' ? 11 : 14
  return (
    <button
      className={`save-build-btn${saved ? ' saved' : ''}${size === 'sm' ? ' sm' : ''}`}
      onClick={toggle}
      disabled={toggling}
      title={saved ? 'Remove from saved' : 'Save this build'}
      aria-label={saved ? 'Unsave build' : 'Save build'}
    >
      <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
      </svg>
      {size === 'md' && (saved ? 'Saved' : 'Save')}
    </button>
  )
}

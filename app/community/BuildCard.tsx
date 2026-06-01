'use client'

import Link from 'next/link'
import { useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'

interface Build {
  id: string
  title: string
  budget: string | null
  use_case: string | null
  created_at: string
  vote_score: number
  upvotes: number
  downvotes: number
  comment_count: number
  user_id: string | null
  profiles: { username: string | null; first_name: string | null } | null
}

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 2592000) return `${Math.floor(seconds / 86400)}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function displayName(profiles: Build['profiles']): string {
  if (profiles?.username) return `@${profiles.username}`
  if (profiles?.first_name) return profiles.first_name
  return 'Anonymous'
}

export default function BuildCard({ build }: { build: Build }) {
  const [score, setScore] = useState(build.vote_score)
  const [myVote, setMyVote] = useState<1 | -1 | 0>(0)
  const [voting, setVoting] = useState(false)

  const supabase = createBrowserClient()

  async function handleVote(v: 1 | -1) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { window.location.href = '/auth?mode=login'; return }

    if (voting) return
    setVoting(true)

    const newVote = myVote === v ? 0 : v
    const delta = newVote - myVote
    setMyVote(newVote)
    setScore(s => s + delta)

    try {
      const res = await fetch(`/api/builds/${build.id}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ vote: newVote }),
      })
      if (res.ok) {
        const data = await res.json()
        setScore(data.vote_score)
      }
    } catch { /* noop */ }
    setVoting(false)
  }

  const username = displayName(build.profiles)

  return (
    <div className="build-card">
      {/* Vote column */}
      <div className="build-card-votes">
        <button
          className={`vote-btn up${myVote === 1 ? ' active' : ''}`}
          onClick={() => handleVote(1)}
          aria-label="Upvote"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 4l8 8H4l8-8z"/>
          </svg>
        </button>
        <span className={`vote-score${score > 0 ? ' pos' : score < 0 ? ' neg' : ''}`}>
          {score}
        </span>
        <button
          className={`vote-btn down${myVote === -1 ? ' active' : ''}`}
          onClick={() => handleVote(-1)}
          aria-label="Downvote"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 20l-8-8h16l-8 8z"/>
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="build-card-body">
        <div className="build-card-meta">
          {build.budget && (
            <span className="build-budget-badge" style={{ fontSize: 10 }}>{build.budget}</span>
          )}
          <span className="build-card-author">
            {build.user_id ? (
              <Link href={`/u/${build.profiles?.username ?? build.user_id}`}>
                {username}
              </Link>
            ) : username}
          </span>
          <span className="build-card-dot">·</span>
          <span className="build-card-time">{timeAgo(build.created_at)}</span>
        </div>

        <Link href={`/build/${build.id}`} className="build-card-title">
          {build.title}
        </Link>

        {build.use_case && (
          <p className="build-card-prompt">
            {build.use_case.length > 120 ? build.use_case.slice(0, 120) + '…' : build.use_case}
          </p>
        )}

        <div className="build-card-actions">
          <Link href={`/build/${build.id}#comments`} className="build-card-action">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            {build.comment_count ?? 0} comments
          </Link>
          <Link href={`/build/${build.id}`} className="build-card-action">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
            </svg>
            View Build
          </Link>
        </div>
      </div>
    </div>
  )
}

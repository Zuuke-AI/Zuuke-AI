'use client'

import Link from 'next/link'
import { useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import SaveBuildButton from '@/components/SaveBuildButton'

interface Build {
  id: string
  title: string
  budget: string | null
  use_case: string | null
  community_body: string | null
  image_url: string | null
  created_at: string
  vote_score: number
  upvotes: number
  downvotes: number
  comment_count: number
  user_id: string | null
  profiles: { username: string | null; first_name: string | null } | null
}

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  if (s < 2592000) return `${Math.floor(s / 86400)}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function displayName(profiles: Build['profiles']): string {
  if (profiles?.username) return `@${profiles.username}`
  if (profiles?.first_name) return profiles.first_name
  return 'Anonymous'
}

function avatarInitial(profiles: Build['profiles']): string {
  if (profiles?.username) return profiles.username[0].toUpperCase()
  if (profiles?.first_name) return profiles.first_name[0].toUpperCase()
  return 'A'
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
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ vote: newVote }),
      })
      if (res.ok) setScore((await res.json()).vote_score)
    } catch { /* noop */ }
    setVoting(false)
  }

  const uname = displayName(build.profiles)
  const profileLink = build.profiles?.username ? `/u/${build.profiles.username}` : null

  return (
    <div className={`build-card${build.image_url ? ' has-image' : ''}`}>

      {/* Build photo */}
      {build.image_url && (
        <Link href={`/build/${build.id}`} className="build-card-image-wrap">
          <img
            src={build.image_url}
            alt={build.title}
            className="build-card-image"
            loading="lazy"
          />
        </Link>
      )}

      <div className="build-card-inner">
        {/* Vote column */}
        <div className="build-card-votes">
          <button className={`vote-btn up${myVote === 1 ? ' active' : ''}`} onClick={() => handleVote(1)} aria-label="Upvote">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4l8 8H4l8-8z"/></svg>
          </button>
          <span className={`vote-score${score > 0 ? ' pos' : score < 0 ? ' neg' : ''}`}>{score}</span>
          <button className={`vote-btn down${myVote === -1 ? ' active' : ''}`} onClick={() => handleVote(-1)} aria-label="Downvote">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 20l-8-8h16l-8 8z"/></svg>
          </button>
        </div>

        {/* Content */}
        <div className="build-card-body">
          {/* Author row */}
          <div className="build-card-author-row">
            <div className="build-card-avatar">{avatarInitial(build.profiles)}</div>
            <div>
              {profileLink ? (
                <Link href={profileLink} className="build-card-author-name">{uname}</Link>
              ) : (
                <span className="build-card-author-name">{uname}</span>
              )}
              <span className="build-card-dot">·</span>
              <span className="build-card-time">{timeAgo(build.created_at)}</span>
              {build.budget && (
                <><span className="build-card-dot">·</span>
                <span className="build-budget-badge" style={{ fontSize: 10 }}>{build.budget}</span></>
              )}
            </div>
          </div>

          {/* Title */}
          <Link href={`/build/${build.id}`} className="build-card-title">
            {build.title}
          </Link>

          {/* User caption (if they added one when posting) */}
          {build.community_body && (
            <p className="build-card-caption">
              {build.community_body.length > 180 ? build.community_body.slice(0, 180) + '…' : build.community_body}
            </p>
          )}

          {/* Original prompt as secondary context */}
          {!build.community_body && build.use_case && (
            <p className="build-card-prompt">
              {build.use_case.length > 120 ? build.use_case.slice(0, 120) + '…' : build.use_case}
            </p>
          )}

          {/* Actions */}
          <div className="build-card-actions">
            <Link href={`/build/${build.id}#comments`} className="build-card-action">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              {build.comment_count ?? 0} comments
            </Link>
            <Link href={`/compare?a=${build.id}`} className="build-card-action">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="3" width="9" height="14" rx="1"/><rect x="13" y="3" width="9" height="14" rx="1"/>
              </svg>
              Compare
            </Link>
            <Link href={`/build/${build.id}`} className="build-card-action">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
              View Full Build
            </Link>
            <SaveBuildButton buildId={build.id} buildOwnerId={build.user_id} size="sm" />
          </div>
        </div>
      </div>
    </div>
  )
}

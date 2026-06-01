'use client'

import { useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'

interface VoteButtonsProps {
  buildId: string
  initialScore: number
  initialUpvotes: number
  initialDownvotes: number
}

export default function VoteButtons({ buildId, initialScore, initialUpvotes, initialDownvotes }: VoteButtonsProps) {
  const [score, setScore] = useState(initialScore)
  const [myVote, setMyVote] = useState<1 | -1 | 0>(0)
  const [voting, setVoting] = useState(false)
  const supabase = createBrowserClient()

  async function handleVote(v: 1 | -1) {
    if (voting) return
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { window.location.href = '/auth?mode=login'; return }

    setVoting(true)
    const newVote = myVote === v ? 0 : v
    setMyVote(newVote)
    setScore(s => s + (newVote - myVote))

    const res = await fetch(`/api/builds/${buildId}/vote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ vote: newVote }),
    })
    if (res.ok) { const d = await res.json(); setScore(d.vote_score) }
    setVoting(false)
  }

  return (
    <div className="build-vote-strip">
      <button
        className={`build-vote-btn up${myVote === 1 ? ' active' : ''}`}
        onClick={() => handleVote(1)}
        aria-label="Upvote this build"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 4l8 8H4l8-8z"/>
        </svg>
      </button>
      <span className={`build-vote-score${score > 0 ? ' pos' : score < 0 ? ' neg' : ''}`}>{score}</span>
      <button
        className={`build-vote-btn down${myVote === -1 ? ' active' : ''}`}
        onClick={() => handleVote(-1)}
        aria-label="Downvote this build"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 20l-8-8h16l-8 8z"/>
        </svg>
      </button>
      <span className="build-vote-label">{score === 1 ? '1 point' : `${score} points`}</span>
    </div>
  )
}

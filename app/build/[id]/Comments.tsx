'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@/lib/supabase'

interface CommentAuthor {
  username: string | null
  first_name: string | null
}

interface Comment {
  id: string
  parent_id: string | null
  content: string
  vote_score: number
  upvotes: number
  downvotes: number
  created_at: string
  user_id: string
  profiles: CommentAuthor | null
}

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  if (s < 2592000) return `${Math.floor(s / 86400)}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function displayName(p: CommentAuthor | null): string {
  if (p?.username) return `@${p.username}`
  if (p?.first_name) return p.first_name
  return 'Anonymous'
}

function getUserInitial(p: CommentAuthor | null): string {
  if (p?.username) return p.username[0].toUpperCase()
  if (p?.first_name) return p.first_name[0].toUpperCase()
  return 'A'
}

// ── Single comment row ─────────────────────────────────────────────────────

interface CommentRowProps {
  comment: Comment
  depth: number
  buildId: string
  currentUserId: string | null
  token: string | null
  onReplyPosted: (c: Comment) => void
  onDeleted: (id: string) => void
}

function CommentRow({
  comment, depth, buildId, currentUserId, token, onReplyPosted, onDeleted,
}: CommentRowProps) {
  const [score, setScore] = useState(comment.vote_score)
  const [myVote, setMyVote] = useState<1 | -1 | 0>(0)
  const [replying, setReplying] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [posting, setPosting] = useState(false)

  async function handleVote(v: 1 | -1) {
    if (!token) { window.location.href = '/auth?mode=login'; return }
    const newVote = myVote === v ? 0 : v
    const delta = newVote - myVote
    setMyVote(newVote)
    setScore(s => s + delta)
    const res = await fetch(`/api/comments/${comment.id}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ vote: newVote }),
    })
    if (res.ok) { const d = await res.json(); setScore(d.vote_score) }
  }

  async function submitReply() {
    if (!replyText.trim() || !token) return
    setPosting(true)
    const res = await fetch(`/api/builds/${buildId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ content: replyText.trim(), parent_id: comment.id }),
    })
    if (res.ok) {
      const { comment: newComment } = await res.json()
      onReplyPosted(newComment)
      setReplyText('')
      setReplying(false)
    }
    setPosting(false)
  }

  async function handleDelete() {
    if (!token || !confirm('Delete this comment?')) return
    const res = await fetch(`/api/builds/${buildId}/comments?comment_id=${comment.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    })
    if (res.ok) onDeleted(comment.id)
  }

  const isOwn = currentUserId === comment.user_id
  const maxDepth = 4

  return (
    <div className={`comment-row depth-${Math.min(depth, maxDepth)}`}>
      <div className="comment-avatar">
        {getUserInitial(comment.profiles)}
      </div>
      <div className="comment-content">
        <div className="comment-header">
          <span className="comment-author">
            {comment.profiles?.username ? (
              <Link href={`/u/${comment.profiles.username}`}>
                {displayName(comment.profiles)}
              </Link>
            ) : displayName(comment.profiles)}
          </span>
          <span className="comment-time">{timeAgo(comment.created_at)}</span>
        </div>

        <p className="comment-text">{comment.content}</p>

        <div className="comment-actions">
          <button className={`comment-vote up${myVote === 1 ? ' active' : ''}`} onClick={() => handleVote(1)}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4l8 8H4l8-8z"/></svg>
          </button>
          <span className={`comment-score${score > 0 ? ' pos' : score < 0 ? ' neg' : ''}`}>{score}</span>
          <button className={`comment-vote down${myVote === -1 ? ' active' : ''}`} onClick={() => handleVote(-1)}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 20l-8-8h16l-8 8z"/></svg>
          </button>
          {depth < maxDepth && (
            <button className="comment-reply-btn" onClick={() => setReplying(r => !r)}>
              reply
            </button>
          )}
          {isOwn && (
            <button className="comment-delete-btn" onClick={handleDelete}>delete</button>
          )}
        </div>

        {replying && (
          <div className="comment-reply-form">
            <textarea
              className="comment-textarea"
              placeholder="Write a reply…"
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              rows={3}
              maxLength={5000}
            />
            <div className="comment-form-actions">
              <button className="comment-submit-btn" onClick={submitReply} disabled={posting || !replyText.trim()}>
                {posting ? 'Posting…' : 'Reply'}
              </button>
              <button className="comment-cancel-btn" onClick={() => { setReplying(false); setReplyText('') }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Comment tree ────────────────────────────────────────────────────────────

function buildTree(comments: Comment[]): Map<string | null, Comment[]> {
  const map = new Map<string | null, Comment[]>()
  for (const c of comments) {
    const key = c.parent_id ?? null
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(c)
  }
  return map
}

interface CommentTreeProps {
  parentId: string | null
  tree: Map<string | null, Comment[]>
  depth: number
  buildId: string
  currentUserId: string | null
  token: string | null
  onReplyPosted: (c: Comment) => void
  onDeleted: (id: string) => void
}

function CommentTree({ parentId, tree, depth, buildId, currentUserId, token, onReplyPosted, onDeleted }: CommentTreeProps) {
  const children = tree.get(parentId) ?? []
  if (!children.length) return null

  return (
    <>
      {children.map(c => (
        <div key={c.id}>
          <CommentRow
            comment={c}
            depth={depth}
            buildId={buildId}
            currentUserId={currentUserId}
            token={token}
            onReplyPosted={onReplyPosted}
            onDeleted={onDeleted}
          />
          <CommentTree
            parentId={c.id}
            tree={tree}
            depth={depth + 1}
            buildId={buildId}
            currentUserId={currentUserId}
            token={token}
            onReplyPosted={onReplyPosted}
            onDeleted={onDeleted}
          />
        </div>
      ))}
    </>
  )
}

// ── Main Comments component ─────────────────────────────────────────────────

export default function Comments({ buildId }: { buildId: string }) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [posting, setPosting] = useState(false)
  const [session, setSession] = useState<{ user: { id: string }; access_token: string } | null>(null)

  const supabase = createBrowserClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session as typeof session))
  }, [])

  const loadComments = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/builds/${buildId}/comments`)
    if (res.ok) {
      const { comments: data } = await res.json()
      setComments(data)
    }
    setLoading(false)
  }, [buildId])

  useEffect(() => { loadComments() }, [loadComments])

  async function submitComment() {
    if (!text.trim() || !session) return
    setPosting(true)
    const res = await fetch(`/api/builds/${buildId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ content: text.trim() }),
    })
    if (res.ok) {
      const { comment } = await res.json()
      setComments(prev => [comment, ...prev])
      setText('')
    }
    setPosting(false)
  }

  function handleReplyPosted(c: Comment) {
    setComments(prev => [...prev, c])
  }

  function handleDeleted(id: string) {
    setComments(prev => prev.filter(c => c.id !== id))
  }

  const tree = buildTree(comments)
  const token = session?.access_token ?? null
  const userId = session?.user.id ?? null

  return (
    <div className="comments-section" id="comments">
      <div className="comments-header">
        <h2 className="comments-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          {comments.length} {comments.length === 1 ? 'Comment' : 'Comments'}
        </h2>
      </div>

      {/* New comment box */}
      {session ? (
        <div className="comment-new-form">
          <textarea
            className="comment-textarea"
            placeholder="Share your thoughts, suggest alternatives, ask questions…"
            value={text}
            onChange={e => setText(e.target.value)}
            rows={4}
            maxLength={5000}
          />
          <div className="comment-form-actions">
            <button
              className="comment-submit-btn"
              onClick={submitComment}
              disabled={posting || !text.trim()}
            >
              {posting ? 'Posting…' : 'Post Comment'}
            </button>
            <span className="comment-char-count">{text.length}/5000</span>
          </div>
        </div>
      ) : (
        <div className="comment-login-prompt">
          <Link href="/auth?mode=login" className="btn-secondary" style={{ padding: '10px 24px', fontSize: 13 }}>
            Log in to comment
          </Link>
        </div>
      )}

      {/* Comment list */}
      {loading ? (
        <div className="comments-loading">Loading comments…</div>
      ) : comments.length === 0 ? (
        <div className="comments-empty">No comments yet — be the first to share your thoughts.</div>
      ) : (
        <div className="comment-list">
          <CommentTree
            parentId={null}
            tree={tree}
            depth={0}
            buildId={buildId}
            currentUserId={userId}
            token={token}
            onReplyPosted={handleReplyPosted}
            onDeleted={handleDeleted}
          />
        </div>
      )}
    </div>
  )
}

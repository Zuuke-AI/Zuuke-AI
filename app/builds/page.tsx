'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'
import SiteNav from '@/components/SiteNav'
import BgCanvas from '@/components/BgCanvas'

interface Build {
  id: string
  title: string
  budget: string | null
  use_case: string | null
  is_public: boolean
  created_at: string
  vote_score: number
  comment_count: number
}

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  if (s < 2592000) return `${Math.floor(s / 86400)}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
}

export default function MyBuildsPage() {
  const router = useRouter()
  const supabase = createBrowserClient()

  const [builds, setBuilds] = useState<Build[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'public' | 'private'>('all')
  const [token, setToken] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/auth?mode=login&next=/builds'); return }
      setToken(session.access_token)
      const res = await fetch('/api/my-builds', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (res.ok) {
        const { builds: data } = await res.json()
        setBuilds(data ?? [])
      }
      setLoading(false)
    }
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function togglePublic(build: Build) {
    if (togglingId || !token) return
    setTogglingId(build.id)
    const wasPublic = build.is_public
    // Optimistic update
    setBuilds(prev => prev.map(b => b.id === build.id ? { ...b, is_public: !wasPublic } : b))
    try {
      await fetch(`/api/builds/${build.id}/publish`, {
        method: wasPublic ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: wasPublic ? undefined : JSON.stringify({}),
      })
    } catch {
      setBuilds(prev => prev.map(b => b.id === build.id ? { ...b, is_public: wasPublic } : b))
    }
    setTogglingId(null)
  }

  async function deleteBuild(id: string) {
    if (deletingId || !token) return
    setDeletingId(id)
    const res = await fetch(`/api/builds/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) setBuilds(prev => prev.filter(b => b.id !== id))
    setDeletingId(null)
    setConfirmDeleteId(null)
  }

  const filtered =
    filter === 'public' ? builds.filter(b => b.is_public) :
    filter === 'private' ? builds.filter(b => !b.is_public) :
    builds

  const publicCount = builds.filter(b => b.is_public).length
  const privateCount = builds.filter(b => !b.is_public).length

  return (
    <>
      <BgCanvas opacity={0.15} particleCount={40} connectDistance={80} />
      <SiteNav />

      <div className="page" style={{ position: 'relative', zIndex: 1, paddingTop: 100 }}>
        <div className="mybuilds-wrap">

          {/* Header */}
          <div className="mybuilds-header">
            <div>
              <div className="community-eyebrow">SAVED</div>
              <h1 className="community-title">MY BUILDS</h1>
            </div>
            <Link href="/chat" className="btn-primary" style={{ height: 'fit-content', fontSize: 13, padding: '12px 28px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
              New Build
            </Link>
          </div>

          {/* Filter tabs */}
          {!loading && builds.length > 0 && (
            <div className="mybuilds-tabs">
              {[
                { key: 'all',     label: `All (${builds.length})` },
                { key: 'public',  label: `Shared (${publicCount})` },
                { key: 'private', label: `Private (${privateCount})` },
              ].map(t => (
                <button
                  key={t.key}
                  className={`mybuilds-tab${filter === t.key ? ' active' : ''}`}
                  onClick={() => setFilter(t.key as typeof filter)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="mybuilds-loading">Loading your builds…</div>
          )}

          {/* Empty state */}
          {!loading && builds.length === 0 && (
            <div className="mybuilds-empty">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="2" y="3" width="20" height="14" rx="2"/>
                <line x1="8" y1="21" x2="16" y2="21"/>
                <line x1="12" y1="17" x2="12" y2="21"/>
              </svg>
              <p>No builds yet.</p>
              <Link href="/chat" className="btn-secondary" style={{ marginTop: 16 }}>
                Generate your first build →
              </Link>
            </div>
          )}

          {/* Builds grid */}
          {!loading && filtered.length > 0 && (
            <div className="mybuilds-grid">
              {filtered.map(build => (
                <div key={build.id} className="mybuild-card">

                  {/* Top row */}
                  <div className="mybuild-card-top">
                    <span className={`mybuild-badge${build.is_public ? ' public' : ' private'}`}>
                      {build.is_public ? (
                        <>
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4l8 8H4l8-8z"/></svg>
                          Shared
                        </>
                      ) : (
                        <>
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                          Private
                        </>
                      )}
                    </span>
                    <span className="mybuild-date">{timeAgo(build.created_at)}</span>
                  </div>

                  {/* Title + budget */}
                  <Link href={`/build/${build.id}`} className="mybuild-title">
                    {build.title}
                  </Link>
                  <div className="mybuild-meta">
                    {build.budget && <span className="build-budget-badge" style={{ fontSize: 10 }}>{build.budget}</span>}
                    <span className="mybuild-stat">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4l8 8H4l8-8z"/></svg>
                      {build.vote_score ?? 0}
                    </span>
                    <span className="mybuild-stat">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                      {build.comment_count ?? 0}
                    </span>
                  </div>

                  {/* Use case snippet */}
                  {build.use_case && (
                    <p className="mybuild-usecase">
                      {build.use_case.length > 80 ? build.use_case.slice(0, 80) + '…' : build.use_case}
                    </p>
                  )}

                  {/* Actions */}
                  <div className="mybuild-actions">
                    <Link href={`/build/${build.id}`} className="mybuild-action-btn">
                      View
                    </Link>
                    <button
                      className={`mybuild-action-btn${build.is_public ? ' active' : ''}`}
                      onClick={() => togglePublic(build)}
                      disabled={togglingId === build.id}
                      title={build.is_public ? 'Remove from community' : 'Share to community'}
                    >
                      {togglingId === build.id ? '…' : build.is_public ? 'Unshare' : 'Share'}
                    </button>
                    <Link
                      href={`/chat?prompt=${encodeURIComponent(`I found this build: "${build.title}"${build.budget ? ` with a budget of ${build.budget}` : ''}. Can you remix it for me? `)}`}
                      className="mybuild-action-btn"
                    >
                      Remix
                    </Link>
                    {confirmDeleteId === build.id ? (
                      <div className="mybuild-confirm-delete">
                        <span>Delete?</span>
                        <button
                          className="mybuild-action-btn danger"
                          onClick={() => deleteBuild(build.id)}
                          disabled={deletingId === build.id}
                        >
                          {deletingId === build.id ? '…' : 'Yes'}
                        </button>
                        <button className="mybuild-action-btn" onClick={() => setConfirmDeleteId(null)}>
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        className="mybuild-action-btn danger"
                        onClick={() => setConfirmDeleteId(build.id)}
                        title="Delete this build"
                      >
                        Delete
                      </button>
                    )}
                  </div>

                </div>
              ))}
            </div>
          )}

          {/* Empty filter state */}
          {!loading && builds.length > 0 && filtered.length === 0 && (
            <div className="mybuilds-empty">
              <p>No {filter} builds yet.</p>
            </div>
          )}

        </div>
      </div>

      <footer style={{ position: 'relative', zIndex: 1 }}>
        <div className="footer-logo">ZUUKE<span>.</span></div>
        <div className="footer-text">© 2026 Zuuke AI · All rights reserved</div>
        <div className="footer-links">
          <Link href="/about">About Us</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/affiliate">Affiliate Disclosure</Link>
        </div>
      </footer>
    </>
  )
}

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'
import SiteNav from '@/components/SiteNav'
import BgCanvas from '@/components/BgCanvas'
import SaveBuildButton from '@/components/SaveBuildButton'

interface Build {
  id: string
  title: string
  budget: string | null
  use_case: string | null
  is_public: boolean
  vote_score: number
  comment_count: number
  created_at: string
}

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  if (s < 2592000) return `${Math.floor(s / 86400)}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
}

export default function SavedBuildsPage() {
  const router = useRouter()
  const supabase = createBrowserClient()
  const [builds, setBuilds] = useState<Build[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/auth?mode=login&next=/saved'); return }
      const res = await fetch('/api/saved-builds/list', {
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

  // Remove a build from the local list when unsaved
  function handleUnsave(buildId: string) {
    setBuilds(prev => prev.filter(b => b.id !== buildId))
  }

  return (
    <>
      <BgCanvas opacity={0.15} particleCount={40} connectDistance={80} />
      <SiteNav />
      <div className="page" style={{ position: 'relative', zIndex: 1, paddingTop: 100 }}>
        <div className="mybuilds-wrap">

          <div className="mybuilds-header">
            <div>
              <div className="community-eyebrow">COLLECTION</div>
              <h1 className="community-title">SAVED BUILDS</h1>
            </div>
            <Link href="/community" className="btn-secondary" style={{ height: 'fit-content', fontSize: 13, padding: '11px 24px' }}>
              Browse Community →
            </Link>
          </div>

          {loading && <div className="mybuilds-loading">Loading saved builds…</div>}

          {!loading && builds.length === 0 && (
            <div className="mybuilds-empty">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
              </svg>
              <p>No saved builds yet.</p>
              <p style={{ fontSize: 13, color: 'var(--mist)' }}>Browse the community and bookmark builds you like.</p>
              <Link href="/community" className="btn-secondary" style={{ marginTop: 16 }}>
                Browse Community →
              </Link>
            </div>
          )}

          {!loading && builds.length > 0 && (
            <div className="mybuilds-grid">
              {builds.map(build => (
                <div key={build.id} className="mybuild-card">
                  <div className="mybuild-card-top">
                    <span className={`mybuild-badge${build.is_public ? ' public' : ' private'}`}>
                      {build.is_public ? 'Shared' : 'Private'}
                    </span>
                    <span className="mybuild-date">{timeAgo(build.created_at)}</span>
                  </div>
                  <Link href={`/build/${build.id}`} className="mybuild-title">{build.title}</Link>
                  <div className="mybuild-meta">
                    {build.budget && <span className="build-budget-badge" style={{ fontSize: 10 }}>{build.budget}</span>}
                    <span className="mybuild-stat">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4l8 8H4l8-8z"/></svg>
                      {build.vote_score ?? 0}
                    </span>
                  </div>
                  {build.use_case && (
                    <p className="mybuild-usecase">
                      {build.use_case.length > 80 ? build.use_case.slice(0, 80) + '…' : build.use_case}
                    </p>
                  )}
                  <div className="mybuild-actions">
                    <Link href={`/build/${build.id}`} className="mybuild-action-btn">View</Link>
                    <Link href={`/chat?prompt=${encodeURIComponent(`I found this build: "${build.title}"${build.budget ? ` with a budget of ${build.budget}` : ''}. Can you remix it for me? `)}`} className="mybuild-action-btn">Remix</Link>
                    <div onClick={() => handleUnsave(build.id)}>
                      <SaveBuildButton buildId={build.id} size="sm" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
      <footer style={{ position: 'relative', zIndex: 1 }}>
        <div className="footer-logo">ZUUKE<span>.</span></div>
        <div className="footer-text">© 2026 Zuuke AI · All rights reserved</div>
        <div className="footer-links">
          <Link href="/about">About Us</Link><Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link><Link href="/affiliate">Affiliate Disclosure</Link>
        </div>
      </footer>
    </>
  )
}

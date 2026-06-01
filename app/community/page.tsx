import type { Metadata } from 'next'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase'
import SiteNav from '@/components/SiteNav'
import BgCanvas from '@/components/BgCanvas'
import BuildCard from './BuildCard'

export const metadata: Metadata = {
  title: 'Community Builds · Zuuke',
  description: 'Browse AI-generated PC builds shared by the Zuuke community. Vote, comment, and get recommendations.',
  alternates: { canonical: 'https://zuuke.shop/community' },
  openGraph: {
    title: 'Community Builds · Zuuke',
    description: 'Browse AI-generated PC builds shared by the Zuuke community.',
    url: 'https://zuuke.shop/community',
    siteName: 'Zuuke',
    type: 'website',
  },
}

export const revalidate = 30

type Sort = 'hot' | 'new' | 'top'

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

async function fetchBuilds(sort: Sort): Promise<Build[]> {
  const supabase = createServerClient()

  try {
    let query = supabase
      .from('builds')
      .select('id, title, budget, use_case, created_at, vote_score, upvotes, downvotes, comment_count, user_id, profiles:user_id(username, first_name)')
      .limit(50)

    if (sort === 'hot') {
      const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      query = query.gte('created_at', cutoff).order('vote_score', { ascending: false }).order('created_at', { ascending: false })
    } else if (sort === 'top') {
      query = query.order('vote_score', { ascending: false }).order('created_at', { ascending: false })
    } else {
      query = query.order('created_at', { ascending: false })
    }

    const { data, error } = await query
    if (error) {
      // If new columns don't exist yet (SQL migration not run), fall back gracefully
      if (error.code === '42703') {
        const { data: fallback } = await supabase
          .from('builds')
          .select('id, title, budget, use_case, created_at, user_id')
          .order('created_at', { ascending: false })
          .limit(50)
        return ((fallback ?? []) as Record<string, unknown>[]).map(b => ({
          ...b,
          vote_score: 0, upvotes: 0, downvotes: 0, comment_count: 0, profiles: null,
        })) as Build[]
      }
      return []
    }
    return ((data ?? []) as Record<string, unknown>[]).map(b => ({
      ...b,
      profiles: Array.isArray(b.profiles) ? (b.profiles[0] ?? null) : b.profiles,
    })) as Build[]
  } catch {
    return []
  }
}

export default async function CommunityPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>
}) {
  const { sort: sortParam } = await searchParams
  const sort: Sort = sortParam === 'top' ? 'top' : sortParam === 'new' ? 'new' : 'hot'
  const builds = await fetchBuilds(sort)

  return (
    <>
      <BgCanvas opacity={0.2} particleCount={50} connectDistance={90} />
      <SiteNav activePage="community" />

      <div className="page" style={{ position: 'relative', zIndex: 1, paddingTop: 100 }}>
        <div className="community-wrap">

          {/* Header */}
          <div className="community-header">
            <div className="community-eyebrow">COMMUNITY</div>
            <h1 className="community-title">BUILD <span className="accent">FORUM</span></h1>
            <p className="community-sub">
              Browse AI-generated builds from the community. Vote on your favourites, drop comments, ask questions.
            </p>
            <Link href="/chat" className="btn-primary" style={{ marginTop: 24 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
              Generate Your Build
            </Link>
          </div>

          {/* Sort tabs */}
          <div className="community-sort-row">
            <Link
              href="/community?sort=hot"
              className={`community-sort-tab${sort === 'hot' ? ' active' : ''}`}
            >
              🔥 Hot
            </Link>
            <Link
              href="/community?sort=new"
              className={`community-sort-tab${sort === 'new' ? ' active' : ''}`}
            >
              ✨ New
            </Link>
            <Link
              href="/community?sort=top"
              className={`community-sort-tab${sort === 'top' ? ' active' : ''}`}
            >
              🏆 Top
            </Link>
            <span className="community-sort-count">{builds.length} builds</span>
          </div>

          {/* Feed */}
          {builds.length === 0 ? (
            <div className="community-empty">
              <p>No builds yet{sort === 'hot' ? ' in the last 30 days' : ''}.</p>
              <Link href="/chat" className="btn-secondary" style={{ marginTop: 20 }}>
                Be the first →
              </Link>
            </div>
          ) : (
            <div className="community-feed">
              {builds.map(b => (
                <BuildCard key={b.id} build={b} />
              ))}
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

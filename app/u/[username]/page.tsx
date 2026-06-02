import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServerClient } from '@/lib/supabase'
import SiteNav from '@/components/SiteNav'
import BgCanvas from '@/components/BgCanvas'
import EditProfileButton from './EditProfileButton'
import FollowButton from '@/components/FollowButton'

interface Profile {
  id: string
  username: string | null
  first_name: string | null
  last_name: string | null
  bio: string | null
  avatar_url: string | null
}

interface Build {
  id: string
  title: string
  budget: string | null
  use_case: string | null
  community_body: string | null
  image_url: string | null
  created_at: string
  vote_score: number
  comment_count: number
  is_public: boolean
}

async function fetchProfile(username: string): Promise<Profile | null> {
  const supabase = createServerClient()
  const { data } = await supabase
    .from('profiles')
    .select('id, username, first_name, last_name, bio, avatar_url')
    .eq('username', username.toLowerCase())
    .single()
  return data ?? null
}

async function fetchFollowCounts(userId: string): Promise<{ followers: number; following: number }> {
  try {
    const supabase = createServerClient()
    const [{ count: followers }, { count: following }] = await Promise.all([
      supabase.from('follows').select('follower_id', { count: 'exact', head: true }).eq('following_id', userId),
      supabase.from('follows').select('following_id', { count: 'exact', head: true }).eq('follower_id', userId),
    ])
    return { followers: followers ?? 0, following: following ?? 0 }
  } catch {
    return { followers: 0, following: 0 }
  }
}

async function fetchUserBuilds(userId: string): Promise<Build[]> {
  const supabase = createServerClient()
  const { data } = await supabase
    .from('builds')
    .select('id, title, budget, use_case, community_body, image_url, created_at, vote_score, comment_count, is_public')
    .eq('user_id', userId)
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(50)
  return (data ?? []) as Build[]
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>
}): Promise<Metadata> {
  const { username } = await params
  const profile = await fetchProfile(username)
  if (!profile) return { title: 'User Not Found · Zuuke' }
  const name = profile.first_name ?? `@${username}`
  return {
    title: `${name} (@${username}) · Zuuke`,
    description: profile.bio ?? `PC builds by ${name} on Zuuke.`,
    alternates: { canonical: `https://zuuke.shop/u/${username}` },
    openGraph: {
      title: `${name} (@${username}) · Zuuke`,
      description: profile.bio ?? `PC builds by ${name} on Zuuke.`,
      images: profile.avatar_url ? [profile.avatar_url] : [],
    },
  }
}

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  if (s < 2592000) return `${Math.floor(s / 86400)}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const { username } = await params
  const profile = await fetchProfile(username)
  if (!profile) notFound()

  const [builds, followCounts] = await Promise.all([
    fetchUserBuilds(profile.id),
    fetchFollowCounts(profile.id),
  ])
  const totalVotes = builds.reduce((sum, b) => sum + (b.vote_score ?? 0), 0)
  const displayName = profile.first_name
    ? `${profile.first_name}${profile.last_name ? ' ' + profile.last_name : ''}`
    : `@${profile.username}`
  const initial = (profile.first_name ?? profile.username ?? 'A')[0].toUpperCase()

  return (
    <>
      <BgCanvas opacity={0.15} particleCount={40} connectDistance={80} />
      <SiteNav />

      <div className="page" style={{ position: 'relative', zIndex: 1, paddingTop: 80 }}>
        <div className="profile-wrap">

          {/* ── Profile header ── */}
          <div className="profile-header">
            <div className="profile-avatar-wrap">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={displayName} className="profile-avatar-img" />
              ) : (
                <div className="profile-avatar-letter">{initial}</div>
              )}
            </div>

            <div className="profile-info">
              <h1 className="profile-display-name">{displayName}</h1>
              {profile.username && (
                <p className="profile-username">@{profile.username}</p>
              )}
              {profile.bio && (
                <p className="profile-bio">{profile.bio}</p>
              )}
              <div className="profile-stats-row">
                <div className="profile-stat">
                  <span className="profile-stat-num">{builds.length}</span>
                  <span className="profile-stat-label">builds</span>
                </div>
                <div className="profile-stat-divider" />
                <div className="profile-stat">
                  <span className="profile-stat-num">{totalVotes >= 0 ? '+' : ''}{totalVotes}</span>
                  <span className="profile-stat-label">points</span>
                </div>
                <div className="profile-stat-divider" />
                <div className="profile-stat">
                  <span className="profile-stat-num">{followCounts.followers}</span>
                  <span className="profile-stat-label">followers</span>
                </div>
                <div className="profile-stat-divider" />
                <div className="profile-stat">
                  <span className="profile-stat-num">{followCounts.following}</span>
                  <span className="profile-stat-label">following</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <EditProfileButton profileId={profile.id} />
                <FollowButton profileId={profile.id} />
              </div>
            </div>
          </div>

          {/* ── Builds ── */}
          <div className="profile-section-header">
            <h2 className="profile-section-title">BUILDS</h2>
            <span className="profile-section-count">{builds.length}</span>
          </div>

          {builds.length === 0 ? (
            <div className="profile-empty">
              <p>No builds posted to community yet.</p>
              <Link href="/chat" className="btn-secondary" style={{ marginTop: 20 }}>Generate a build →</Link>
            </div>
          ) : (
            <div className={`profile-build-grid${builds.some(b => b.image_url) ? ' has-images' : ''}`}>
              {builds.map(b => (
                <Link key={b.id} href={`/build/${b.id}`} className="profile-build-card">
                  {b.image_url && (
                    <div className="profile-build-img-wrap">
                      <img src={b.image_url} alt={b.title} className="profile-build-img" loading="lazy" />
                    </div>
                  )}
                  <div className="profile-build-info">
                    <div className="profile-build-title-row">
                      <span className="profile-build-title">{b.title}</span>
                      {b.budget && <span className="build-budget-badge" style={{ fontSize: 10 }}>{b.budget}</span>}
                    </div>
                    {b.community_body && (
                      <p className="profile-build-caption">
                        {b.community_body.length > 100 ? b.community_body.slice(0, 100) + '…' : b.community_body}
                      </p>
                    )}
                    <div className="profile-build-meta">
                      <span>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: 3 }}>
                          <path d="M12 4l8 8H4l8-8z"/>
                        </svg>
                        {b.vote_score ?? 0}
                      </span>
                      <span>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 3 }}>
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                        </svg>
                        {b.comment_count ?? 0}
                      </span>
                      <span>{timeAgo(b.created_at)}</span>
                    </div>
                  </div>
                </Link>
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

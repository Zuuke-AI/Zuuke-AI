import type { Metadata } from 'next'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase'
import SiteNav from '@/components/SiteNav'
import BgCanvas from '@/components/BgCanvas'
import CompareSearch from './CompareSearch'

export const metadata: Metadata = {
  title: 'Compare Builds · Zuuke',
  description: 'Compare two AI-generated PC builds side by side.',
}

interface Build {
  id: string
  title: string
  budget: string | null
  use_case: string | null
  vote_score: number
  comment_count: number
  created_at: string
  raw_markdown: string
  profiles: { username: string | null; first_name: string | null } | null
  user_id: string | null
}

async function fetchBuild(id: string): Promise<Build | null> {
  if (!id || id.length < 8) return null
  try {
    const supabase = createServerClient()
    const { data } = await supabase
      .from('builds')
      .select('id, title, budget, use_case, vote_score, comment_count, created_at, raw_markdown, user_id')
      .eq('id', id)
      .single()
    if (!data) return null

    let profiles = null
    if (data.user_id) {
      const { data: p } = await supabase
        .from('profiles')
        .select('username, first_name')
        .eq('id', data.user_id)
        .single()
      if (p) profiles = { username: p.username ?? null, first_name: p.first_name ?? null }
    }
    return { ...(data as Record<string, unknown>), profiles } as Build
  } catch {
    return null
  }
}

function creatorName(build: Build): string {
  if (build.profiles?.username) return `@${build.profiles.username}`
  if (build.profiles?.first_name) return build.profiles.first_name
  return 'Anonymous'
}

function extractBulletSections(markdown: string): { heading: string; lines: string[] }[] {
  const sections: { heading: string; lines: string[] }[] = []
  const lines = markdown.split('\n')
  let current: { heading: string; lines: string[] } | null = null

  for (const line of lines) {
    const headingMatch = line.match(/^#{1,3}\s+(.+)/)
    if (headingMatch) {
      if (current && current.lines.length > 0) sections.push(current)
      current = { heading: headingMatch[1].trim(), lines: [] }
      continue
    }
    const bulletMatch = line.match(/^[-*]\s+(.+)/)
    if (bulletMatch && current) {
      current.lines.push(bulletMatch[1].trim())
    }
    // Also capture table rows / bold lines
    const boldMatch = line.match(/^\*\*([^*]+)\*\*:?\s*(.+)?/)
    if (boldMatch && current) {
      const text = boldMatch[2]
        ? `${boldMatch[1]}: ${boldMatch[2]}`
        : boldMatch[1]
      current.lines.push(text.trim())
    }
  }
  if (current && current.lines.length > 0) sections.push(current)
  return sections.slice(0, 6)
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string }>
}) {
  const { a, b } = await searchParams

  const [buildA, buildB] = await Promise.all([
    a ? fetchBuild(a) : null,
    b ? fetchBuild(b) : null,
  ])

  return (
    <>
      <BgCanvas opacity={0.2} particleCount={50} connectDistance={90} />
      <SiteNav />

      <div className="page" style={{ position: 'relative', zIndex: 1, paddingTop: 100 }}>
        <div className="compare-wrap">
          <div className="compare-header">
            <div className="section-label">Compare</div>
            <h1 className="section-title" style={{ fontSize: 'clamp(28px,5vw,48px)', marginBottom: 8 }}>
              BUILD COMPARISON
            </h1>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--mist)', marginBottom: 32 }}>
              Paste two build URLs or IDs to compare them side by side.
            </p>
            <CompareSearch initialA={a} initialB={b} />
          </div>

          {/* Comparison grid */}
          {(buildA || buildB) && (
            <div className="compare-grid">
              {[buildA, buildB].map((build, idx) => (
                <div key={idx} className={`compare-slot${build ? '' : ' empty'}`}>
                  {!build ? (
                    <div className="compare-slot-empty">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect x="2" y="3" width="20" height="14" rx="2" />
                        <line x1="8" y1="21" x2="16" y2="21" />
                        <line x1="12" y1="17" x2="12" y2="21" />
                      </svg>
                      <span>{idx === 0 ? 'Enter Build A above' : 'Enter Build B above'}</span>
                    </div>
                  ) : (
                    <>
                      {/* Header */}
                      <div className="compare-build-header">
                        <div className={`compare-label${idx === 0 ? ' a' : ' b'}`}>
                          Build {idx === 0 ? 'A' : 'B'}
                        </div>
                        <Link href={`/build/${build.id}`} className="compare-build-title">
                          {build.title}
                        </Link>
                        <div className="compare-build-meta-row">
                          {build.budget && (
                            <span className="build-budget-badge">{build.budget}</span>
                          )}
                          <span className="compare-creator">by {creatorName(build)}</span>
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="compare-stats-row">
                        <div className="compare-stat">
                          <span className="compare-stat-num" style={{ color: build.vote_score > 0 ? 'var(--cyan)' : 'var(--mist)' }}>
                            {build.vote_score > 0 ? '+' : ''}{build.vote_score}
                          </span>
                          <span className="compare-stat-label">votes</span>
                        </div>
                        <div className="compare-stat">
                          <span className="compare-stat-num">{build.comment_count}</span>
                          <span className="compare-stat-label">comments</span>
                        </div>
                        <div className="compare-stat">
                          <span className="compare-stat-num" style={{ fontSize: 11 }}>
                            {new Date(build.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                          </span>
                          <span className="compare-stat-label">created</span>
                        </div>
                      </div>

                      {/* Use case */}
                      {build.use_case && (
                        <div className="compare-use-case">
                          <span className="compare-use-case-label">Prompt:</span>
                          <span>{build.use_case.length > 120 ? build.use_case.slice(0, 120) + '…' : build.use_case}</span>
                        </div>
                      )}

                      {/* Extracted sections */}
                      <div className="compare-sections">
                        {extractBulletSections(build.raw_markdown).map(section => (
                          <div key={section.heading} className="compare-section">
                            <div className="compare-section-heading">{section.heading}</div>
                            <ul className="compare-section-list">
                              {section.lines.slice(0, 5).map((line, i) => (
                                <li key={i}>{line.length > 80 ? line.slice(0, 80) + '…' : line}</li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>

                      <Link href={`/build/${build.id}`} className="btn-secondary" style={{ display: 'inline-flex', fontSize: 12, padding: '10px 20px', marginTop: 8 }}>
                        View Full Build →
                      </Link>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* No builds selected yet */}
          {!buildA && !buildB && (
            <div className="compare-empty">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                <rect x="2" y="3" width="9" height="14" rx="1" />
                <rect x="13" y="3" width="9" height="14" rx="1" />
                <line x1="6" y1="21" x2="10" y2="21" />
                <line x1="14" y1="21" x2="18" y2="21" />
                <line x1="8" y1="17" x2="8" y2="21" />
                <line x1="16" y1="17" x2="16" y2="21" />
              </svg>
              <p>Paste a build URL or ID in each field above to start comparing.</p>
              <p style={{ fontSize: 13 }}>
                You can grab build URLs from the{' '}
                <Link href="/community" style={{ color: 'var(--cyan)' }}>Community</Link> page or any build you&apos;ve saved.
              </p>
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

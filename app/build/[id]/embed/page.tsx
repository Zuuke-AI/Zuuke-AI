import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase'
import { extractBuildContent } from '@/lib/build-utils'

// Embeddable build card — minimal chrome, iframeable
// Usage: <iframe src="https://zuuke.shop/build/[id]/embed" width="520" height="300" frameborder="0"></iframe>

export const metadata = { robots: 'noindex' }

interface Build {
  id: string
  title: string
  budget: string | null
  use_case: string | null
  vote_score: number
  raw_markdown: string
}

async function fetchBuild(id: string): Promise<Build | null> {
  try {
    const supabase = createServerClient()
    const { data } = await supabase
      .from('builds')
      .select('id, title, budget, use_case, vote_score, raw_markdown')
      .eq('id', id)
      .eq('is_public', true)
      .single()
    return data ?? null
  } catch { return null }
}

function extractPartsList(markdown: string): string[] {
  const clean = extractBuildContent(markdown)
  const lines: string[] = []
  for (const line of clean.split('\n')) {
    const cells = line.split('|').map(c => c.trim()).filter(Boolean)
    if (cells.length >= 2 && /^(cpu|gpu|motherboard|ram|storage|psu|case|cooler)$/i.test(cells[0])) {
      lines.push(`${cells[0]}: ${cells[1]}`)
    }
    if (lines.length >= 7) break
  }
  return lines
}

export default async function EmbedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const build = await fetchBuild(id)
  if (!build) notFound()

  const parts = extractPartsList(build.raw_markdown)
  const buildUrl = `https://zuuke.shop/build/${id}`

  return (
    <div style={{
      background: '#0d1f2d',
      border: '1px solid #1a2a35',
      padding: '16px 18px',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      fontFamily: "'JetBrains Mono', 'Courier New', monospace",
      color: '#c8d8e0',
      margin: 0,
    }}>
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ background: '#00d4ff', color: '#020305', fontWeight: 900, fontSize: 9, padding: '2px 7px', letterSpacing: '0.15em' }}>ZUUKE</span>
        {build.budget && (
          <span style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.25)', color: '#00d4ff', fontSize: 10, padding: '1px 8px' }}>
            {build.budget}
          </span>
        )}
        <span style={{ fontSize: 10, color: '#4d6a7a', marginLeft: 'auto' }}>▲ {build.vote_score}</span>
      </div>

      {/* Title */}
      <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', lineHeight: 1.3 }}>
        {build.title}
      </div>

      {/* Parts */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {parts.map((p, i) => {
          const colonIdx = p.indexOf(': ')
          const label = colonIdx > -1 ? p.slice(0, colonIdx) : p
          const name = colonIdx > -1 ? p.slice(colonIdx + 2) : ''
          return (
            <div key={i} style={{ display: 'flex', gap: 6, padding: '4px 0', borderBottom: '1px solid #111c24', fontSize: 10 }}>
              <span style={{ color: '#3a5060', minWidth: 80, textTransform: 'uppercase', fontSize: 9 }}>{label}</span>
              <span style={{ color: '#c8d8e0', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6, borderTop: '1px solid #1a2a35' }}>
        <Link href={buildUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#00d4ff', fontSize: 10, textDecoration: 'none', letterSpacing: '0.05em' }}>
          View Full Build →
        </Link>
        <span style={{ fontSize: 9, color: '#2a4050', letterSpacing: '0.15em' }}>zuuke.shop</span>
      </div>
    </div>
  )
}

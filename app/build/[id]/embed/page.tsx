import { notFound } from 'next/navigation'
import { createServerClient } from '@/lib/supabase'
import { extractBuildContent } from '@/lib/build-utils'

// Embeddable build card — no nav, minimal chrome, iframeable
// Usage: <iframe src="https://zuuke.shop/build/[id]/embed" width="520" height="320" frameborder="0"></iframe>

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
    // Table rows with | CPU | ... | ~$XXX |
    const cells = line.split('|').map(c => c.trim()).filter(Boolean)
    if (cells.length >= 2 && /cpu|gpu|motherboard|ram|storage|psu|case|cooler/i.test(cells[0])) {
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
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>{build.title} · Zuuke</title>
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { background: #0d1f2d; font-family: 'JetBrains Mono', 'Courier New', monospace; color: #c8d8e0; }
          .card { border: 1px solid #1a2a35; padding: 16px 18px; height: 100vh; display: flex; flex-direction: column; gap: 10px; }
          .top { display: flex; align-items: center; gap: 8px; }
          .badge { background: #00d4ff; color: #020305; font-size: 9px; font-weight: 900; padding: 2px 7px; letter-spacing: 0.15em; }
          .score { font-size: 10px; color: #4d6a7a; margin-left: auto; }
          .title { font-size: 14px; font-weight: 700; color: #fff; line-height: 1.3; }
          .budget { display: inline-block; margin-top: 3px; background: rgba(0,212,255,0.1); border: 1px solid rgba(0,212,255,0.25); color: #00d4ff; font-size: 10px; padding: 1px 8px; }
          .parts { flex: 1; overflow: hidden; }
          .part { font-size: 10px; color: #4d6a7a; padding: 4px 0; border-bottom: 1px solid #111c24; display: flex; gap: 6px; }
          .part-label { color: #3a5060; min-width: 80px; text-transform: uppercase; font-size: 9px; }
          .part-name { color: #c8d8e0; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          .footer { display: flex; align-items: center; justify-content: space-between; padding-top: 6px; border-top: 1px solid #1a2a35; }
          .link { color: #00d4ff; font-size: 10px; text-decoration: none; letter-spacing: 0.05em; }
          .link:hover { text-decoration: underline; }
          .zuuke { font-size: 9px; color: #2a4050; letter-spacing: 0.15em; }
        `}</style>
      </head>
      <body>
        <div className="card">
          <div className="top">
            <span className="badge">ZUUKE</span>
            {build.budget && <span className="budget">{build.budget}</span>}
            <span className="score">▲ {build.vote_score}</span>
          </div>
          <div className="title">{build.title}</div>
          <div className="parts">
            {parts.map((p, i) => {
              const [label, ...rest] = p.split(': ')
              return (
                <div key={i} className="part">
                  <span className="part-label">{label}</span>
                  <span className="part-name">{rest.join(': ')}</span>
                </div>
              )
            })}
          </div>
          <div className="footer">
            <a href={buildUrl} target="_blank" rel="noopener noreferrer" className="link">
              View Full Build →
            </a>
            <span className="zuuke">zuuke.shop</span>
          </div>
        </div>
      </body>
    </html>
  )
}

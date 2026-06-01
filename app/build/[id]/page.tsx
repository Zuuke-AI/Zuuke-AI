import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { marked } from 'marked'
import { createServerClient } from '@/lib/supabase'
import SiteNav from '@/components/SiteNav'
import BgCanvas from '@/components/BgCanvas'
import ShareButtons from './ShareButtons'

// ── Inline helpers (mirrors chat/page.tsx — keeps build page self-contained) ──

const TAG = 'zuuke06-20'

function makeLink(name: string): string {
  const q = encodeURIComponent(name.trim())
  const amazon  = `https://www.amazon.com/s?k=${q}&tag=${TAG}`
  const newegg  = `https://www.newegg.com/p/pl?d=${q}`
  const bestbuy = `https://www.bestbuy.com/site/searchpage.jsp?st=${q}`
  const bh      = `https://www.bhphotovideo.com/c/search?q=${q}`
  return (
    `<span class="product-wrap">` +
      `<a class="product-amz" href="${amazon}" target="_blank" rel="noopener sponsored">${name}</a>` +
      `<span class="product-compare-wrap">` +
        `<button class="product-compare-btn" onclick="this.nextElementSibling.classList.toggle('open')">compare ▾</button>` +
        `<span class="product-compare-menu">` +
          `<a href="${amazon}"  target="_blank" rel="noopener sponsored">🛒 Amazon</a>` +
          `<a href="${newegg}"  target="_blank" rel="noopener noreferrer">🔵 Newegg</a>` +
          `<a href="${bestbuy}" target="_blank" rel="noopener noreferrer">🟡 Best Buy</a>` +
          `<a href="${bh}"      target="_blank" rel="noopener noreferrer">⚫ B&H Photo</a>` +
        `</span>` +
      `</span>` +
    `</span>`
  )
}

function addLinks(html: string): string {
  let r = html.replace(/\[\[([^\]]+)\]\]/g, (_m, name) => makeLink(name))
  const linked = new Set<string>()
  r.replace(/<a [^>]*>([^<]+)<\/a>/gi, (_m, text) => { linked.add(text.toLowerCase()); return _m })
  const wrap = (re: RegExp) => {
    r = r.replace(re, (m) => linked.has(m.toLowerCase()) ? m : makeLink(m))
  }
  wrap(/\b(RTX\s*(?:5090|5080|5070\s*Ti|5070|5060\s*Ti|5060|4090|4080\s*Super|4080|4070\s*Ti\s*Super|4070\s*Ti|4070\s*Super|4070|4060\s*Ti|4060|3090\s*Ti|3090|3080\s*Ti|3080|3070\s*Ti|3070|3060\s*Ti|3060))\b/gi)
  wrap(/\b(RX\s*(?:9070\s*XT|9070|7900\s*XTX|7900\s*XT|7900\s*GRE|7800\s*XT|7700\s*XT|7700|7600\s*XT|7600|6950\s*XT|6900\s*XT|6800\s*XT|6800|6750\s*XT|6700\s*XT|6650\s*XT|6600\s*XT|6600))\b/gi)
  wrap(/\b(Arc\s*(?:B580|B570|A770|A750|A580|A380))\b/gi)
  wrap(/\b(Ryzen\s*(?:9|7|5|3)\s*\d{4}[A-Z0-9]*(?:\s*(?:3D\s*V-Cache|X3D|X|G|GE|XT))?)\b/gi)
  wrap(/\b(Core\s*(?:Ultra\s*(?:9|7|5)\s*\d{3,4}[A-Z0-9]*|i9-\d{4,5}[A-Z0-9]*|i7-\d{4,5}[A-Z0-9]*|i5-\d{4,5}[A-Z0-9]*|i3-\d{4,5}[A-Z0-9]*))\b/gi)
  wrap(/\b((?:ASUS|MSI|Gigabyte|ASRock)\s+(?:ROG\s+(?:Strix|Maximus|Crosshair|Zenith)[^<,\n]*?|TUF\s+Gaming[^<,\n]*?|Prime[^<,\n]*?|ProArt[^<,\n]*?|MAG[^<,\n]*?|MEG\s+\w+|MPG\s+\w+|Pro\s+\w+|Aorus[^<,\n]*?|Gaming\s+X[^<,\n]*?|UD[^<,\n]*?|Taichi[^<,\n]*?|Steel\s+Legend[^<,\n]*?|Phantom\s+Gaming[^<,\n]*?)\s+(?:X870E?|X670E?|B650E?|Z890|Z790|Z690|B760|B660|H770|H670)[^<,\n]*)\b/gi)
  wrap(/\b((?:G\.Skill|Corsair|Kingston|TeamGroup|Crucial|Patriot)\s+(?:Trident\s*Z5?[^<,\n]*?|Ripjaws[^<,\n]*?|Vengeance[^<,\n]*?|Dominator[^<,\n]*?|Fury\s*(?:Beast|Renegade|Impact)[^<,\n]*?|Delta[^<,\n]*?|T-Force[^<,\n]*?)\s+\d+GB(?:\s*(?:DDR5|DDR4))?[^<,\n]*)\b/gi)
  wrap(/\b(Samsung\s+(?:990\s*Pro|980\s*Pro|970\s*EVO\s*Plus|870\s*EVO|870\s*QVO|860\s*EVO)[^<,\n]*)\b/gi)
  wrap(/\b(WD\s+(?:Black\s+SN\d+[A-Z]*|Blue\s+SN\d+[A-Z]*|Red\s+Pro?|Gold)[^<,\n]*)\b/gi)
  wrap(/\b(Seagate\s+(?:Barracuda|IronWolf|FireCuda|Exos)[^<,\n]*)\b/gi)
  wrap(/\b(Crucial\s+(?:P5\s*Plus|P3\s*Plus|P3|MX500|BX500)[^<,\n]*)\b/gi)
  wrap(/\b(Corsair\s+(?:RM\d+[exi]*|HX\d+[i]*|AX\d+[i]*|SF\d+[L]*)[^<,\n]*)\b/gi)
  wrap(/\b(Seasonic\s+(?:Focus\s*(?:GX|PX|SPX)|Prime\s*(?:TX|PX|GX)|VERTEX)[^<,\n]*)\b/gi)
  wrap(/\b(be\s*quiet!\s+(?:Straight\s+Power|Dark\s+Power\s*Pro|Pure\s+Power)[^<,\n]*)\b/gi)
  wrap(/\b(NZXT\s+C\d+[^<,\n]*(?:Gold|White|Black)?)\b/gi)
  wrap(/\b(Fractal\s+Design\s+(?:Torrent|Define\s*[R-Z]?\d*|North|Meshify[^<,\n]*?|Pop\s*(?:Air|Mini|XL)?)[^<,\n]*)\b/gi)
  wrap(/\b(Lian\s+Li\s+(?:O11\s*(?:Dynamic|Air|EVO|Mini)[^<,\n]*?|Lancool[^<,\n]*?|PC-O\d+[^<,\n]*?))\b/gi)
  wrap(/\b(NZXT\s+(?:H\d+\s*(?:Flow|Elite|i)?|Kraken\s*(?:X|Z|Elite)?[^<,\n]*?))\b/gi)
  wrap(/\b(Phanteks\s+(?:Eclipse|Enthoo|NV[^<,\n]*?))\b/gi)
  wrap(/\b(Corsair\s+(?:4000D|5000D|7000D)[^<,\n]*)\b/gi)
  wrap(/\b(Noctua\s+(?:NH-D15|NH-D15S|NH-U12S|NH-U14S|NF-[^<,\n]*?))\b/gi)
  wrap(/\b(Arctic\s+(?:Liquid\s+Freezer\s*(?:II|III)?[^<,\n]*?|Freezer\s*34[^<,\n]*?))\b/gi)
  wrap(/\b(DeepCool\s+(?:AK\d+[A-Z]*|ASSASSIN\s*(?:IV|III)[^<,\n]*?|LT\d+[^<,\n]*?))\b/gi)
  wrap(/\b(Thermalright\s+(?:Peerless\s+Assassin[^<,\n]*?|Phantom\s+Spirit[^<,\n]*?))\b/gi)
  return r
}

// ── Data fetching ──────────────────────────────────────────────────

interface Build {
  id: string
  title: string
  budget: string | null
  use_case: string | null
  raw_markdown: string
  created_at: string
}

async function fetchBuild(id: string): Promise<Build | null> {
  try {
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('builds')
      .select('id, title, budget, use_case, raw_markdown, created_at')
      .eq('id', id)
      .single()
    if (error || !data) return null
    return data as Build
  } catch {
    return null
  }
}

// ── Metadata ───────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const build = await fetchBuild(id)

  if (!build) {
    return {
      title: 'Build Not Found · Zuuke',
      description: 'This PC build does not exist or has been removed.',
    }
  }

  const desc = build.budget
    ? `${build.budget} AI-generated PC build by Zuuke — full parts list, prices, and expert reasoning.`
    : `AI-generated PC build by Zuuke — full parts list, prices, and expert reasoning.`

  return {
    title: `${build.title} · Zuuke`,
    description: desc,
    alternates: { canonical: `https://zuuke.shop/build/${id}` },
    openGraph: {
      title: `${build.title} · Zuuke`,
      description: desc,
      url: `https://zuuke.shop/build/${id}`,
      siteName: 'Zuuke',
      type: 'article',
    },
    twitter: {
      card: 'summary',
      title: `${build.title} · Zuuke`,
      description: desc,
    },
  }
}

// ── Page ───────────────────────────────────────────────────────────

export default async function BuildPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const build = await fetchBuild(id)

  if (!build) notFound()

  const renderedHTML = addLinks(marked.parse(build.raw_markdown) as string)

  const formattedDate = new Date(build.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <>
      <BgCanvas opacity={0.3} particleCount={70} connectDistance={100} />
      <SiteNav />

      <div className="page" style={{ position: 'relative', zIndex: 1, paddingTop: 100 }}>
        <div className="build-page-wrap">

          {/* ── Header ── */}
          <div className="build-page-header">
            <div className="build-page-eyebrow">
              <span>AI BUILD</span>
              {build.budget && (
                <span className="build-budget-badge">{build.budget}</span>
              )}
              <span className="build-page-date">{formattedDate}</span>
            </div>

            <h1 className="build-page-title">{build.title}</h1>

            {build.use_case && (
              <p className="build-page-prompt">
                <span style={{ color: 'var(--mist)', marginRight: 6 }}>Prompt:</span>
                {build.use_case}
              </p>
            )}

            {/* Share panel */}
            <ShareButtons buildId={build.id} buildTitle={build.title} />
          </div>

          {/* ── Build content (full AI response) ── */}
          <div className="build-page-content">
            <div
              className="msg-text build-content-body"
              dangerouslySetInnerHTML={{ __html: renderedHTML }}
            />
          </div>

          {/* ── Bottom CTA ── */}
          <div className="build-page-cta">
            <div className="build-cta-title">WANT YOUR OWN<br /><span className="accent">CUSTOM BUILD?</span></div>
            <p className="build-cta-sub">
              Tell Zuuke your budget and use case. Get a personalized, fully compatible PC build in under 30 seconds.
            </p>
            <Link href="/chat" className="btn-primary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
              Generate My Build — Free
            </Link>
          </div>

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

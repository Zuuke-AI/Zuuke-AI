export interface ShoppingResult {
  price: string
  source: string
  url: string
}

interface RawResult {
  title?: string
  price?: string
  extracted_price?: number
  source?: string
  link?: string
}

const PREFERRED_SOURCES = ['Best Buy', 'Amazon', 'Newegg', 'B&H Photo']

// Known-legitimate retailers — a price from any of these beats any unknown domain.
// Google Shopping results are full of SEO-spam storefronts with fake low prices.
const TRUSTED_SOURCES = [
  'best buy', 'amazon', 'newegg', 'b&h', 'micro center', 'walmart',
  'adorama', 'target', 'staples', 'office depot', 'gamestop', 'costco', 'dell', 'lenovo',
]

// Reject titles containing a GPU/CPU variant token the query didn't ask for
// (e.g. query "RTX 4070 Super" must not match an "RTX 4070 Ti Super" listing)
const VARIANT_GUARDS = ['ti', 'super', 'xt', 'xtx', 'x3d']

// Reject listings that are clearly prebuilts/bundles/used/accessories, unless the query asks for them
const JUNK_SIGNALS = [
  'gaming pc', 'desktop pc', 'prebuilt', 'laptop', 'refurbished', 'renewed', 'used', 'combo', 'bundle', 'package',
  'fan ', 'bracket', 'waterblock', 'water block', 'backplate', 'shroud', 'cable', 'stand', 'mount', 'sticker', 'skin',
]

function norm(s: string): string {
  return ' ' + s.toLowerCase().replace(/[^a-z0-9&]+/g, ' ').trim() + ' '
}

// "Newegg.com - MXZ PC" is the marketplace seller "MXZ PC", not Newegg itself —
// judge trust on the seller after the dash when present
function isTrustedSource(source?: string): boolean {
  if (!source) return false
  const s = source.toLowerCase()
  const dash = s.indexOf(' - ')
  const seller = dash >= 0 ? s.slice(dash + 3) : s
  return TRUSTED_SOURCES.some((t) => seller.includes(t))
}

function titleMatches(query: string, title: string): boolean {
  const t = norm(title)
  const q = norm(query)

  // Every significant query token must appear in the title
  for (const tok of q.trim().split(' ')) {
    if (tok.length > 1 && !t.includes(tok)) return false
  }
  // Title must not add a variant token the query lacks
  for (const g of VARIANT_GUARDS) {
    if (t.includes(` ${g} `) && !q.includes(` ${g} `)) return false
  }
  // Skip prebuilts, bundles, and used listings
  for (const j of JUNK_SIGNALS) {
    if (t.includes(j) && !q.includes(j)) return false
  }
  // Prebuilt PCs always list system RAM ("16GB DDR5") — reject DDR mentions
  // unless this IS a RAM query. GPU VRAM ("GDDR6X") tokenizes as gddr, no clash.
  const qHasDdr = q.trim().split(' ').some((tok) => tok.startsWith('ddr'))
  if (!qHasDdr && t.trim().split(' ').some((tok) => tok.startsWith('ddr'))) return false
  // Capacity trap: a "64GB (2x32GB)" kit contains the substring "32gb" — reject
  // when the query capacity only appears as a per-stick multiple ("x32gb")
  for (const tok of q.trim().split(' ')) {
    if (/^\d+(gb|tb)$/.test(tok) && t.includes('x' + tok) && !q.includes('x' + tok)) return false
  }
  return true
}

export async function searchShopping(query: string): Promise<ShoppingResult | null> {
  const apiKey = process.env.SERPAPI_KEY
  if (!apiKey) return null

  const params = new URLSearchParams({
    engine: 'google_shopping',
    q: query,
    api_key: apiKey,
    gl: 'us',
    hl: 'en',
    num: '20',
  })

  try {
    const res = await fetch(`https://serpapi.com/search.json?${params}`, {
      next: { revalidate: 0 },
    })
    if (!res.ok) return null

    const data = await res.json()
    const results: RawResult[] = data?.shopping_results ?? []
    if (!results.length) return null

    const candidates = results.filter(
      (r) => r.price && r.extracted_price && r.title && titleMatches(query, r.title)
    )
    if (!candidates.length) return null

    // Tier 1: trusted retailers only. A known store's price beats any unknown
    // domain — Google Shopping is full of spam storefronts with fake prices.
    const trusted = candidates.filter((r) => isTrustedSource(r.source))

    let pool: RawResult[]
    if (trusted.length) {
      pool = trusted
    } else {
      // Tier 2: unknown domains — keep only prices within a sanity band around
      // the median (weeds out $79 accessories and marked-up outliers)
      const sorted = candidates.map((r) => r.extracted_price!).sort((a, b) => a - b)
      const median = sorted[Math.floor(sorted.length / 2)]
      const banded = candidates.filter(
        (r) => r.extracted_price! >= median * 0.45 && r.extracted_price! <= median * 2.2
      )
      pool = banded.length ? banded : candidates
    }

    for (const pref of PREFERRED_SOURCES) {
      const m = pool.find((r) => r.source?.toLowerCase().includes(pref.toLowerCase()))
      if (m) return { price: m.price!, source: m.source!, url: m.link ?? '' }
    }

    // Take the lower-median listing — never an outlier, biased toward the
    // cheaper of two comparable prices
    const byPrice = [...pool].sort((a, b) => a.extracted_price! - b.extracted_price!)
    const best = byPrice[Math.floor((byPrice.length - 1) / 2)]
    return { price: best.price!, source: best.source ?? '', url: best.link ?? '' }
  } catch {
    return null
  }
}

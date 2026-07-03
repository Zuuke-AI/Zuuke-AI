export interface ShoppingResult {
  price: string
  source: string
  url: string
}

const PREFERRED_SOURCES = ['Best Buy', 'Amazon', 'Newegg', 'B&H Photo Video']

export async function searchShopping(query: string): Promise<ShoppingResult | null> {
  const apiKey = process.env.SERPAPI_KEY
  if (!apiKey) return null

  const params = new URLSearchParams({
    engine: 'google_shopping',
    q: query,
    api_key: apiKey,
    gl: 'us',
    hl: 'en',
    num: '10',
  })

  try {
    const res = await fetch(`https://serpapi.com/search.json?${params}`, {
      next: { revalidate: 0 },
    })
    if (!res.ok) return null

    const data = await res.json()
    const results: Array<{ title: string; price?: string; extracted_price?: number; source?: string; link?: string }> =
      data?.shopping_results ?? []

    if (!results.length) return null

    // Prefer a known PC parts retailer, then fall back to lowest price
    for (const preferred of PREFERRED_SOURCES) {
      const match = results.find(
        (r) => r.source?.toLowerCase().includes(preferred.toLowerCase()) && r.price && r.extracted_price
      )
      if (match) {
        return { price: match.price!, source: match.source!, url: match.link ?? '' }
      }
    }

    // Fall back to first result with a price
    const first = results.find((r) => r.price && r.extracted_price)
    if (!first) return null
    return { price: first.price!, source: first.source ?? '', url: first.link ?? '' }
  } catch {
    return null
  }
}

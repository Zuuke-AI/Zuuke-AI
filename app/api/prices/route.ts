export const dynamic = 'force-dynamic'

import { searchShopping } from '@/lib/serpapi'
import { searchProducts } from '@/lib/amazon-paapi'

// In-memory price cache — resets on cold start, fine for short-lived price data
const cache = new Map<string, { price: string; source: string; url: string; ts: number }>()
const CACHE_TTL = 60 * 60 * 1000 // 1 hour

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim()
  if (!q) return Response.json({ price: null }, { status: 400 })

  const key = q.toLowerCase()
  const cached = cache.get(key)
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return Response.json({ price: cached.price, source: cached.source, url: cached.url })
  }

  // Serpapi (Google Shopping) — primary: returns Best Buy, Amazon, Newegg etc.
  const shopping = await searchShopping(q)
  if (shopping) {
    cache.set(key, { ...shopping, ts: Date.now() })
    return Response.json({ price: shopping.price, source: shopping.source, url: shopping.url })
  }

  // Amazon PAAPI — fallback for when Serpapi key isn't set but PAAPI is
  const paapi = await searchProducts(q)
  if (paapi) {
    cache.set(key, { price: paapi.price, source: 'Amazon', url: paapi.url, ts: Date.now() })
    return Response.json({ price: paapi.price, source: 'Amazon', url: paapi.url })
  }

  return Response.json({ price: null })
}

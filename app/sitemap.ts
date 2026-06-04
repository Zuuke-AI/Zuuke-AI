import { MetadataRoute } from 'next'
import { createServerClient } from '@/lib/supabase'

export const revalidate = 3600 // rebuild sitemap every hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = 'https://zuuke.shop'

  const staticPages: MetadataRoute.Sitemap = [
    { url: base,                   lastModified: new Date(), changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${base}/chat`,         lastModified: new Date(), changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/community`,    lastModified: new Date(), changeFrequency: 'daily',   priority: 0.8 },
    { url: `${base}/compare`,      lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/about`,        lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/affiliate`,    lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/privacy`,      lastModified: new Date(), changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${base}/terms`,        lastModified: new Date(), changeFrequency: 'yearly',  priority: 0.3 },
  ]

  // Fetch all public builds for Google indexing
  try {
    const supabase = createServerClient()
    const { data: builds } = await supabase
      .from('builds')
      .select('id, created_at')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(5000)

    const buildPages: MetadataRoute.Sitemap = (builds ?? []).map(b => ({
      url: `${base}/build/${b.id}`,
      lastModified: new Date(b.created_at),
      changeFrequency: 'monthly',
      priority: 0.7,
    }))

    return [...staticPages, ...buildPages]
  } catch {
    return staticPages
  }
}

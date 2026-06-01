import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://zuuke.shop'
  return [
    { url: base,              lastModified: new Date(), changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${base}/chat`,    lastModified: new Date(), changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/about`,   lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/affiliate`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/privacy`, lastModified: new Date(), changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${base}/terms`,   lastModified: new Date(), changeFrequency: 'yearly',  priority: 0.3 },
  ]
}

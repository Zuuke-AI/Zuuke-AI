/**
 * Build detection, ID generation, and metadata parsing utilities.
 * Used by both the API route and the chat client.
 */

/** Generate a short random alphanumeric ID (8 chars) */
export function generateBuildId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let id = ''
  for (let i = 0; i < 8; i++) {
    id += chars[Math.floor(Math.random() * chars.length)]
  }
  return id
}

/**
 * Returns true when the AI response looks like a full PC build recommendation.
 * Requires 4+ PC part categories mentioned AND at least one price estimate.
 */
export function isBuildResponse(markdown: string): boolean {
  const parts = ['CPU', 'GPU', 'Motherboard', 'RAM', 'Storage', 'PSU', 'Case', 'Processor', 'Graphics']
  const found = parts.filter((p) => new RegExp(`\\b${p}\\b`, 'i').test(markdown)).length
  const hasPrices = /~?\$\d{2,}/.test(markdown)
  return found >= 4 && hasPrices
}

/** Extract the best title from the AI markdown response */
export function parseBuildTitle(markdown: string): string {
  // ## heading
  const h2 = markdown.match(/^##\s+(.+)$/m)
  if (h2) return h2[1].replace(/\*\*/g, '').trim().slice(0, 90)
  // # heading
  const h1 = markdown.match(/^#\s+(.+)$/m)
  if (h1) return h1[1].replace(/\*\*/g, '').trim().slice(0, 90)
  // **Bold title** on its own line
  const bold = markdown.match(/^\*\*([^*]{8,80})\*\*\s*$/m)
  if (bold) return bold[1].trim()
  return 'Custom PC Build'
}

/** Extract the estimated total cost from the AI response */
export function parseBudget(markdown: string): string | null {
  // "Total: ~$1,200" / "Estimated Total: $1,400" / "**Total Cost: ~$950**"
  const total = markdown.match(
    /(?:total|estimated total|total cost|total price)[^$\n]{0,30}~?\$(\d[\d,]+)/i
  )
  if (total) return `$${total[1]}`
  // "Budget: $800"
  const budget = markdown.match(/budget[^$\n]{0,20}~?\$(\d[\d,]+)/i)
  if (budget) return `$${budget[1]}`
  return null
}

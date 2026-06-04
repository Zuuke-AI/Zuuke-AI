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

/**
 * Strips conversational wrapper from a raw AI response, leaving only the
 * structured build content (heading → parts table → sections).
 *
 * Removes:
 *   - Intro text before the first ## heading ("Sure! Here's your build...")
 *   - Closing sign-off after the last section ("Want me to swap any part?")
 *
 * Safe for old-format builds too — returns content unchanged if no heading found.
 */
export function extractBuildContent(markdown: string): string {
  let content = markdown.trim()

  // 1. Strip conversational intro before the first heading
  const firstHeading = content.match(/^#{1,3}\s+.+/m)
  if (firstHeading && (firstHeading.index ?? 0) > 5) {
    content = content.slice(firstHeading.index!)
  }

  // 2. Strip trailing sign-off
  //    Handles new format:  \n---\n*Want me to adjust...*
  //    Handles older format: \n\nWant me to swap..., Let me know if..., etc.
  content = content
    .replace(/\n+---\n\*[^\n]+\*\s*$/, '')
    .replace(/\n+\*?(?:[Ww]ant me to|[Ll]et me know|[Ff]eel free|[Ss]hall I|[Ww]ould you like)[^\n]*\*?\s*$/, '')

  return content.trim()
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

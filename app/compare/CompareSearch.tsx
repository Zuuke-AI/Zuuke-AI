'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface CompareSearchProps {
  initialA?: string
  initialB?: string
}

function extractId(input: string): string {
  // Handle full URLs like https://zuuke.shop/build/abc123 or just the ID
  const trimmed = input.trim()
  const match = trimmed.match(/\/build\/([a-zA-Z0-9-]+)/)
  return match ? match[1] : trimmed
}

export default function CompareSearch({ initialA, initialB }: CompareSearchProps) {
  const router = useRouter()
  const [a, setA] = useState(initialA ?? '')
  const [b, setB] = useState(initialB ?? '')

  function handleCompare() {
    const idA = extractId(a)
    const idB = extractId(b)
    if (!idA && !idB) return
    const params = new URLSearchParams()
    if (idA) params.set('a', idA)
    if (idB) params.set('b', idB)
    router.push(`/compare?${params.toString()}`)
  }

  return (
    <div className="compare-search-row">
      <div className="compare-input-group">
        <label className="compare-input-label">Build A</label>
        <input
          className="compare-input"
          placeholder="Paste build URL or ID..."
          value={a}
          onChange={e => setA(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleCompare()}
        />
      </div>
      <div className="compare-vs">VS</div>
      <div className="compare-input-group">
        <label className="compare-input-label">Build B</label>
        <input
          className="compare-input"
          placeholder="Paste build URL or ID..."
          value={b}
          onChange={e => setB(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleCompare()}
        />
      </div>
      <button
        className="btn-primary"
        style={{ padding: '12px 28px', fontSize: 13, whiteSpace: 'nowrap', flexShrink: 0 }}
        onClick={handleCompare}
        disabled={!a.trim() && !b.trim()}
      >
        Compare →
      </button>
    </div>
  )
}

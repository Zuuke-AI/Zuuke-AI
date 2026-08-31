'use client'

import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    adsbygoogle?: unknown[]
  }
}

interface AdUnitProps {
  /** Ad unit slot ID from AdSense → Ads → Ad units. */
  slot: string
  format?: string
  responsive?: boolean
  className?: string
  style?: React.CSSProperties
}

const CLIENT_ID = 'ca-pub-2901252402000380'

export default function AdUnit({
  slot,
  format = 'auto',
  responsive = true,
  className,
  style,
}: AdUnitProps) {
  const insRef = useRef<HTMLModElement>(null)
  const pushed = useRef(false)

  useEffect(() => {
    if (pushed.current) return
    pushed.current = true
    try {
      window.adsbygoogle = window.adsbygoogle || []
      window.adsbygoogle.push({})
    } catch (err) {
      console.error('[AdUnit] adsbygoogle push failed', err)
    }
  }, [])

  return (
    <ins
      ref={insRef}
      className={`adsbygoogle ${className ?? ''}`.trim()}
      style={style ?? { display: 'block' }}
      data-ad-client={CLIENT_ID}
      data-ad-slot={slot}
      data-ad-format={format}
      data-full-width-responsive={responsive ? 'true' : 'false'}
    />
  )
}

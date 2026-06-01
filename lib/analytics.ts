/**
 * Analytics event tracking.
 * Currently hooks into Google Analytics 4 (gtag) if present.
 * Swap in PostHog / Mixpanel / Segment by changing the body below.
 */

export type AnalyticsEvent =
  | 'build_generated'
  | 'build_viewed'
  | 'build_shared'
  | 'copy_link_clicked'

export interface EventProperties {
  buildId?: string
  userId?: string
  budget?: string
  source?: string
  [key: string]: string | undefined
}

type Gtag = (cmd: string, event: string, params: object) => void

export function trackEvent(event: AnalyticsEvent, properties?: EventProperties) {
  if (typeof window === 'undefined') return

  // Google Analytics 4
  const win = window as typeof window & { gtag?: Gtag }
  if (typeof win.gtag === 'function') {
    win.gtag('event', event, properties ?? {})
  }

  // Dev / staging console output
  if (process.env.NODE_ENV !== 'production') {
    console.log('[Zuuke Analytics]', event, properties)
  }
}

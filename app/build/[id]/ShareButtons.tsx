'use client'

import { useState } from 'react'
import { trackEvent } from '@/lib/analytics'

interface ShareButtonsProps {
  buildId: string
  buildTitle: string
}

export default function ShareButtons({ buildId, buildTitle }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false)
  const [hasNativeShare, setHasNativeShare] = useState(false)

  // detect native share on mount (client only)
  useState(() => {
    setHasNativeShare(typeof navigator !== 'undefined' && !!navigator.share)
  })

  const buildUrl = `https://zuuke.shop/build/${buildId}`

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(buildUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
      trackEvent('copy_link_clicked', { buildId, source: 'build_page' })
    } catch {
      // Fallback: select the text
      const input = document.getElementById('build-url-input') as HTMLInputElement | null
      input?.select()
    }
  }

  async function nativeShare() {
    if (!navigator.share) return
    try {
      await navigator.share({
        title: buildTitle,
        text: `Check out this PC build from Zuuke AI: ${buildTitle}`,
        url: buildUrl,
      })
      trackEvent('build_shared', { buildId, source: 'native_share' })
    } catch { /* user cancelled */ }
  }

  const xUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(`Check out this PC build I generated with Zuuke AI: ${buildTitle}`)}&url=${encodeURIComponent(buildUrl)}`
  const redditUrl = `https://reddit.com/submit?url=${encodeURIComponent(buildUrl)}&title=${encodeURIComponent(buildTitle + ' — AI PC Build by Zuuke')}`

  return (
    <div className="build-share-panel">
      <div className="build-share-label">SHARE THIS BUILD</div>
      <div className="build-share-row">
        <input
          id="build-url-input"
          className="build-share-url-input"
          value={buildUrl}
          readOnly
          onClick={(e) => (e.target as HTMLInputElement).select()}
        />
        <button
          className={`build-share-copy-btn${copied ? ' copied' : ''}`}
          onClick={copyLink}
        >
          {copied ? (
            <>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              Copy Link
            </>
          )}
        </button>
      </div>

      <div className="build-share-socials">
        {hasNativeShare && (
          <button className="build-social-btn" onClick={nativeShare} title="Share via device">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
            Share
          </button>
        )}
        <a
          className="build-social-btn"
          href={xUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackEvent('build_shared', { buildId, source: 'x_twitter' })}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
          Post on X
        </a>
        <a
          className="build-social-btn"
          href={redditUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackEvent('build_shared', { buildId, source: 'reddit' })}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="12" r="10"/><path d="M12 8c-.6 0-1 .4-1 1s.4 1 1 1 1-.4 1-1-.4-1-1-1z" fill="white"/><path d="M20 12c0-1.1-.9-2-2-2-.5 0-1 .2-1.4.5C15.3 9.6 13.7 9 12 9s-3.3.6-4.6 1.5c-.4-.3-.9-.5-1.4-.5-1.1 0-2 .9-2 2 0 .8.5 1.5 1.2 1.8-.1.4-.2.8-.2 1.2 0 3.3 3.6 6 8 6s8-2.7 8-6c0-.4-.1-.8-.2-1.2.7-.3 1.2-1 1.2-1.8z" fill="white"/>
          </svg>
          Reddit
        </a>
      </div>
    </div>
  )
}

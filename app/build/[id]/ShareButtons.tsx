'use client'

import { useEffect, useRef, useState } from 'react'
import { trackEvent } from '@/lib/analytics'
import { createBrowserClient } from '@/lib/supabase'

interface ShareButtonsProps {
  buildId: string
  buildTitle: string
  buildOwnerId: string | null
}

export default function ShareButtons({ buildId, buildTitle, buildOwnerId }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false)
  const [isOwner, setIsOwner] = useState(false)
  const [isPublic, setIsPublic] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [posting, setPosting] = useState(false)
  const [caption, setCaption] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState(false)
  const [postSuccess, setPostSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const supabase = createBrowserClient()

  useEffect(() => {
    async function checkOwner() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session || !buildOwnerId) return
      if (session.user.id === buildOwnerId) {
        setIsOwner(true)
        // Check if already published
        const { data } = await supabase
          .from('builds')
          .select('is_public')
          .eq('id', buildId)
          .single()
        if (data?.is_public) setIsPublic(true)
      }
    }
    checkOwner()
  }, [buildId, buildOwnerId]) // eslint-disable-line react-hooks/exhaustive-deps

  const buildUrl = `https://zuuke.shop/build/${buildId}`

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(buildUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
      trackEvent('copy_link_clicked', { buildId, source: 'build_page' })
    } catch {
      const input = document.getElementById('build-url-input') as HTMLInputElement | null
      input?.select()
    }
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 8 * 1024 * 1024) {
      alert('Image must be under 8MB.')
      return
    }
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setImagePreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  function removeImage() {
    setImageFile(null)
    setImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handlePost() {
    if (posting) return
    setPosting(true)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setPosting(false); return }

    let imageUrl: string | null = null

    // Upload image via server-side API route (bypasses RLS)
    if (imageFile) {
      setUploadProgress(true)
      const form = new FormData()
      form.append('file', imageFile)
      form.append('buildId', buildId)

      const uploadRes = await fetch('/api/storage/upload-build-image', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: form,
      })

      setUploadProgress(false)

      if (!uploadRes.ok) {
        const err = await uploadRes.json()
        alert('Image upload failed: ' + (err.error ?? 'Unknown error'))
        setPosting(false)
        return
      }

      imageUrl = (await uploadRes.json()).url
    }

    const res = await fetch(`/api/builds/${buildId}/publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        community_body: caption.trim() || null,
        image_url: imageUrl,
      }),
    })

    if (res.ok) {
      setIsPublic(true)
      setPostSuccess(true)
      setShowModal(false)
      setCaption('')
      setImageFile(null)
      setImagePreview(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      trackEvent('build_posted_community', { buildId })
    } else {
      const err = await res.json()
      alert(err.error ?? 'Failed to post.')
    }
    setPosting(false)
  }

  async function handleUnpublish() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await fetch(`/api/builds/${buildId}/publish`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    setIsPublic(false)
    setPostSuccess(false)
  }

  const xUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(`Check out this PC build I generated with Zuuke AI: ${buildTitle}`)}&url=${encodeURIComponent(buildUrl)}`
  const redditUrl = `https://reddit.com/submit?url=${encodeURIComponent(buildUrl)}&title=${encodeURIComponent(buildTitle + ' — AI PC Build by Zuuke')}`

  return (
    <>
      {/* ── Post to Community (owner only) ── */}
      {isOwner && (
        <div className="community-post-banner">
          {isPublic || postSuccess ? (
            <div className="community-post-live">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Posted to Community
              <a href="/community" style={{ marginLeft: 10, color: 'var(--cyan)', textDecoration: 'none', fontSize: 11 }}>View →</a>
              <button className="community-post-remove" onClick={handleUnpublish}>Remove</button>
            </div>
          ) : (
            <button className="community-post-btn" onClick={() => setShowModal(true)}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              Post to Community
              <span className="community-post-badge">Share your build with the world</span>
            </button>
          )}
        </div>
      )}

      {/* ── Share panel ── */}
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
          <button className={`build-share-copy-btn${copied ? ' copied' : ''}`} onClick={copyLink}>
            {copied ? (
              <><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>Copied!</>
            ) : (
              <><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>Copy Link</>
            )}
          </button>
        </div>
        <div className="build-share-socials">
          <a className="build-social-btn" href={xUrl} target="_blank" rel="noopener noreferrer" onClick={() => trackEvent('build_shared', { buildId, source: 'x_twitter' })}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            Post on X
          </a>
          <a className="build-social-btn" href={redditUrl} target="_blank" rel="noopener noreferrer" onClick={() => trackEvent('build_shared', { buildId, source: 'reddit' })}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/><path d="M12 8c-.6 0-1 .4-1 1s.4 1 1 1 1-.4 1-1-.4-1-1-1z" fill="white"/><path d="M20 12c0-1.1-.9-2-2-2-.5 0-1 .2-1.4.5C15.3 9.6 13.7 9 12 9s-3.3.6-4.6 1.5c-.4-.3-.9-.5-1.4-.5-1.1 0-2 .9-2 2 0 .8.5 1.5 1.2 1.8-.1.4-.2.8-.2 1.2 0 3.3 3.6 6 8 6s8-2.7 8-6c0-.4-.1-.8-.2-1.2.7-.3 1.2-1 1.2-1.8z" fill="white"/></svg>
            Reddit
          </a>
        </div>
      </div>

      {/* ── Post to Community Modal ── */}
      {showModal && (
        <div className="post-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div className="post-modal">
            <div className="post-modal-header">
              <div className="post-modal-title">POST TO COMMUNITY</div>
              <button className="post-modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="post-modal-build-name">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--cyan)" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              {buildTitle}
            </div>

            <div className="post-modal-section">
              <label className="post-modal-label">Caption (optional)</label>
              <textarea
                className="post-modal-textarea"
                placeholder="Tell the community about your build — your experience, what you love about it, tips for others..."
                value={caption}
                onChange={e => setCaption(e.target.value)}
                maxLength={500}
                rows={4}
              />
              <div className="post-modal-char">{caption.length}/500</div>
            </div>

            <div className="post-modal-section">
              <label className="post-modal-label">Build Photo (optional)</label>
              {imagePreview ? (
                <div className="post-modal-preview">
                  <img src={imagePreview} alt="Build preview" />
                  <button className="post-modal-remove-img" onClick={removeImage}>✕ Remove</button>
                </div>
              ) : (
                <div className="post-modal-upload" onClick={() => fileInputRef.current?.click()}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--mist)" strokeWidth="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                  </svg>
                  <span>Click to upload a photo of your build</span>
                  <span className="post-modal-upload-hint">JPG, PNG, WEBP · Max 8MB</span>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                style={{ display: 'none' }}
                onChange={handleImageSelect}
              />
            </div>

            <div className="post-modal-actions">
              <button className="btn-secondary" style={{ padding: '11px 24px', fontSize: 12 }} onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button
                className={`btn-primary${posting ? ' loading' : ''}`}
                style={{ padding: '12px 28px', fontSize: 13 }}
                onClick={handlePost}
                disabled={posting}
              >
                {uploadProgress ? 'Uploading photo…' : posting ? 'Posting…' : 'Post to Community →'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@/lib/supabase'

interface Notification {
  id: string
  type: string
  read: boolean
  created_at: string
  from_user: { username: string | null; first_name: string | null } | null
  build: { title: string } | null
  build_id: string | null
  comment_id: string | null
}

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

function notifText(n: Notification): string {
  const actor = n.from_user?.username
    ? `@${n.from_user.username}`
    : n.from_user?.first_name ?? 'Someone'

  switch (n.type) {
    case 'vote_build':
      return `${actor} upvoted your build "${n.build?.title ?? 'a build'}"`
    case 'new_comment':
      return `${actor} commented on "${n.build?.title ?? 'your build'}"`
    case 'new_reply':
      return `${actor} replied to your comment`
    case 'vote_comment':
      return `${actor} upvoted your comment`
    case 'new_follower':
      return `${actor} started following you`
    default:
      return `${actor} interacted with your content`
  }
}

function notifLink(n: Notification): string {
  if (n.build_id) {
    if (n.type === 'new_comment' || n.type === 'new_reply' || n.type === 'vote_comment') {
      return `/build/${n.build_id}#comments`
    }
    return `/build/${n.build_id}`
  }
  if (n.from_user?.username && n.type === 'new_follower') {
    return `/u/${n.from_user.username}`
  }
  return '/community'
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unread, setUnread] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const supabase = createBrowserClient()

  async function fetchNotifications() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    try {
      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (!res.ok) return
      const { notifications: list, unread: count } = await res.json()
      setNotifications(list ?? [])
      setUnread(count ?? 0)
      setLoaded(true)
    } catch { /* noop */ }
  }

  async function markAllRead() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    setUnread(0)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
  }

  // Load on mount, poll every 60s
  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 60_000)
    return () => clearInterval(interval)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  if (!loaded) return null

  return (
    <div className="notif-wrap" ref={menuRef}>
      <button
        className="notif-bell-btn"
        onClick={() => {
          setOpen(o => !o)
          if (!open && unread > 0) markAllRead()
        }}
        aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ''}`}
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && (
          <span className="notif-badge">{unread > 9 ? '9+' : unread}</span>
        )}
      </button>

      {open && (
        <div className="notif-menu">
          <div className="notif-menu-header">
            <span className="notif-menu-title">NOTIFICATIONS</span>
            {unread > 0 && (
              <button className="notif-mark-read" onClick={markAllRead}>
                Mark all read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="notif-empty">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <span>No notifications yet</span>
            </div>
          ) : (
            <div className="notif-list">
              {notifications.map(n => (
                <Link
                  key={n.id}
                  href={notifLink(n)}
                  className={`notif-item${n.read ? '' : ' unread'}`}
                  onClick={() => setOpen(false)}
                >
                  <div className="notif-dot-wrap">
                    {!n.read && <div className="notif-unread-dot" />}
                  </div>
                  <div className="notif-item-body">
                    <p className="notif-item-text">{notifText(n)}</p>
                    <span className="notif-item-time">{timeAgo(n.created_at)}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

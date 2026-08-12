import { useEffect, useState } from 'react'
import { Bell, Heart, MessageCircle, UserPlus, Calendar } from 'lucide-react'
import type { NotificationDto } from '@delve/contracts'
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../api/socialClient'

function iconFor(type: string) {
  if (type.includes('FOLLOW')) return <UserPlus size={18} />
  if (type.includes('LIKE') || type.includes('REACTION')) return <Heart size={18} />
  if (type.includes('COMMENT')) return <MessageCircle size={18} />
  if (type.includes('EVENT')) return <Calendar size={18} />
  return <Bell size={18} />
}

function timeLabel(iso: string) {
  const ms = Date.now() - new Date(iso).getTime()
  const m = Math.floor(ms / 60000)
  if (m < 60) return `${Math.max(1, m)}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return new Date(iso).toLocaleDateString()
}

export default function NotificationsPage({
  authReady = true,
  signedIn = true,
}: {
  authReady?: boolean
  signedIn?: boolean
}) {
  const [notifs, setNotifs] = useState<NotificationDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!authReady) {
      setLoading(true)
      setError(null)
      return
    }
    if (!signedIn) {
      setLoading(false)
      setNotifs([])
      setError('Sign in required')
      return
    }

    let cancelled = false
    void (async () => {
      setLoading(true)
      try {
        const data = await fetchNotifications()
        if (!cancelled) {
          setNotifs(data)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load notifications')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [authReady, signedIn])

  const unreadCount = notifs.filter(n => !n.readAt).length

  async function markAllRead() {
    try {
      await markAllNotificationsRead()
      setNotifs(prev => prev.map(n => ({ ...n, readAt: n.readAt || new Date().toISOString() })))
    } catch {
      /* ignore */
    }
  }

  async function markRead(id: string) {
    try {
      await markNotificationRead(id)
      setNotifs(prev =>
        prev.map(n => (n.id === id ? { ...n, readAt: n.readAt || new Date().toISOString() } : n)),
      )
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="pb-4">
      <div
        className="flex items-center justify-between px-4 sm:px-0 py-2.5"
        style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
      >
        <span className="text-sm" style={{ color: 'var(--fg-muted)' }}>
          {unreadCount} unread
        </span>
        <button
          type="button"
          onClick={() => void markAllRead()}
          className="text-sm font-semibold active:opacity-70"
          style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}
        >
          Mark all read
        </button>
      </div>

      {loading && (
        <p className="px-4 py-8 text-sm" style={{ color: 'var(--fg-muted)' }}>Loading…</p>
      )}
      {error && !loading && (
        <p className="px-4 py-8 text-sm" style={{ color: 'var(--auth-danger)' }} role="alert">{error}</p>
      )}
      {!loading && !error && notifs.length === 0 && (
        <div className="px-6 py-14 text-center">
          <Bell size={28} style={{ color: 'var(--fg-muted)', margin: '0 auto 10px' }} />
          <p className="text-sm font-semibold m-0 mb-1" style={{ color: 'var(--fg)' }}>You are all caught up</p>
          <p className="text-sm m-0" style={{ color: 'var(--fg-muted)' }}>
            Follows, likes, comments, and event updates will show up here.
          </p>
        </div>
      )}

      <div className="sm:rounded-2xl overflow-hidden sm:border sm:mt-3" style={{ borderColor: 'var(--border)' }}>
        {notifs.map(n => {
          const unread = !n.readAt
          return (
            <button
              key={n.id}
              type="button"
              onClick={() => void markRead(n.id)}
              className="w-full flex gap-3 px-4 py-3.5 text-left"
              style={{
                background: unread ? 'rgba(140,82,255,0.06)' : 'var(--surface)',
                borderBottom: '1px solid var(--border)',
                cursor: 'pointer',
              }}
            >
              <span
                className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(140,82,255,0.12)', color: 'var(--primary)' }}
              >
                {iconFor(n.type)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold" style={{ color: 'var(--fg)' }}>{n.title}</span>
                {n.body && (
                  <span className="block text-sm mt-0.5" style={{ color: 'var(--fg-muted)' }}>{n.body}</span>
                )}
                <span className="block text-[11px] mt-1" style={{ color: 'var(--fg-muted)' }}>
                  {timeLabel(n.createdAt)}
                </span>
              </span>
              {unread && (
                <span className="h-2.5 w-2.5 rounded-full mt-2 flex-shrink-0" style={{ background: 'var(--primary)' }} />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

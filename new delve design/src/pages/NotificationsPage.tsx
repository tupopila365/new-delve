import { useEffect, useState } from 'react'
import { Bell, Heart, MessageCircle, UserPlus, Calendar, MapPin, Users } from 'lucide-react'
import type { NotificationDto } from '@delve/contracts'
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../api/socialClient'
import { SectionHeader, SectionEmpty, ConfirmDialog } from '../components/shared'

function iconFor(type: string) {
  if (type.includes('MESSAGE')) return <MessageCircle size={18} />
  if (type.includes('FOLLOW')) return <UserPlus size={18} />
  if (type.includes('JOURNEY')) return <MapPin size={18} />
  if (type.includes('COMMUNITY')) return <Users size={18} />
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
  onOpenJourney,
  onOpenEvent,
  onOpenConversation,
  onOpenCommunityThread,
}: {
  authReady?: boolean
  signedIn?: boolean
  onOpenJourney?: (journeyId: string) => void
  onOpenEvent?: (eventId: string) => void
  onOpenConversation?: (conversationId: string) => void
  onOpenCommunityThread?: (threadId: string) => void
}) {
  const [notifs, setNotifs] = useState<NotificationDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [confirmMarkAllOpen, setConfirmMarkAllOpen] = useState(false)
  const [busyMarking, setBusyMarking] = useState(false)

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

  async function handleConfirmMarkAll() {
    setBusyMarking(true)
    try {
      await markAllNotificationsRead()
      setNotifs(prev => prev.map(n => ({ ...n, readAt: n.readAt || new Date().toISOString() })))
      setConfirmMarkAllOpen(false)
    } catch {
      /* ignore */
    } finally {
      setBusyMarking(false)
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

  function openNotification(n: NotificationDto) {
    void markRead(n.id)
    if (n.entityType === 'conversation' && n.entityId && onOpenConversation) {
      onOpenConversation(n.entityId)
      return
    }
    if (n.entityType === 'journey' && n.entityId && onOpenJourney) {
      onOpenJourney(n.entityId)
      return
    }
    if (n.entityType === 'event' && n.entityId && onOpenEvent) {
      onOpenEvent(n.entityId)
      return
    }
    if (n.entityType === 'community_thread' && n.entityId && onOpenCommunityThread) {
      onOpenCommunityThread(n.entityId)
    }
  }

  return (
    <div className="pb-4">
      <div className="px-4 sm:px-0 pt-4 pb-2">
        <SectionHeader
          title="Notifications"
          subtitle={unreadCount > 0 ? `${unreadCount} unread update${unreadCount === 1 ? '' : 's'}` : 'All caught up'}
          actionLabel={unreadCount > 0 ? 'Mark all read' : undefined}
          onActionClick={unreadCount > 0 ? () => setConfirmMarkAllOpen(true) : undefined}
          icon={<Bell size={20} />}
        />
      </div>

      {loading && (
        <p className="px-4 py-8 text-sm" style={{ color: 'var(--fg-muted)' }}>Loading…</p>
      )}
      {error && !loading && (
        <p className="px-4 py-8 text-sm" style={{ color: 'var(--auth-danger)' }} role="alert">{error}</p>
      )}
      {!loading && !error && notifs.length === 0 && (
        <div className="px-4 sm:px-0 py-8">
          <SectionEmpty
            icon={<Bell size={28} />}
            title="You are all caught up"
            description="Follows, likes, comments, community updates, journeys, and event updates will show up here."
          />
        </div>
      )}

      <div className="sm:rounded-2xl overflow-hidden sm:border sm:mt-3" style={{ borderColor: 'var(--border)' }}>
        {notifs.map(n => {
          const unread = !n.readAt
          return (
            <button
              key={n.id}
              type="button"
              onClick={() => openNotification(n)}
              className="w-full flex gap-3 px-4 py-3.5 text-left transition-colors hover:opacity-90 active:scale-[0.99]"
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

      <ConfirmDialog
        isOpen={confirmMarkAllOpen}
        title="Mark All as Read?"
        description="This will mark all unread notifications as read across your account."
        confirmLabel="Mark all read"
        cancelLabel="Keep unread"
        variant="info"
        isLoading={busyMarking}
        onCancel={() => setConfirmMarkAllOpen(false)}
        onConfirm={handleConfirmMarkAll}
      />
    </div>
  )
}

import { useEffect } from 'react'
import { Bell, Calendar, MapPin, Heart, Users, MessageCircle, X } from 'lucide-react'
import type { NotificationDto } from '@delve/contracts'

interface Props {
  notification: NotificationDto | null
  onDismiss: () => void
  onOpen: (notification: NotificationDto) => void
}

function iconFor(type: string) {
  if (type.includes('EVENT')) return <Calendar size={16} className="text-amber-400" />
  if (type.includes('JOURNEY')) return <MapPin size={16} className="text-indigo-400" />
  if (type.includes('COMMUNITY')) return <Users size={16} className="text-purple-400" />
  if (type.includes('LIKE') || type.includes('REACTION')) return <Heart size={16} className="text-rose-400" />
  if (type.includes('MESSAGE')) return <MessageCircle size={16} className="text-cyan-400" />
  return <Bell size={16} className="text-white" />
}

export default function InAppNotificationToast({ notification, onDismiss, onOpen }: Props) {
  useEffect(() => {
    if (!notification) return

    const timer = setTimeout(() => {
      onDismiss()
    }, 6000)

    return () => clearTimeout(timer)
  }, [notification, onDismiss])

  if (!notification) return null

  return (
    <aside
      aria-live="polite"
      aria-label="New notification"
      className="fixed top-16 right-4 sm:right-6 z-[100] max-w-sm w-full animate-in slide-in-from-top-4 fade-in duration-250"
    >
      <div
        onClick={() => {
          onOpen(notification)
          onDismiss()
        }}
        className="group relative flex items-start gap-3 p-3.5 rounded-2xl bg-neutral-900/95 hover:bg-neutral-900 border border-white/15 backdrop-blur-xl shadow-2xl cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
      >
        <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center shrink-0 shadow-inner">
          {iconFor(notification.type)}
        </div>

        <div className="flex-1 min-w-0 pr-4">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-white truncate">
              {notification.title}
            </span>
            <span className="text-[10px] text-neutral-400">· Just now</span>
          </div>
          {notification.body && (
            <p className="text-xs text-neutral-300 line-clamp-2 m-0 mt-0.5 leading-snug">
              {notification.body}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={e => {
            e.stopPropagation()
            onDismiss()
          }}
          className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-neutral-400 hover:text-white transition-colors shrink-0"
          aria-label="Dismiss notification"
        >
          <X size={13} />
        </button>
      </div>
    </aside>
  )
}

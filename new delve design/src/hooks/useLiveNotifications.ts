import { useState, useEffect, useRef } from 'react'
import type { NotificationDto } from '@delve/contracts'
import { fetchNotifications } from '../api/socialClient'

const NOTIFICATION_POLL_MS = 10_000

export function useLiveNotifications(enabled: boolean) {
  const [unreadCount, setUnreadCount] = useState(0)
  const [activeToast, setActiveToast] = useState<NotificationDto | null>(null)
  const knownIdsRef = useRef<Set<string>>(new Set())
  const initialLoadRef = useRef(true)

  useEffect(() => {
    if (!enabled) {
      setUnreadCount(0)
      setActiveToast(null)
      knownIdsRef.current.clear()
      initialLoadRef.current = true
      return
    }

    let isMounted = true

    const poll = async () => {
      try {
        const notifs = await fetchNotifications()
        if (!isMounted || !notifs) return

        const unread = notifs.filter(n => !n.readAt)
        setUnreadCount(unread.length)

        // Check if there are newly arrived notifications
        if (!initialLoadRef.current) {
          const newNotifs = unread.filter(n => !knownIdsRef.current.has(n.id))
          if (newNotifs.length > 0) {
            const newest = newNotifs[0]
            setActiveToast(newest)
          }
        } else {
          initialLoadRef.current = false
        }

        // Keep track of all seen notification IDs
        notifs.forEach(n => knownIdsRef.current.add(n.id))
      } catch {
        // Silently continue polling on transient network error
      }
    }

    void poll()
    const timer = window.setInterval(poll, NOTIFICATION_POLL_MS)

    return () => {
      isMounted = false
      window.clearInterval(timer)
    }
  }, [enabled])

  const dismissToast = () => setActiveToast(null)

  return {
    unreadCount,
    activeToast,
    dismissToast,
  }
}

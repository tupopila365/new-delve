import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Bell } from 'lucide-react'
import { apiFetch } from '../api/client'
import type { AdminNotification } from '../api/types'

export function DelveAdminNotifications() {
  const [open, setOpen] = useState(false)

  const { data: items = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => apiFetch<AdminNotification[]>('/api/accounts/admin/notifications/'),
    refetchInterval: 30_000,
  })

  const count = items.filter((n) => n.level === 'critical' || n.level === 'high').length

  return (
    <div className="da-notify">
      <button
        type="button"
        className="da-notify__btn"
        aria-label={`Notifications${count ? `, ${count} urgent` : ''}`}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <Bell size={18} strokeWidth={2.25} aria-hidden />
        {count > 0 ? <span className="da-notify__badge">{count > 9 ? '9+' : count}</span> : null}
      </button>

      {open ? (
        <>
          <button type="button" className="da-notify__backdrop" aria-label="Close" onClick={() => setOpen(false)} />
          <div className="da-notify__panel" role="dialog" aria-label="Admin notifications">
            <div className="da-notify__panel-head">
              <strong>Alerts</strong>
              <button type="button" onClick={() => setOpen(false)}>
                ×
              </button>
            </div>
            {items.length === 0 ? (
              <p className="da-notify__empty">All clear — nothing needs urgent attention.</p>
            ) : (
              <ul className="da-notify__list">
                {items.map((n) => (
                  <li key={n.id} className={`da-notify__item da-notify__item--${n.level}`}>
                    <Link to={n.action_to} onClick={() => setOpen(false)}>
                      <strong>{n.title}</strong>
                      <span>{n.message}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      ) : null}
    </div>
  )
}

import type { ReactNode } from 'react'
import { Brand } from './Brand'

export function StatusCard({
  title,
  detail,
  actionLabel,
  onAction,
  children,
}: {
  title: string
  detail: string
  actionLabel?: string
  onAction?: () => void
  children?: ReactNode
}) {
  return (
    <main className="rounded-2xl p-8" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <Brand />
      <h1 className="text-2xl font-extrabold m-0 mt-6 mb-2" style={{ fontFamily: 'Syne, sans-serif' }}>
        {title}
      </h1>
      <p className="text-sm m-0" style={{ color: 'var(--muted)', lineHeight: 1.5 }}>
        {detail}
      </p>
      {children}
      {actionLabel && onAction ? (
        <button type="button" className="admin-btn mt-6" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </main>
  )
}

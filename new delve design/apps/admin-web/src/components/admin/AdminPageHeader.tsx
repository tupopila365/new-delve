import type { ReactNode } from 'react'

export function AdminPageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-2xl font-extrabold m-0" style={{ fontFamily: 'Syne, sans-serif' }}>
          {title}
        </h1>
        {description ? (
          <p className="text-sm m-0 mt-1" style={{ color: 'var(--muted)', lineHeight: 1.5 }}>
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </header>
  )
}

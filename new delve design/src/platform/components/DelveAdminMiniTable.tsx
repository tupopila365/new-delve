import type { ReactNode } from 'react'

export type MiniTableRow = {
  id: string | number
  primary: string
  secondary?: string
  badge?: ReactNode
  action?: ReactNode
  meta?: ReactNode
}

type Props = {
  rows: MiniTableRow[]
  emptyMessage?: string
}

export function DelveAdminMiniTable({ rows, emptyMessage = 'Nothing here yet.' }: Props) {
  if (rows.length === 0) {
    return <p className="da-mini-table__empty">{emptyMessage}</p>
  }

  return (
    <ul className="da-mini-table">
      {rows.map((row) => (
        <li key={row.id} className="da-mini-table__row">
          <div className="da-mini-table__copy">
            <strong>{row.primary}</strong>
            {row.secondary ? <span>{row.secondary}</span> : null}
          </div>
          {row.badge}
          {row.meta}
          {row.action}
        </li>
      ))}
    </ul>
  )
}

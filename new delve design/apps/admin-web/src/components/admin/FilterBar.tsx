import type { ReactNode } from 'react'

export function FilterBar({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap gap-2 mb-3">{children}</div>
}

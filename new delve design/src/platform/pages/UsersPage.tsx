import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '../api/client'
import type { AdminUser } from '../api/types'
import {
  DelveAdminDataRow,
  DelveAdminEmpty,
  DelveAdminError,
  DelveAdminFilterBar,
  DelveAdminFilterChip,
  DelveAdminLoading,
  DelveAdminPageHeader,
  DelveAdminStatGrid,
  DelveAdminStatusBadge,
  UserInspectorDrawer,
} from '../components'
import { userStatusLabel, userStatusVariant } from '../data/demoData'

const TYPE_FILTERS = ['All', 'Travellers', 'Providers', 'Admins'] as const
const STATUS_FILTERS = ['All statuses', 'Active', 'Suspended'] as const

export function UsersPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const inspectParam = searchParams.get('inspect')
  const [selectedId, setSelectedId] = useState<number | null>(
    inspectParam ? Number(inspectParam) || null : null,
  )
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<(typeof TYPE_FILTERS)[number]>('All')
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>('All statuses')

  useEffect(() => {
    if (inspectParam) {
      const id = Number(inspectParam)
      if (id) setSelectedId(id)
    }
  }, [inspectParam])

  const { data: users = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['users'],
    queryFn: () => apiFetch<AdminUser[]>('/api/accounts/admin/users/'),
  })

  const filtered = useMemo(() => {
    let rows = users
    if (typeFilter === 'Travellers') rows = rows.filter((u) => u.user_type !== 'service_provider' && !u.is_staff)
    if (typeFilter === 'Providers') rows = rows.filter((u) => u.user_type === 'service_provider')
    if (typeFilter === 'Admins') rows = rows.filter((u) => u.is_staff)
    if (statusFilter === 'Active') rows = rows.filter((u) => u.is_active)
    if (statusFilter === 'Suspended') rows = rows.filter((u) => !u.is_active)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      rows = rows.filter(
        (u) =>
          u.username.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          (u.display_name || '').toLowerCase().includes(q),
      )
    }
    return rows
  }, [users, typeFilter, statusFilter, search])

  const closeInspector = () => {
    setSelectedId(null)
    if (inspectParam) {
      const next = new URLSearchParams(searchParams)
      next.delete('inspect')
      setSearchParams(next, { replace: true })
    }
  }

  if (isLoading) {
    return (
      <div className="da-page">
        <DelveAdminPageHeader title="Users" subtitle="Search, filter, and manage platform accounts." />
        <DelveAdminLoading count={6} />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="da-page">
        <DelveAdminPageHeader title="Users" subtitle="Search, filter, and manage platform accounts." />
        <DelveAdminError message="Could not load users." onRetry={() => void refetch()} />
      </div>
    )
  }

  const stats = {
    total: users.length,
    active: users.filter((u) => u.is_active).length,
    providers: users.filter((u) => u.user_type === 'service_provider').length,
    suspended: users.filter((u) => !u.is_active).length,
  }

  return (
    <div className="da-page">
      <DelveAdminPageHeader title="Users" subtitle="Search, filter, and manage platform accounts." />

      <DelveAdminStatGrid
        stats={[
          { value: stats.total, label: 'Total users' },
          { value: stats.active, label: 'Active' },
          { value: stats.providers, label: 'Providers' },
          { value: stats.suspended, label: 'Suspended', warn: stats.suspended > 0 },
        ]}
      />

      <DelveAdminFilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search users…">
        {TYPE_FILTERS.map((f) => (
          <DelveAdminFilterChip key={f} label={f} active={typeFilter === f} onClick={() => setTypeFilter(f)} />
        ))}
        {STATUS_FILTERS.map((f) => (
          <DelveAdminFilterChip key={f} label={f} active={statusFilter === f} onClick={() => setStatusFilter(f)} />
        ))}
      </DelveAdminFilterBar>

      {filtered.length === 0 ? (
        <DelveAdminEmpty title="No users match" message="Try changing your search or filters." />
      ) : (
        <div className="da-stack">
          {filtered.map((u) => {
            const status = u.is_active ? (u.is_staff ? 'Admin' : userStatusLabel(u)) : 'Suspended'
            return (
              <DelveAdminDataRow
                key={u.id}
                primary={u.display_name || u.username}
                secondary={`@${u.username} · ${u.email}`}
                badge={<DelveAdminStatusBadge status={status} variant={userStatusVariant(status)} />}
                actions={
                  <button type="button" className="da-link-btn" onClick={() => setSelectedId(u.id)}>
                    Inspect
                  </button>
                }
              />
            )
          })}
        </div>
      )}

      <UserInspectorDrawer userId={selectedId} onClose={closeInspector} />
    </div>
  )
}

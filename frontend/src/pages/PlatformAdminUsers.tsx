import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '../api/client'
import {
  AdminFilterBar,
  AdminFilterChip,
  AdminPageHeader,
  AdminStatGrid,
  AdminStatusBadge,
} from '../components/admin'
import { EmptyState, ListSkeleton } from '../components/ui'
import { DEMO_ANALYTICS, userStatusLabel, userStatusVariant } from '../data/adminData'

type PlatformUser = {
  id: number
  username: string
  email: string
  is_active: boolean
  is_staff: boolean
  user_type: string
  display_name: string
  date_joined: string
}

const TYPE_FILTERS = ['All', 'Travellers', 'Providers', 'Admins'] as const
const STATUS_FILTERS = ['All statuses', 'Active', 'Suspended', 'Staff'] as const

export function PlatformAdminUsers() {
  const { data: users = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['platform-users'],
    queryFn: () => apiFetch<PlatformUser[]>('/api/accounts/admin/users/'),
  })

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<(typeof TYPE_FILTERS)[number]>('All')
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>('All statuses')

  const filtered = useMemo(() => {
    let rows = users
    if (typeFilter === 'Travellers') rows = rows.filter((u) => u.user_type !== 'service_provider' && !u.is_staff)
    if (typeFilter === 'Providers') rows = rows.filter((u) => u.user_type === 'service_provider')
    if (typeFilter === 'Admins') rows = rows.filter((u) => u.is_staff)
    if (statusFilter === 'Active') rows = rows.filter((u) => u.is_active)
    if (statusFilter === 'Suspended') rows = rows.filter((u) => !u.is_active)
    if (statusFilter === 'Staff') rows = rows.filter((u) => u.is_staff)
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

  const stats = {
    total: users.length,
    providers: users.filter((u) => u.user_type === 'service_provider').length,
    staff: users.filter((u) => u.is_staff).length,
    active: users.filter((u) => u.is_active).length,
  }

  return (
    <div className="adm-page">
      <AdminPageHeader title="Users" subtitle="Search, filter, and monitor platform accounts." />

      {isLoading ? (
        <ListSkeleton count={6} />
      ) : isError ? (
        <p className="adm-page__error" role="alert">
          We couldn&apos;t load users.{' '}
          <button type="button" className="adm-page__retry" onClick={() => void refetch()}>
            Try again
          </button>
        </p>
      ) : (
        <>
          <AdminStatGrid
            stats={[
              { value: stats.total, label: 'Total users' },
              { value: DEMO_ANALYTICS.newUsersWeek, label: 'New this week', accent: true },
              { value: stats.active, label: 'Active users' },
              { value: stats.providers, label: 'Providers' },
              { value: 0, label: 'Flagged' },
              { value: users.filter((u) => !u.is_active).length, label: 'Suspended', warn: users.some((u) => !u.is_active) },
            ]}
          />

          <AdminFilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search users…">
            {TYPE_FILTERS.map((f) => (
              <AdminFilterChip key={f} label={f} active={typeFilter === f} onClick={() => setTypeFilter(f)} />
            ))}
            {STATUS_FILTERS.map((f) => (
              <AdminFilterChip key={f} label={f} active={statusFilter === f} onClick={() => setStatusFilter(f)} sub />
            ))}
          </AdminFilterBar>

          {users.length === 0 ? (
            <EmptyState compact icon="👤" title="No users found" sub="User accounts will appear here." />
          ) : filtered.length === 0 ? (
            <EmptyState compact icon="🔍" title="No users match your filters" sub="Try changing your search or filters." />
          ) : (
            <div className="adm-data-table">
              <div className="adm-data-table__head adm-data-table__head--users" aria-hidden>
                <span>User</span>
                <span>Type</span>
                <span>Status</span>
                <span>Joined</span>
                <span>Actions</span>
              </div>
              {filtered.map((u) => {
                const status = u.is_active ? (u.is_staff ? 'Admin' : userStatusLabel(u)) : 'Suspended'
                return (
                  <div key={u.id} className="adm-data-table__row adm-data-table__row--users">
                    <div className="adm-data-table__primary">
                      <strong>{u.display_name || u.username}</strong>
                      <span>@{u.username} · {u.email}</span>
                    </div>
                    <AdminStatusBadge status={u.user_type === 'service_provider' ? 'Provider' : 'Traveller'} variant="info" />
                    <AdminStatusBadge status={status} variant={userStatusVariant(status)} />
                    <span className="adm-data-table__muted">{new Date(u.date_joined).toLocaleDateString()}</span>
                    <div className="adm-data-table__actions">
                      <Link to={`/u/${u.username}`} className="btn btn-ghost btn--sm">
                        View profile
                      </Link>
                      <button type="button" className="btn btn-ghost btn--sm" disabled title="Coming soon">
                        Suspend
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}

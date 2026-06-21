import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../api/client'
import type { AdminUser } from '../api/types'
import {
  DelveAdminDataRow,
  DelveAdminDrawer,
  DelveAdminEmpty,
  DelveAdminError,
  DelveAdminFilterBar,
  DelveAdminFilterChip,
  DelveAdminLoading,
  DelveAdminPageHeader,
  DelveAdminStatGrid,
  DelveAdminStatusBadge,
} from '../components'
import { userStatusLabel, userStatusVariant } from '../data/demoData'

const TYPE_FILTERS = ['All', 'Travellers', 'Providers', 'Admins'] as const
const STATUS_FILTERS = ['All statuses', 'Active', 'Suspended'] as const

export function UsersPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<(typeof TYPE_FILTERS)[number]>('All')
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>('All statuses')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleteError, setDeleteError] = useState('')

  const { data: users = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['users'],
    queryFn: () => apiFetch<AdminUser[]>('/api/accounts/admin/users/'),
  })

  const { data: detail, isLoading: loadingDetail } = useQuery({
    queryKey: ['user', selectedId],
    queryFn: () => apiFetch<AdminUser>(`/api/accounts/admin/users/${selectedId}/`),
    enabled: selectedId != null,
  })

  const updateMut = useMutation({
    mutationFn: (payload: { id: number; is_active?: boolean; is_staff?: boolean }) =>
      apiFetch<AdminUser>(`/api/accounts/admin/users/${payload.id}/update/`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: payload.is_active, is_staff: payload.is_staff }),
      }),
    onSuccess: (updated) => {
      void qc.invalidateQueries({ queryKey: ['users'] })
      void qc.invalidateQueries({ queryKey: ['user', updated.id] })
      void qc.invalidateQueries({ queryKey: ['activity'] })
    },
  })

  const deleteMut = useMutation({
    mutationFn: (payload: { id: number; confirm_username: string }) =>
      apiFetch<{ detail: string }>(`/api/accounts/admin/users/${payload.id}/delete/`, {
        method: 'POST',
        body: JSON.stringify({ confirm_username: payload.confirm_username }),
      }),
    onSuccess: () => {
      setDeleteOpen(false)
      setDeleteConfirm('')
      setDeleteError('')
      setSelectedId(null)
      void qc.invalidateQueries({ queryKey: ['users'] })
      void qc.invalidateQueries({ queryKey: ['activity'] })
    },
    onError: () => setDeleteError('Could not delete account. Check the username and try again.'),
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
                    Manage
                  </button>
                }
              />
            )
          })}
        </div>
      )}

      <DelveAdminDrawer
        open={selectedId != null}
        title={detail?.display_name || detail?.username || 'User'}
        onClose={() => setSelectedId(null)}
      >
        {loadingDetail || !detail ? (
          <DelveAdminLoading count={2} />
        ) : (
          <div className="da-user-detail">
            <dl className="da-dl">
              <div>
                <dt>Username</dt>
                <dd>@{detail.username}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{detail.email}</dd>
              </div>
              <div>
                <dt>Type</dt>
                <dd>{detail.user_type === 'service_provider' ? 'Provider' : 'Traveller'}</dd>
              </div>
              <div>
                <dt>Joined</dt>
                <dd>{new Date(detail.date_joined).toLocaleDateString()}</dd>
              </div>
              <div>
                <dt>Businesses</dt>
                <dd>{detail.businesses_count ?? 0}</dd>
              </div>
            </dl>
            <div className="da-verify-actions">
              {detail.is_active ? (
                <button
                  type="button"
                  className="da-btn da-btn--danger"
                  disabled={updateMut.isPending}
                  onClick={() => updateMut.mutate({ id: detail.id, is_active: false })}
                >
                  Suspend account
                </button>
              ) : (
                <button
                  type="button"
                  className="da-btn da-btn--primary"
                  disabled={updateMut.isPending}
                  onClick={() => updateMut.mutate({ id: detail.id, is_active: true })}
                >
                  Reactivate account
                </button>
              )}
              {!detail.is_staff ? (
                <button
                  type="button"
                  className="da-btn da-btn--ghost"
                  disabled={updateMut.isPending}
                  onClick={() => updateMut.mutate({ id: detail.id, is_staff: true })}
                >
                  Make platform admin
                </button>
              ) : (
                <button
                  type="button"
                  className="da-btn da-btn--ghost"
                  disabled={updateMut.isPending}
                  onClick={() => updateMut.mutate({ id: detail.id, is_staff: false })}
                >
                  Remove admin access
                </button>
              )}
              {!detail.username.startsWith('deleted_') && !detail.is_staff ? (
                <button
                  type="button"
                  className="da-btn da-btn--danger"
                  disabled={updateMut.isPending}
                  onClick={() => {
                    setDeleteConfirm('')
                    setDeleteError('')
                    setDeleteOpen(true)
                  }}
                >
                  Delete account (GDPR)
                </button>
              ) : null}
            </div>
          </div>
        )}
      </DelveAdminDrawer>

      {deleteOpen && detail ? (
        <>
          <button type="button" className="da-drawer__backdrop" aria-label="Close" onClick={() => setDeleteOpen(false)} />
          <aside className="da-drawer da-drawer--confirm" role="dialog" aria-modal="true">
            <div className="da-drawer__head">
              <h2>Delete account</h2>
              <button type="button" className="da-drawer__close" onClick={() => setDeleteOpen(false)}>
                ×
              </button>
            </div>
            <div className="da-drawer__body">
              <p className="da-delete-copy">
                This permanently anonymizes <strong>@{detail.username}</strong>. Personal data is removed, posts hidden,
                and listings unpublished. Booking records are kept without PII for legal/financial compliance.
              </p>
              <label className="da-field">
                <span>Type <strong>{detail.username}</strong> to confirm</span>
                <input
                  type="text"
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                />
              </label>
              {deleteError ? (
                <p className="da-delete-error" role="alert">
                  {deleteError}
                </p>
              ) : null}
              <div className="da-verify-actions">
                <button type="button" className="da-btn da-btn--ghost" onClick={() => setDeleteOpen(false)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="da-btn da-btn--danger"
                  disabled={deleteMut.isPending || deleteConfirm !== detail.username}
                  onClick={() =>
                    deleteMut.mutate({ id: detail.id, confirm_username: deleteConfirm })
                  }
                >
                  {deleteMut.isPending ? 'Deleting…' : 'Permanently delete'}
                </button>
              </div>
            </div>
          </aside>
        </>
      ) : null}
    </div>
  )
}

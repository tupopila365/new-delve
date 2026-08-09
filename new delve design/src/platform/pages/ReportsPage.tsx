import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../api/client'
import type { AdminReport } from '../api/types'
import {
  DelveAdminDataRow,
  DelveAdminEmpty,
  DelveAdminError,
  DelveAdminFilterBar,
  DelveAdminFilterChip,
  DelveAdminLoading,
  DelveAdminPageHeader,
  DelveAdminStatusBadge,
} from '../components'
import { severityVariant, statusVariant } from '../data/demoData'

const STATUS_FILTERS = ['All', 'New', 'Under review', 'Escalated', 'Resolved', 'Dismissed'] as const

const STATUS_MAP: Record<string, string> = {
  New: 'new',
  'Under review': 'under_review',
  Escalated: 'escalated',
  Resolved: 'resolved',
  Dismissed: 'dismissed',
}

export function ReportsPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>('All')
  const [selected, setSelected] = useState<AdminReport | null>(null)
  const [notes, setNotes] = useState('')

  const { data: reports = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['reports'],
    queryFn: () => apiFetch<AdminReport[]>('/api/accounts/admin/reports/'),
  })

  const actionMut = useMutation({
    mutationFn: ({
      id,
      action,
      status,
      admin_notes,
    }: {
      id: number
      action?: string
      status?: string
      admin_notes?: string
    }) =>
      apiFetch<AdminReport>(`/api/accounts/admin/reports/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify({ action, status, admin_notes }),
      }),
    onSuccess: () => {
      setSelected(null)
      setNotes('')
      void qc.invalidateQueries({ queryKey: ['reports'] })
      void qc.invalidateQueries({ queryKey: ['overview'] })
      void qc.invalidateQueries({ queryKey: ['activity'] })
      void qc.invalidateQueries({ queryKey: ['moderation'] })
    },
  })

  const filtered = useMemo(() => {
    let rows = reports
    if (statusFilter !== 'All') {
      rows = rows.filter((r) => r.status === STATUS_MAP[statusFilter])
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      rows = rows.filter(
        (r) =>
          r.target_label.toLowerCase().includes(q) ||
          r.reporter_username.toLowerCase().includes(q) ||
          r.reason_label.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q),
      )
    }
    return rows
  }, [reports, statusFilter, search])

  if (isLoading) {
    return (
      <div className="da-page">
        <DelveAdminPageHeader title="Reports" subtitle="Complaints and safety reports from travellers." />
        <DelveAdminLoading count={5} />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="da-page">
        <DelveAdminPageHeader title="Reports" subtitle="Complaints and safety reports from travellers." />
        <DelveAdminError message="Could not load reports." onRetry={() => void refetch()} />
      </div>
    )
  }

  return (
    <div className="da-page">
      <DelveAdminPageHeader
        title="Reports"
        subtitle={`${reports.filter((r) => r.status === 'new' || r.status === 'escalated').length} need attention.`}
      />

      <DelveAdminFilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search reports…">
        {STATUS_FILTERS.map((f) => (
          <DelveAdminFilterChip key={f} label={f} active={statusFilter === f} onClick={() => setStatusFilter(f)} />
        ))}
      </DelveAdminFilterBar>

      {filtered.length === 0 ? (
        <DelveAdminEmpty title="No reports" message="Reports from travellers will appear here." />
      ) : (
        <div className="da-stack">
          {filtered.map((r) => (
            <DelveAdminDataRow
              key={r.id}
              primary={`${r.target_type}: ${r.target_label || r.target_id}`}
              secondary={`@${r.reporter_username} · ${r.reason_label}${r.description ? ` — ${r.description}` : ''}`}
              badge={
                <>
                  <DelveAdminStatusBadge status={r.severity} variant={severityVariant(r.severity)} />
                  <DelveAdminStatusBadge status={r.status} variant={statusVariant(r.status)} />
                </>
              }
              actions={
                <button type="button" className="da-link-btn" onClick={() => setSelected(r)}>
                  Review
                </button>
              }
            />
          ))}
        </div>
      )}

      {selected ? (
        <>
          <button type="button" className="da-drawer__backdrop" aria-label="Close" onClick={() => setSelected(null)} />
          <aside className="da-drawer" role="dialog" aria-modal="true">
            <div className="da-drawer__head">
              <h2>Report #{selected.id}</h2>
              <button type="button" className="da-drawer__close" onClick={() => setSelected(null)}>
                ×
              </button>
            </div>
            <div className="da-drawer__body">
              <dl className="da-dl">
                <div>
                  <dt>Target</dt>
                  <dd>
                    {selected.target_type} · {selected.target_label || selected.target_id}
                  </dd>
                </div>
                <div>
                  <dt>Reporter</dt>
                  <dd>@{selected.reporter_username}</dd>
                </div>
                <div>
                  <dt>Reason</dt>
                  <dd>{selected.reason_label}</dd>
                </div>
                {selected.description ? (
                  <div>
                    <dt>Details</dt>
                    <dd>{selected.description}</dd>
                  </div>
                ) : null}
              </dl>
              <label className="da-field">
                <span>Admin notes</span>
                <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </label>
              <div className="da-verify-actions">
                <button
                  type="button"
                  className="da-btn da-btn--ghost"
                  disabled={actionMut.isPending}
                  onClick={() =>
                    actionMut.mutate({ id: selected.id, action: 'dismiss', admin_notes: notes })
                  }
                >
                  Dismiss
                </button>
                <button
                  type="button"
                  className="da-btn da-btn--ghost"
                  disabled={actionMut.isPending}
                  onClick={() =>
                    actionMut.mutate({
                      id: selected.id,
                      action: 'warn',
                      status: 'resolved',
                      admin_notes: notes,
                    })
                  }
                >
                  Warn user
                </button>
                {(selected.target_type === 'post' || selected.target_type === 'comment') && (
                  <button
                    type="button"
                    className="da-btn da-btn--danger"
                    disabled={actionMut.isPending}
                    onClick={() =>
                      actionMut.mutate({
                        id: selected.id,
                        action: 'remove_content',
                        admin_notes: notes,
                      })
                    }
                  >
                    Remove content
                  </button>
                )}
                <button
                  type="button"
                  className="da-btn da-btn--danger"
                  disabled={actionMut.isPending}
                  onClick={() =>
                    actionMut.mutate({ id: selected.id, action: 'suspend', admin_notes: notes })
                  }
                >
                  Suspend user
                </button>
                <button
                  type="button"
                  className="da-btn da-btn--primary"
                  disabled={actionMut.isPending}
                  onClick={() =>
                    actionMut.mutate({
                      id: selected.id,
                      status: 'under_review',
                      admin_notes: notes,
                    })
                  }
                >
                  Mark under review
                </button>
              </div>
            </div>
          </aside>
        </>
      ) : null}
    </div>
  )
}

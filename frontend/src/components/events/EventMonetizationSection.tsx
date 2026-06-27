import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BarChart3, ChevronDown, ChevronUp, Link2, Plus, Repeat, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { apiFetch } from '../../api/client'
import { ProviderUiStats } from '../provider/ui'
import { EventTemplateForm } from './EventTemplateForm'

type MonetizationAnalytics = {
  days: number
  on_platform_revenue: number
  external_ticket_clicks: number
  total_bookings: number
  confirmed_bookings: number
  pending_payment: number
  events: {
    id: number
    title: string
    external_clicks: number
    bookings: number
    revenue: number
  }[]
}

type EventTemplate = {
  id: number
  title: string
  recurrence: string
  is_free: boolean
  ticket_url: string
  is_active: boolean
  spawned_count: number
  default_start_time: string
  weekday: number
}

type Props = {
  enabled: boolean
  canManage: boolean
  businessId?: number | null
  defaultRegion?: string
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function EventMonetizationSection({ enabled, canManage, businessId, defaultRegion = '' }: Props) {
  const qc = useQueryClient()
  const [showTemplateForm, setShowTemplateForm] = useState(false)

  const { data: analytics } = useQuery({
    queryKey: ['event-provider-analytics'],
    queryFn: () => apiFetch<MonetizationAnalytics>('/api/events/provider_analytics/?days=30'),
    enabled,
  })

  const { data: templates = [] } = useQuery({
    queryKey: ['event-templates'],
    queryFn: () => apiFetch<EventTemplate[]>('/api/events/templates/'),
    enabled: enabled && canManage,
  })

  const spawnMut = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/api/events/templates/${id}/spawn/`, { method: 'POST', body: JSON.stringify({}) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['provider-events'] })
      void qc.invalidateQueries({ queryKey: ['event-templates'] })
      void qc.invalidateQueries({ queryKey: ['event-provider-analytics'] })
    },
  })

  if (!enabled) return null

  return (
    <section className="ev-monetization adm-section">
      <h2 className="adm-section__title">
        <BarChart3 size={18} strokeWidth={2.25} aria-hidden />
        Monetization · 30 days
      </h2>
      <ProviderUiStats
        stats={[
          { value: `N$${(analytics?.on_platform_revenue ?? 0).toFixed(0)}`, label: 'On-platform revenue' },
          { value: analytics?.external_ticket_clicks ?? 0, label: 'External ticket clicks' },
          { value: analytics?.confirmed_bookings ?? 0, label: 'Confirmed RSVPs' },
          { value: analytics?.pending_payment ?? 0, label: 'Awaiting payment' },
        ]}
        columns={4}
      />

      {analytics?.events?.length ? (
        <div className="ev-monetization__table-wrap">
          <table className="ev-monetization__table">
            <thead>
              <tr>
                <th>Event</th>
                <th>Revenue</th>
                <th>Clicks</th>
                <th>Bookings</th>
              </tr>
            </thead>
            <tbody>
              {analytics.events.map((row) => (
                <tr key={row.id}>
                  <td>{row.title}</td>
                  <td>{row.revenue > 0 ? `N$${row.revenue.toFixed(0)}` : '—'}</td>
                  <td>{row.external_clicks || '—'}</td>
                  <td>{row.bookings}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {canManage ? (
        <>
          <div className="ev-monetization__templates-head">
            <h3 className="ev-monetization__subtitle">
              <Repeat size={16} strokeWidth={2.25} aria-hidden />
              Recurring templates
            </h3>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setShowTemplateForm((v) => !v)}
            >
              {showTemplateForm ? (
                <>
                  <ChevronUp size={14} aria-hidden />
                  Hide form
                </>
              ) : (
                <>
                  <Plus size={14} aria-hidden />
                  New template
                </>
              )}
            </button>
          </div>
          <p className="ev-monetization__hint">
            Templates repeat weekly or monthly. Paid templates use external ticket links only — spawn publishes a dated event each time.
          </p>

          {showTemplateForm ? (
            <div className="ev-template-form-wrap">
              <EventTemplateForm
                businessId={businessId}
                defaultRegion={defaultRegion}
                onCreated={() => setShowTemplateForm(false)}
              />
            </div>
          ) : null}

          {templates.length === 0 ? (
            <p className="ev-monetization__empty">
              No templates yet.{' '}
              {!showTemplateForm ? (
                <button type="button" className="text-link" onClick={() => setShowTemplateForm(true)}>
                  Create your first template
                </button>
              ) : (
                'Use the form above to save one.'
              )}
            </p>
          ) : (
            <ul className="ev-monetization__templates">
              {templates.map((t) => (
                <li key={t.id} className="ev-monetization__template">
                  <div>
                    <strong>{t.title}</strong>
                    <span className="ev-monetization__template-meta">
                      {t.recurrence} · {WEEKDAYS[t.weekday] ?? '—'} · {t.spawned_count} spawned
                      {!t.is_free && t.ticket_url ? (
                        <>
                          {' '}
                          · <Link2 size={12} aria-hidden /> external tickets
                        </>
                      ) : null}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={spawnMut.isPending || !t.is_active}
                    onClick={() => spawnMut.mutate(t.id)}
                  >
                    <Sparkles size={14} aria-hidden />
                    {spawnMut.isPending && spawnMut.variables === t.id ? 'Spawning…' : 'Spawn next'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : null}
    </section>
  )
}

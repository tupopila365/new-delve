import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../api/client'
import type { PlatformSettings } from '../api/types'
import {
  DelveAdminError,
  DelveAdminLoading,
  DelveAdminPageHeader,
  DelveAdminPanel,
} from '../components'

const FLAG_LABELS: Record<string, string> = {
  delvers_social: 'Delvers social feed',
  new_bookings: 'New bookings',
  provider_registration: 'Provider registration',
  maintenance_mode: 'Maintenance mode (read-only banner)',
}

export function SettingsPage() {
  const qc = useQueryClient()
  const [saved, setSaved] = useState('')

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['settings'],
    queryFn: () => apiFetch<PlatformSettings>('/api/accounts/admin/settings/'),
  })

  const saveMut = useMutation({
    mutationFn: (payload: Partial<PlatformSettings>) =>
      apiFetch<PlatformSettings>('/api/accounts/admin/settings/', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      setSaved('Settings saved.')
      void qc.invalidateQueries({ queryKey: ['settings'] })
      void qc.invalidateQueries({ queryKey: ['activity'] })
    },
  })

  if (isLoading) {
    return (
      <div className="da-page">
        <DelveAdminPageHeader title="Platform settings" subtitle="Feature flags and traveller announcements." />
        <DelveAdminLoading count={4} />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="da-page">
        <DelveAdminPageHeader title="Platform settings" subtitle="Feature flags and traveller announcements." />
        <DelveAdminError message="Could not load settings." onRetry={() => void refetch()} />
      </div>
    )
  }

  const flags = data.feature_flags

  return (
    <div className="da-page">
      <DelveAdminPageHeader
        title="Platform settings"
        subtitle={data.updated_by_username ? `Last updated by @${data.updated_by_username}` : 'Feature flags and announcements.'}
      />

      {saved ? (
        <p className="da-toast" role="status">
          {saved}
        </p>
      ) : null}

      <DelveAdminPanel title="Feature flags">
        <ul className="da-flags">
          {Object.entries(FLAG_LABELS).map(([key, label]) => (
            <li key={key}>
              <label className="da-flag">
                <input
                  type="checkbox"
                  checked={Boolean(flags[key])}
                  onChange={(e) =>
                    saveMut.mutate({ feature_flags: { ...flags, [key]: e.target.checked } })
                  }
                  disabled={saveMut.isPending}
                />
                <span>{label}</span>
              </label>
            </li>
          ))}
        </ul>
      </DelveAdminPanel>

      <DelveAdminPanel title="Platform announcement">
        <form
          className="da-settings-form"
          onSubmit={(e) => {
            e.preventDefault()
            const fd = new FormData(e.currentTarget)
            saveMut.mutate({
              announcement_title: String(fd.get('title') || ''),
              announcement_body: String(fd.get('body') || ''),
              announcement_active: fd.get('active') === 'on',
            })
          }}
        >
          <label className="da-field">
            <span className="da-flag">
              <input type="checkbox" name="active" defaultChecked={data.announcement_active} />
              Show announcement to travellers
            </span>
          </label>
          <label className="da-field">
            <span>Title</span>
            <input name="title" type="text" defaultValue={data.announcement_title} placeholder="e.g. Scheduled maintenance" />
          </label>
          <label className="da-field">
            <span>Message</span>
            <textarea name="body" rows={4} defaultValue={data.announcement_body} placeholder="Message shown on the app home screen…" />
          </label>
          <button type="submit" className="da-btn da-btn--primary" disabled={saveMut.isPending}>
            {saveMut.isPending ? 'Saving…' : 'Save announcement'}
          </button>
        </form>
      </DelveAdminPanel>
    </div>
  )
}

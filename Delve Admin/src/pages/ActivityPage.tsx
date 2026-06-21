import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '../api/client'
import type { ActivityItem } from '../api/types'
import {
  DelveAdminActivityFeed,
  DelveAdminError,
  DelveAdminLoading,
  DelveAdminPageHeader,
  DelveAdminPanel,
} from '../components'

export function ActivityPage() {
  const [live, setLive] = useState(true)

  const { data: items = [], isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['activity-all'],
    queryFn: () => apiFetch<ActivityItem[]>('/api/accounts/admin/activity/?limit=100'),
    refetchInterval: live ? 8_000 : false,
  })

  if (isLoading) {
    return (
      <div className="da-page">
        <DelveAdminPageHeader title="Activity" subtitle="Live audit log stream." />
        <DelveAdminLoading count={6} />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="da-page">
        <DelveAdminPageHeader title="Activity" subtitle="Live audit log stream." />
        <DelveAdminError message="Could not load activity feed." onRetry={() => void refetch()} />
      </div>
    )
  }

  return (
    <div className="da-page">
      <DelveAdminPageHeader title="Activity" subtitle="Live stream from the platform audit log." />

      <div className="da-live-bar">
        <label className="da-live-bar__toggle">
          <input type="checkbox" checked={live} onChange={(e) => setLive(e.target.checked)} />
          Live updates {live ? '(every 8s)' : '(paused)'}
        </label>
        {isFetching && live ? <span className="da-live-bar__pulse">Refreshing…</span> : null}
      </div>

      <DelveAdminPanel title={`Audit log · ${items.length} events`}>
        <DelveAdminActivityFeed items={items} title="" />
      </DelveAdminPanel>
    </div>
  )
}

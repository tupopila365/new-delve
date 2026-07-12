import { useQuery } from '@tanstack/react-query'
import {
  Camera,
  Clapperboard,
  Route,
  Ticket,
} from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { apiFetch } from '../api/client'
import type { MyBusiness } from '../hooks/useBusinessAccess'
import { CreateHubGrid } from '../components/create'
import { EmptyState } from '../components/ui'

export function CreateHub() {
  const { profile } = useAuth()

  const { data: businesses = [] } = useQuery({
    queryKey: ['my-businesses-create'],
    queryFn: () => apiFetch<MyBusiness[]>('/api/accounts/me/businesses/'),
    enabled: Boolean(profile),
  })

  const showProviderLink =
    profile?.user_type === 'service_provider' || businesses.length > 0

  if (!profile) {
    return (
      <div className="create-page">
        <EmptyState
          icon="✨"
          title="Create on DELVE"
          sub="Sign in to post photos, highlights, journeys, events, or ask locals."
          cta={{ label: 'Sign in', to: '/login' }}
        />
      </div>
    )
  }

  return (
    <div className="create-page">
      <CreateHubGrid
        items={[
          { to: '/create/post', label: 'Post', hint: 'Photo or video with filters, crop, and captions', Icon: Camera },
          { to: '/create/highlight', label: 'Highlight', hint: 'Story-style ring', Icon: Clapperboard },
          { to: '/journeys/new', label: 'Journey', hint: 'Trip diary', Icon: Route },
          { to: '/events/new', label: 'Event', hint: 'Publish a happening', Icon: Ticket },
        ]}
        providerHref={showProviderLink ? '/provider' : undefined}
      />
    </div>
  )
}

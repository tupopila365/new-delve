import { useQuery } from '@tanstack/react-query'
import {
  Camera,
  Car,
  Clapperboard,
  Compass,
  Hotel,
  MessageCircle,
  Route,
  Ticket,
  Utensils,
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

  const showProviderTools =
    profile?.user_type === 'service_provider' || businesses.length > 0

  if (!profile) {
    return (
      <div className="create-page">
        <EmptyState
          icon="✨"
          title="Create on DELVE"
          sub="Sign in to post photos, stories, journeys, events, or manage your business."
          cta={{ label: 'Sign in', to: '/login' }}
        />
      </div>
    )
  }

  return (
    <div className="create-page">
      <CreateHubGrid
        primary={{
          to: '/create/post',
          label: 'Photo or video post',
          hint: 'Filters, crop, captions, music — like IG & TikTok',
          Icon: Camera,
        }}
        items={[
          { to: '/stories/new', label: 'Story', Icon: Clapperboard },
          { to: '/journeys/new', label: 'Journey', Icon: Route },
          { to: '/events/new', label: 'Event', Icon: Ticket },
          { to: '/community', label: 'Ask a question', Icon: MessageCircle },
        ]}
        providerItems={
          showProviderTools
            ? [
                { to: '/provider/stays', label: 'Stay listing', Icon: Hotel },
                { to: '/provider/food', label: 'Food & drink venue', Icon: Utensils },
                { to: '/provider/guides', label: 'Guide experience', Icon: Compass },
                { to: '/provider/transport', label: 'Transport listing', Icon: Car },
                { to: '/events/new', label: 'Business event', Icon: Ticket },
              ]
            : undefined
        }
      />
    </div>
  )
}

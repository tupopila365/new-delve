import { Link } from 'react-router-dom'
import { Building2 } from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'
import { EmptyState } from '../ui'

type Props = {
  title?: string
  sub?: string
}

export function ProviderAccessGate({
  title = 'Provider tools require a business profile',
  sub = 'Create or connect a business profile to manage listings, bookings, messages, and reviews.',
}: Props) {
  const { profile } = useAuth()
  const isProviderSignup = profile?.user_type === 'service_provider'

  return (
    <div className="prov-access">
      <EmptyState
        iconElement={<Building2 size={28} strokeWidth={2.25} />}
        title={title}
        sub={
          isProviderSignup
            ? sub
            : 'Upgrade your traveller account to list on Delve, or ask a business owner to invite you to their team.'
        }
        cta={
          isProviderSignup
            ? { label: 'Start provider setup', to: '/provider' }
            : { label: 'Become a service provider', to: '/provider/start' }
        }
      />
      <p className="prov-access__alt">
        <Link to="/dashboard">Back to travel dashboard</Link>
        {isProviderSignup ? (
          <>
            {' '}
            · <Link to="/settings">Account settings</Link>
          </>
        ) : null}
      </p>
    </div>
  )
}

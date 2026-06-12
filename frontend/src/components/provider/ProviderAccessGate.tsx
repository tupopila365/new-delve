import { Link } from 'react-router-dom'
import { EmptyState } from '../ui'

type Props = {
  title?: string
  sub?: string
}

export function ProviderAccessGate({
  title = 'Provider tools require a business profile',
  sub = 'Create or connect a business profile to manage listings, bookings, messages, and reviews.',
}: Props) {
  return (
    <div className="prov-access">
      <EmptyState
        icon="🏢"
        title={title}
        sub={sub}
        cta={{ label: 'Go to account', to: '/account' }}
      />
      <p className="prov-access__alt">
        <Link to="/dashboard">Back to travel dashboard</Link>
      </p>
    </div>
  )
}

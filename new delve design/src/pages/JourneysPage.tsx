import { Map } from 'lucide-react'

/** Journeys module is deferred — intentional empty state until itinerary engine ships. */
export default function JourneysPage() {
  return (
    <div className="px-4 py-16 text-center sm:rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <Map size={32} style={{ color: 'var(--fg-muted)', margin: '0 auto 12px' }} />
      <h1 className="font-display text-xl font-extrabold m-0 mb-2" style={{ color: 'var(--fg)' }}>
        Journeys
      </h1>
      <p className="text-sm m-0 max-w-sm mx-auto" style={{ color: 'var(--fg-muted)' }}>
        Traveler itineraries are coming soon. Create posts and events from your profile in the meantime.
      </p>
    </div>
  )
}

import { Users } from 'lucide-react'

/** Communities module is deferred — intentional empty state. */
export default function CommunitiesPage() {
  return (
    <div className="px-4 py-16 text-center sm:rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <Users size={32} style={{ color: 'var(--fg-muted)', margin: '0 auto 12px' }} />
      <h1 className="font-display text-xl font-extrabold m-0 mb-2" style={{ color: 'var(--fg)' }}>
        Communities
      </h1>
      <p className="text-sm m-0 max-w-sm mx-auto" style={{ color: 'var(--fg-muted)' }}>
        Destination communities are not live yet. Follow travelers and join events while this space is built.
      </p>
    </div>
  )
}

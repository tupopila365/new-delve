import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Building2,
  FileText,
  LayoutDashboard,
  List,
  Menu,
  Settings,
  ShoppingBag,
  Tag,
  X,
} from 'lucide-react'
import type { BusinessDashboardDto, BusinessMembershipDto } from '@delve/contracts'
import { createBusiness, fetchMyBusinessDashboard } from '../api/businessClient'
import { businessPath } from '../navigation'
import BusinessProfilePanel from './BusinessProfilePanel'
import ProviderEmptyCatalog from './views/ProviderEmptyCatalog'
import ProviderDealsView from './views/ProviderDealsView'
import ProviderListingsView from './views/ProviderListingsView'
import ProviderOverview from './views/ProviderOverview'

type Section = 'overview' | 'profile' | 'listings' | 'deals' | 'posts' | 'bookings' | 'settings'

const NAV: { id: Section; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'profile', label: 'Business Profile', icon: Building2 },
  { id: 'listings', label: 'Listings', icon: List },
  { id: 'deals', label: 'Deals', icon: Tag },
  { id: 'posts', label: 'Posts', icon: FileText },
  { id: 'bookings', label: 'Bookings', icon: ShoppingBag },
  { id: 'settings', label: 'Settings', icon: Settings },
]

interface ProviderDashboardPageProps {
  authReady?: boolean
  signedIn?: boolean
  initialSection?: Section
  onExit: () => void
}

function Placeholder({ title, body }: { title: string; body: string }) {
  return (
    <div className="p-4 sm:p-6 h-full overflow-y-auto">
      <h1 className="font-display text-xl font-extrabold m-0 mb-2" style={{ color: 'var(--fg)' }}>
        {title}
      </h1>
      <div
        className="rounded-2xl px-5 py-10"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <p className="text-sm m-0" style={{ color: 'var(--fg-muted)' }}>
          {body}
        </p>
      </div>
    </div>
  )
}

export default function ProviderDashboardPage({
  authReady = true,
  signedIn = true,
  initialSection = 'overview',
  onExit,
}: ProviderDashboardPageProps) {
  const routerNavigate = useNavigate()
  const [section, setSection] = useState<Section>(initialSection)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dashboard, setDashboard] = useState<BusinessDashboardDto | null>(null)
  const [createName, setCreateName] = useState('')
  const [creating, setCreating] = useState(false)

  async function reload() {
    const data = await fetchMyBusinessDashboard()
    setDashboard(data)
    return data
  }

  useEffect(() => {
    if (!authReady) {
      setLoading(true)
      return
    }
    if (!signedIn) {
      setLoading(false)
      setDashboard(null)
      setError('Sign in required')
      return
    }

    let cancelled = false
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await reload()
        if (cancelled) return
        setDashboard(data)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load provider dashboard')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [authReady, signedIn])

  useEffect(() => {
    setSection(initialSection)
  }, [initialSection])

  async function handleCreate() {
    const name = createName.trim()
    if (name.length < 2 || creating) return
    setCreating(true)
    setError(null)
    try {
      await createBusiness({ name })
      const data = await reload()
      setDashboard(data)
      setSection('profile')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create business')
    } finally {
      setCreating(false)
    }
  }

  function navigate(next: Section) {
    setSection(next)
    setMobileNavOpen(false)
  }

  function onMembershipUpdated(membership: BusinessMembershipDto) {
    setDashboard(prev => (prev ? { ...prev, membership } : prev))
    void reload()
      .then(setDashboard)
      .catch(() => {
        /* keep local membership */
      })
  }

  if (!authReady || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
          Loading provider dashboard…
        </p>
      </div>
    )
  }

  if (error === 'Sign in required' || !signedIn) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: 'var(--bg)' }}>
        <p className="text-sm font-semibold m-0" style={{ color: 'var(--fg)' }}>
          Sign in required
        </p>
        <p className="text-sm m-0 mt-1 mb-4" style={{ color: 'var(--fg-muted)' }}>
          Sign in to open the provider dashboard.
        </p>
        <button
          type="button"
          onClick={onExit}
          className="rounded-xl px-4 py-2.5 text-sm font-semibold"
          style={{ background: 'var(--primary)', color: '#fff', border: 'none', cursor: 'pointer' }}
        >
          Back to account
        </button>
      </div>
    )
  }

  const membership = dashboard?.membership ?? null

  if (error && dashboard == null) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: 'var(--bg)' }}>
        <p className="text-sm font-semibold m-0" style={{ color: 'var(--fg)' }}>
          Could not load provider dashboard
        </p>
        <p className="text-sm m-0 mt-1 mb-4 text-center" style={{ color: 'var(--fg-muted)' }}>
          {error}
        </p>
        <div className="flex flex-wrap gap-2 justify-center">
          <button
            type="button"
            onClick={() => {
              setLoading(true)
              setError(null)
              void reload()
                .then(setDashboard)
                .catch(err => setError(err instanceof Error ? err.message : 'Could not load provider dashboard'))
                .finally(() => setLoading(false))
            }}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white"
            style={{ background: 'var(--primary)', border: 'none', cursor: 'pointer' }}
          >
            Retry
          </button>
          <button
            type="button"
            onClick={onExit}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--fg)', cursor: 'pointer' }}
          >
            Back to account
          </button>
        </div>
      </div>
    )
  }

  if (!membership) {
    return (
      <div className="min-h-screen px-4 py-8" style={{ background: 'var(--bg)', color: 'var(--fg)' }}>
        <button
          type="button"
          onClick={onExit}
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold"
          style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}
        >
          <ArrowLeft size={16} />
          Back to account
        </button>
        <div
          className="max-w-md mx-auto rounded-2xl px-5 py-8 text-center"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <Building2 size={28} style={{ color: 'var(--primary)', margin: '0 auto 12px' }} />
          <h1 className="font-display text-xl font-extrabold m-0 mb-2">Create your business</h1>
          <p className="text-sm m-0 mb-5" style={{ color: 'var(--fg-muted)' }}>
            You need a business profile before using the provider dashboard.
          </p>
          <input
            type="text"
            value={createName}
            onChange={e => setCreateName(e.target.value)}
            placeholder="Business name"
            className="w-full rounded-xl px-3 py-2.5 text-sm mb-3"
            style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--fg)' }}
          />
          {error && error !== 'Sign in required' && (
            <p className="text-sm mb-3" style={{ color: 'var(--auth-danger)' }} role="alert">
              {error}
            </p>
          )}
          <button
            type="button"
            disabled={creating || createName.trim().length < 2}
            onClick={() => void handleCreate()}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white"
            style={{
              background: 'var(--primary)',
              border: 'none',
              cursor: creating ? 'wait' : 'pointer',
              opacity: creating || createName.trim().length < 2 ? 0.6 : 1,
            }}
          >
            {creating ? 'Creating…' : 'Create business'}
          </button>
        </div>
      </div>
    )
  }

  const navButton = (item: (typeof NAV)[number], compact = false) => {
    const active = section === item.id
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => navigate(item.id)}
        className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-left"
        style={{
          background: active ? 'rgba(140,82,255,0.12)' : 'transparent',
          color: active ? 'var(--primary)' : 'var(--fg)',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        <item.icon size={16} />
        {!compact && item.label}
      </button>
    )
  }

  let main: React.ReactNode = null
  if (section === 'overview' && dashboard) {
    main = (
      <ProviderOverview
        dashboard={dashboard}
        membership={membership}
        onNavigate={id => navigate(id as Section)}
        onViewPublicProfile={slug => routerNavigate(businessPath(slug))}
      />
    )
  } else if (section === 'profile') {
    main = <BusinessProfilePanel membership={membership} onUpdated={onMembershipUpdated} />
  } else if (section === 'listings') {
    main = <ProviderListingsView businessId={membership.business.id} />
  } else if (section === 'deals') {
    main = <ProviderDealsView businessId={membership.business.id} />
  } else if (section === 'posts') {
    main = (
      <Placeholder
        title="Posts"
        body="Business posts are not available yet. When they ship, real post counts will appear on Overview."
      />
    )
  } else if (section === 'bookings') {
    main = (
      <Placeholder
        title="Bookings"
        body="Booking management is a later checkpoint. No fake bookings are shown here."
      />
    )
  } else {
    main = (
      <Placeholder
        title="Settings"
        body="Team, payouts, and notification preferences will live here. Use Business Profile for public details."
      />
    )
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)', color: 'var(--fg)' }}>
      <aside
        className="hidden lg:flex flex-col shrink-0"
        style={{ width: 240, background: 'var(--surface)', borderRight: '1px solid var(--border)' }}
      >
        <div className="px-4 py-4 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border)' }}>
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-focus))' }}
          >
            <Building2 size={14} className="text-white" />
          </div>
          <div>
            <span className="text-sm font-bold" style={{ fontFamily: 'Syne, sans-serif' }}>
              Delve
            </span>
            <span className="text-xs font-semibold ml-1" style={{ color: 'var(--primary)' }}>
              Business
            </span>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">{NAV.map(item => navButton(item))}</nav>
        <div className="p-3" style={{ borderTop: '1px solid var(--border)' }}>
          <button
            type="button"
            onClick={onExit}
            className="w-full flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium"
            style={{ background: 'none', border: 'none', color: 'var(--fg-muted)', cursor: 'pointer' }}
          >
            <ArrowLeft size={16} />
            Back to traveler
          </button>
        </div>
      </aside>

      {mobileNavOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <button
            type="button"
            className="absolute inset-0"
            style={{ background: 'rgba(0,0,0,0.4)', border: 'none' }}
            aria-label="Close menu"
            onClick={() => setMobileNavOpen(false)}
          />
          <div
            className="relative z-10 w-72 max-w-[85%] h-full flex flex-col"
            style={{ background: 'var(--surface)' }}
          >
            <div className="flex items-center justify-between px-4 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <span className="text-sm font-bold">Delve Business</span>
              <button type="button" onClick={() => setMobileNavOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">{NAV.map(item => navButton(item))}</nav>
            <div className="p-3" style={{ borderTop: '1px solid var(--border)' }}>
              <button
                type="button"
                onClick={onExit}
                className="w-full flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium"
                style={{ background: 'none', border: 'none', color: 'var(--fg-muted)', cursor: 'pointer' }}
              >
                <ArrowLeft size={16} />
                Back to traveler
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header
          className="flex items-center gap-3 px-4 shrink-0"
          style={{ height: 56, background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
        >
          <button
            type="button"
            className="lg:hidden w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: 'none', border: 'none', color: 'var(--fg-muted)', cursor: 'pointer' }}
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={16} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold m-0 truncate" style={{ color: 'var(--fg)' }}>
              {membership.business.name}
            </p>
            <p className="text-xs m-0 truncate" style={{ color: 'var(--fg-muted)' }}>
              {NAV.find(n => n.id === section)?.label}
            </p>
          </div>
        </header>
        <main className="flex-1 overflow-hidden">{main}</main>
      </div>
    </div>
  )
}

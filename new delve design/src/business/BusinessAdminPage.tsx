import { useState } from 'react'
import {
  LayoutDashboard, List, Tag, Car, Calendar, ShoppingBag, Users,
  MessageSquare, Star, DollarSign, BarChart2, UserCheck, Settings,
  Bell, Search, ChevronDown, Menu, X, CheckCircle, LogOut,
  HelpCircle, Building2, ArrowLeft,
} from 'lucide-react'
import { business, metrics } from './data/mock'
import Dashboard from './views/Dashboard'
import Listings from './views/Listings'
import Deals from './views/Deals'
import Transport from './views/Transport'
import Availability from './views/Availability'
import Bookings from './views/Bookings'
import Customers from './views/Customers'
import Messages from './views/Messages'
import Reviews from './views/Reviews'
import Payments from './views/Payments'
import Analytics from './views/Analytics'
import Team from './views/Team'
import SettingsView from './views/Settings'
import { ListingBuilder, DealBuilder, TransportBuilder } from './builders'
import type { OpenBuilderRequest } from './builders'

type Section =
  | 'overview' | 'listings' | 'deals' | 'transport' | 'availability'
  | 'bookings' | 'customers' | 'messages' | 'reviews'
  | 'payments' | 'analytics' | 'team' | 'settings'

const navItems: { id: Section; label: string; icon: React.ComponentType<{ size?: number; className?: string }>; badge?: number }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'listings', label: 'Listings', icon: List },
  { id: 'deals', label: 'Deals', icon: Tag },
  { id: 'transport', label: 'Transport', icon: Car },
  { id: 'availability', label: 'Availability', icon: Calendar },
  { id: 'bookings', label: 'Bookings', icon: ShoppingBag, badge: metrics.bookingsPending },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'messages', label: 'Messages', icon: MessageSquare, badge: metrics.unreadMessages },
  { id: 'reviews', label: 'Reviews', icon: Star },
  { id: 'payments', label: 'Payments', icon: DollarSign },
  { id: 'analytics', label: 'Analytics', icon: BarChart2 },
  { id: 'team', label: 'Team', icon: UserCheck },
  { id: 'settings', label: 'Settings', icon: Settings },
]

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-focus))' }}
      >
        <Building2 size={14} className="text-white" />
      </div>
      <div className="leading-none">
        <span className="text-sm font-bold" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--fg)' }}>Delve</span>
        <span className="text-xs font-semibold ml-1" style={{ color: 'var(--primary-focus)' }}>Business</span>
      </div>
    </div>
  )
}

function Sidebar({
  active, onNavigate, collapsed, onCollapse, onExit,
}: {
  active: Section
  onNavigate: (s: Section) => void
  collapsed: boolean
  onCollapse: () => void
  onExit: () => void
}) {
  return (
    <aside
      className="flex flex-col shrink-0 transition-all duration-200 overflow-hidden"
      style={{
        width: collapsed ? 60 : 240,
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
      }}
    >
      <div
        className="flex items-center gap-3 px-4 py-4"
        style={{ minHeight: 60, borderBottom: '1px solid var(--border)' }}
      >
        {!collapsed && <Logo />}
        <button
          type="button"
          onClick={onCollapse}
          className="w-7 h-7 rounded-lg flex items-center justify-center ml-auto shrink-0 transition-colors"
          style={{ color: 'var(--fg-muted)' }}
        >
          <Menu size={14} />
        </button>
      </div>

      {!collapsed && (
        <div className="px-3 py-3" style={{ borderBottom: '1px solid var(--surface-subtle)' }}>
          <button
            type="button"
            className="flex items-center gap-2.5 w-full px-2 py-2 rounded-lg transition-colors"
            style={{ color: 'var(--fg)' }}
          >
            <div
              className="w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center shrink-0"
              style={{ background: 'rgba(95,47,201,0.12)', color: 'var(--primary)' }}
            >
              {business.avatar}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-xs font-semibold truncate" style={{ color: 'var(--fg)' }}>{business.displayName}</p>
              <div className="flex items-center gap-1">
                <CheckCircle size={9} style={{ color: 'var(--auth-success)' }} />
                <span className="text-[10px] font-medium" style={{ color: 'var(--auth-success)' }}>Verified</span>
              </div>
            </div>
            <ChevronDown size={12} className="shrink-0" style={{ color: 'var(--fg-muted)' }} />
          </button>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto py-3 flex flex-col gap-0.5 px-2">
        {navItems.map(item => {
          const isActive = active === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              title={collapsed ? item.label : undefined}
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors relative"
              style={{
                background: isActive ? 'rgba(95,47,201,0.08)' : 'transparent',
                color: isActive ? 'var(--primary)' : 'var(--fg-muted)',
              }}
            >
              <item.icon size={16} className="shrink-0" />
              {!collapsed && <span>{item.label}</span>}
              {item.badge != null && item.badge > 0 && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white ${
                    collapsed ? 'absolute top-1 right-1 w-3.5 h-3.5 flex items-center justify-center p-0' : 'ml-auto'
                  }`}
                  style={{ background: 'var(--primary)' }}
                >
                  {item.badge}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {!collapsed && (
        <div className="p-3 flex flex-col gap-0.5" style={{ borderTop: '1px solid var(--surface-subtle)' }}>
          <button
            type="button"
            onClick={onExit}
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors"
            style={{ color: 'var(--fg-muted)' }}
          >
            <ArrowLeft size={15} /> Back to traveler
          </button>
          <button
            type="button"
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors"
            style={{ color: 'var(--fg-muted)' }}
          >
            <HelpCircle size={15} /> Help & support
          </button>
          <button
            type="button"
            onClick={onExit}
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors"
            style={{ color: 'var(--auth-danger)' }}
          >
            <LogOut size={15} /> Sign out
          </button>
        </div>
      )}
    </aside>
  )
}

function MobileNav({
  active, onNavigate, onClose, onExit,
}: {
  active: Section
  onNavigate: (s: Section) => void
  onClose: () => void
  onExit: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative z-10 w-72 h-full flex flex-col shadow-2xl"
        style={{ background: 'var(--surface)' }}
      >
        <div
          className="flex items-center justify-between px-4 py-4"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <Logo />
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ color: 'var(--fg-muted)' }}
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-3 px-3 flex flex-col gap-0.5">
          {navItems.map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => { onNavigate(item.id); onClose() }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
              style={{
                background: active === item.id ? 'rgba(95,47,201,0.08)' : 'transparent',
                color: active === item.id ? 'var(--primary)' : 'var(--fg-muted)',
              }}
            >
              <item.icon size={16} />
              {item.label}
              {item.badge != null && item.badge > 0 && (
                <span
                  className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white"
                  style={{ background: 'var(--primary)' }}
                >
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="p-3" style={{ borderTop: '1px solid var(--border)' }}>
          <button
            type="button"
            onClick={() => { onClose(); onExit() }}
            className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg text-sm"
            style={{ color: 'var(--fg-muted)' }}
          >
            <ArrowLeft size={15} /> Back to traveler
          </button>
        </div>
      </div>
    </div>
  )
}

interface BusinessAdminPageProps {
  onExit: () => void
}

export default function BusinessAdminPage({ onExit }: BusinessAdminPageProps) {
  const [activeSection, setActiveSection] = useState<Section>('overview')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [builder, setBuilder] = useState<OpenBuilderRequest | null>(null)

  function openBuilder(req: OpenBuilderRequest) {
    setBuilder(req)
    if (req.kind === 'listing') setActiveSection('listings')
    if (req.kind === 'deal') setActiveSection('deals')
    if (req.kind === 'transport') setActiveSection('transport')
  }

  const views: Record<Section, React.ReactNode> = {
    overview: (
      <Dashboard
        onNavigate={s => setActiveSection(s as Section)}
        onOpenBuilder={openBuilder}
      />
    ),
    listings: (
      <Listings
        onCreate={() => openBuilder({ kind: 'listing', mode: 'create' })}
        onEdit={id => openBuilder({ kind: 'listing', mode: 'edit', entityId: id })}
        onDuplicate={id => openBuilder({ kind: 'listing', mode: 'duplicate', entityId: id })}
      />
    ),
    deals: (
      <Deals
        onCreate={() => openBuilder({ kind: 'deal', mode: 'create' })}
        onEdit={id => openBuilder({ kind: 'deal', mode: 'edit', entityId: id })}
      />
    ),
    transport: (
      <Transport
        onAddAsset={() => openBuilder({ kind: 'transport', mode: 'create', transportFocus: 'asset' })}
        onAddRoute={() => openBuilder({ kind: 'transport', mode: 'create', transportFocus: 'route' })}
        onManageSchedule={id => openBuilder({ kind: 'transport', mode: 'edit', entityId: id, transportFocus: 'schedule' })}
        onEditAsset={id => openBuilder({ kind: 'transport', mode: 'edit', entityId: id, transportFocus: 'asset' })}
      />
    ),
    availability: <Availability />,
    bookings: <Bookings />,
    customers: <Customers />,
    messages: <Messages />,
    reviews: <Reviews />,
    payments: <Payments />,
    analytics: <Analytics />,
    team: <Team />,
    settings: <SettingsView />,
  }

  return (
    <div
      className="flex h-screen overflow-hidden"
      data-theme="light"
      style={{ backgroundColor: 'var(--bg)', color: 'var(--fg)' }}
    >
      <div className="hidden lg:flex">
        <Sidebar
          active={activeSection}
          onNavigate={setActiveSection}
          collapsed={sidebarCollapsed}
          onCollapse={() => setSidebarCollapsed(c => !c)}
          onExit={onExit}
        />
      </div>

      {mobileNavOpen && (
        <MobileNav
          active={activeSection}
          onNavigate={setActiveSection}
          onClose={() => setMobileNavOpen(false)}
          onExit={onExit}
        />
      )}

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header
          className="flex items-center gap-3 px-4 shrink-0"
          style={{ height: 60, background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
        >
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            className="lg:hidden w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ color: 'var(--fg-muted)' }}
          >
            <Menu size={16} />
          </button>
          <div className="lg:hidden">
            <Logo />
          </div>

          <div className="flex items-center gap-2 flex-1 min-w-0">
            {(() => {
              const current = navItems.find(n => n.id === activeSection)
              return current ? (
                <span className="text-sm font-medium hidden sm:flex items-center gap-1.5" style={{ color: 'var(--fg-muted)' }}>
                  <current.icon size={14} /> {current.label}
                </span>
              ) : null
            })()}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative hidden md:block">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--fg-muted)' }} />
              <input
                placeholder="Search anything…"
                className="pl-8 pr-3 py-1.5 rounded-lg text-sm focus:outline-none w-52"
                style={{
                  background: 'var(--surface-subtle)',
                  border: '1px solid var(--border)',
                  color: 'var(--fg)',
                }}
              />
            </div>
            <button
              type="button"
              className="relative w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
              style={{ color: 'var(--fg-muted)' }}
            >
              <Bell size={16} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full" style={{ background: 'var(--primary-focus)' }} />
            </button>
            <button
              type="button"
              onClick={onExit}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors"
              style={{ color: 'var(--fg-muted)', border: '1px solid var(--border)' }}
            >
              <ArrowLeft size={12} /> Traveler
            </button>
            <button
              type="button"
              className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-lg transition-colors"
            >
              <div
                className="w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center"
                style={{ background: 'rgba(95,47,201,0.12)', color: 'var(--primary)' }}
              >
                ZM
              </div>
              <span className="text-sm font-medium hidden sm:block" style={{ color: 'var(--fg)' }}>Zawadi</span>
              <ChevronDown size={12} style={{ color: 'var(--fg-muted)' }} />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-hidden" style={{ backgroundColor: 'var(--bg)' }}>
          <div className="h-full overflow-auto">
            {views[activeSection]}
          </div>
        </main>

        <nav
          className="lg:hidden flex items-center justify-around py-2 px-4 shrink-0"
          style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)' }}
        >
          {[
            { id: 'overview' as Section, icon: LayoutDashboard, label: 'Home' },
            { id: 'bookings' as Section, icon: ShoppingBag, label: 'Bookings', badge: metrics.bookingsPending },
            { id: 'messages' as Section, icon: MessageSquare, label: 'Messages', badge: metrics.unreadMessages },
            { id: 'listings' as Section, icon: List, label: 'Listings' },
            { id: 'analytics' as Section, icon: BarChart2, label: 'Analytics' },
          ].map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveSection(item.id)}
              className="relative flex flex-col items-center gap-1 px-2 py-1 transition-colors"
              style={{ color: activeSection === item.id ? 'var(--primary)' : 'var(--fg-muted)' }}
            >
              <item.icon size={20} />
              <span className="text-[10px] font-medium">{item.label}</span>
              {item.badge != null && item.badge > 0 && (
                <span
                  className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full text-white text-[8px] font-bold flex items-center justify-center"
                  style={{ background: 'var(--primary)' }}
                >
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {builder?.kind === 'listing' && (
        <ListingBuilder
          mode={builder.mode}
          entityId={builder.entityId}
          onClose={() => setBuilder(null)}
        />
      )}
      {builder?.kind === 'deal' && (
        <DealBuilder
          mode={builder.mode}
          entityId={builder.entityId}
          onClose={() => setBuilder(null)}
        />
      )}
      {builder?.kind === 'transport' && (
        <TransportBuilder
          mode={builder.mode}
          entityId={builder.entityId}
          focus={builder.transportFocus}
          onClose={() => setBuilder(null)}
        />
      )}
    </div>
  )
}

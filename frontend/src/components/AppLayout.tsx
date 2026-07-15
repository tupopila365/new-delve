import { Outlet, useLocation } from 'react-router-dom'
import { FoodCardsEnhancer } from './food/FoodCardsEnhancer'
import { GuidesCardsEnhancer } from './guides/GuidesCardsEnhancer'
import { TransportCardsEnhancer } from './transport/TransportCardsEnhancer'
import { JourneysPageEnhancer } from './journeys/JourneysPageEnhancer'
import { EventsPageEnhancer } from './events/EventsPageEnhancer'
import { MessagesPageEnhancer } from './messages/MessagesPageEnhancer'
import { CommunityPageEnhancer } from './community/CommunityPageEnhancer'
import { UserDashboardPageEnhancer } from './dashboard/UserDashboardPageEnhancer'
import { AccountPageEnhancer } from './account/AccountPageEnhancer'
import { SettingsPageEnhancer } from './settings/SettingsPageEnhancer'
import { CreatePageEnhancer } from './create/CreatePageEnhancer'
import { BottomNav } from './BottomNav'
import { MobileTopBar } from './MobileTopBar'
import { ServiceProviderPageHeader } from './ServiceProviderPageHeader'
import { TopNav } from './TopNav'
import { useMigrateStaySaves } from '../hooks/useStaySave'

export function AppLayout() {
  useMigrateStaySaves()
  const loc = useLocation()
  const delversFeed = loc.pathname === '/delvers'
  const createStudioDark =
    loc.pathname === '/create/post' ||
    loc.pathname === '/create/highlight' ||
    loc.pathname === '/journeys/new' ||
    /^\/journeys\/\d+\/edit$/.test(loc.pathname)
  const createStudioLight =
    loc.pathname === '/create/ask' ||
    loc.pathname === '/create/tip' ||
    loc.pathname === '/events/new' ||
    /^\/events\/\d+\/edit$/.test(loc.pathname)

  if (createStudioDark || createStudioLight) {
    return (
      <div
        className={`app-shell app-shell--create${createStudioLight ? ' app-shell--create-light' : ''}`}
      >
        <main className="app-main app-main--create">
          <Outlet />
        </main>
      </div>
    )
  }

  if (delversFeed) {
    return (
      <div className="app-shell app-shell--delvers">
        <main className="app-main app-main--delvers">
          <Outlet />
        </main>
        <BottomNav />
      </div>
    )
  }

  const homeMain = loc.pathname === '/'
  const providerMode = loc.pathname.startsWith('/provider')
  const adminMode = loc.pathname.startsWith('/admin')
  const foodPage = loc.pathname === '/food'
  const guidesPage = loc.pathname === '/guides'
  const transportPage = loc.pathname === '/transport'
  const journeysPage = loc.pathname === '/journeys'
  const eventsPage = loc.pathname === '/events'
  const messagesPage = loc.pathname === '/messages'
  const communityPage =
    loc.pathname === '/community' ||
    loc.pathname.startsWith('/community/tags/') ||
    loc.pathname.startsWith('/community/posts/')
  const dashboardPage = loc.pathname === '/dashboard'
  const accountPage = loc.pathname === '/account'
  const settingsPage = loc.pathname === '/settings'
  const createPage = loc.pathname === '/create'

  if (providerMode || adminMode) {
    return (
      <div className={`app-shell${adminMode ? ' app-shell--admin' : ' app-shell--provider'}`}>
        <main className="app-main app-main--provider">
          <Outlet />
        </main>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <TopNav />
      <MobileTopBar />
      <main className={homeMain ? 'app-main app-main--home' : 'app-main'}>
        {foodPage ? <FoodCardsEnhancer /> : null}
        {guidesPage ? <GuidesCardsEnhancer /> : null}
        {transportPage ? <TransportCardsEnhancer /> : null}
        {journeysPage ? <JourneysPageEnhancer /> : null}
        {eventsPage ? <EventsPageEnhancer /> : null}
        {messagesPage ? <MessagesPageEnhancer /> : null}
        {communityPage ? <CommunityPageEnhancer /> : null}
        {dashboardPage ? <UserDashboardPageEnhancer /> : null}
        {accountPage ? <AccountPageEnhancer /> : null}
        {settingsPage ? <SettingsPageEnhancer /> : null}
        {createPage ? (
          <>
            <CreatePageEnhancer />
          </>
        ) : null}
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}

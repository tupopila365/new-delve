import { Outlet, useLocation } from 'react-router-dom'
import { AccommodationCardsEnhancer } from './accommodation/AccommodationCardsEnhancer'
import { FeaturedStays } from './accommodation/FeaturedStays'
import { BottomNav } from './BottomNav'
import { MobileTopBar } from './MobileTopBar'
import { ServiceProviderPageHeader } from './ServiceProviderPageHeader'
import { TopNav } from './TopNav'

export function AppLayout() {
  const loc = useLocation()
  const delversFeed = loc.pathname === '/delvers'

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
  const staysPage = loc.pathname === '/accommodation'

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
        {staysPage ? (
          <>
            <AccommodationCardsEnhancer />
            <ServiceProviderPageHeader
              title="Places to stay"
              subtitle="Search stays and open filters without leaving the results."
              searchPlaceholder="Search city, region, or stay"
              searchInputSelector="#acc-search"
              filterButtonSelector=".acc-page__filter-btn"
            />
            <FeaturedStays />
          </>
        ) : null}
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}

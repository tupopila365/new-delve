import { Outlet, useLocation } from 'react-router-dom'
import { AccommodationCardsEnhancer } from './accommodation/AccommodationCardsEnhancer'
import { FeaturedStays } from './accommodation/FeaturedStays'
import { BottomNav } from './BottomNav'
import { MobileTopBar } from './MobileTopBar'
import { ServiceProviderPageHeader } from './ServiceProviderPageHeader'
import type { ServiceProviderFilterGroup } from './ServiceProviderFilterButton'
import { TopNav } from './TopNav'

const stayFilterGroups: ServiceProviderFilterGroup[] = [
  {
    id: 'stay-style',
    title: 'Stay style',
    singleSelect: true,
    options: [
      { id: 'hotel', label: 'Hotel', action: { type: 'clickText', selector: '.acc-page__property-chip', text: 'Hotel' } },
      { id: 'guesthouse', label: 'Guest house', action: { type: 'clickText', selector: '.acc-page__property-chip', text: 'Guest house' } },
      { id: 'apartment', label: 'Apartment', action: { type: 'clickText', selector: '.acc-page__property-chip', text: 'Apartment' } },
      { id: 'lodge', label: 'Lodge', action: { type: 'clickText', selector: '.acc-page__property-chip', text: 'Lodge' } },
      { id: 'villa', label: 'Villa', action: { type: 'clickText', selector: '.acc-page__property-chip', text: 'Villa' } },
      { id: 'camping', label: 'Camping', action: { type: 'clickText', selector: '.acc-page__property-chip', text: 'Camping' } },
    ],
  },
  {
    id: 'stay-needs',
    title: 'Needs',
    options: [
      { id: 'pool', label: 'Pool', action: { type: 'clickText', selector: '.acc-page__quick-chips button', text: 'Pool' } },
      { id: 'breakfast', label: 'Breakfast', action: { type: 'clickText', selector: '.acc-page__quick-chips button', text: 'Breakfast' } },
      { id: 'pet', label: 'Pet friendly', action: { type: 'clickText', selector: '.acc-page__quick-chips button', text: 'Pet friendly' } },
      { id: 'budget', label: 'Budget', helper: 'Lower priced stays', action: { type: 'clickText', selector: '.acc-page__quick-chips button', text: 'Budget' } },
      { id: 'family', label: 'Family friendly', action: { type: 'clickText', selector: '.acc-page__quick-chips button', text: 'Family friendly' } },
      { id: 'coast', label: 'Near coast', action: { type: 'clickText', selector: '.acc-page__quick-chips button', text: 'Near coast' } },
    ],
  },
]

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
              subtitle="Search stays and choose a few simple filters."
              searchPlaceholder="Search city, region, or stay"
              searchInputSelector="#acc-search"
              filterGroups={stayFilterGroups}
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

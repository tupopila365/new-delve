import { Outlet, useLocation } from 'react-router-dom'
import { AccommodationCardsEnhancer } from './accommodation/AccommodationCardsEnhancer'
import { FeaturedStays } from './accommodation/FeaturedStays'
import { FoodCardsEnhancer } from './food/FoodCardsEnhancer'
import { FeaturedFood } from './food/FeaturedFood'
import { FeaturedGuides } from './guides/FeaturedGuides'
import { GuidesCardsEnhancer } from './guides/GuidesCardsEnhancer'
import { TransportPageEnhancer } from './transport/TransportPageEnhancer'
import { TransportPlanRental, TransportRouteSteps } from './transport/TransportPlanner'
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
    ],
  },
  {
    id: 'stay-quality',
    title: 'Quality',
    singleSelect: true,
    options: [
      { id: 'rating-5', label: '5 star', helper: 'Top-rated only' },
      { id: 'rating-4', label: '4+ star', helper: 'Very good stays' },
    ],
  },
  {
    id: 'stay-bedrooms',
    title: 'Bedrooms',
    singleSelect: true,
    options: [
      { id: 'bed-1', label: '1+ bedroom' },
      { id: 'bed-2', label: '2+ bedrooms' },
      { id: 'bed-3', label: '3+ bedrooms' },
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
    ],
  },
]

const foodFilterGroups: ServiceProviderFilterGroup[] = [
  {
    id: 'food-cuisine',
    title: 'Cuisine',
    singleSelect: true,
    options: [
      { id: 'cafe', label: 'Café', action: { type: 'clickText', selector: '.disc-side-card__link', text: 'Café' } },
      { id: 'grill', label: 'Grill', action: { type: 'clickText', selector: '.disc-side-card__link', text: 'Grill' } },
      { id: 'seafood', label: 'Seafood', action: { type: 'clickText', selector: '.disc-side-card__link', text: 'Seafood' } },
      { id: 'local', label: 'Local food', action: { type: 'clickText', selector: '.disc-side-card__link', text: 'Local food' } },
      { id: 'bakery', label: 'Bakery', action: { type: 'clickText', selector: '.disc-side-card__link', text: 'Bakery' } },
      { id: 'fast-food', label: 'Fast food', action: { type: 'clickText', selector: '.disc-side-card__link', text: 'Fast food' } },
    ],
  },
  {
    id: 'food-mood',
    title: 'Mood',
    singleSelect: true,
    options: [
      { id: 'open-now', label: 'Open now', action: { type: 'clickText', selector: '.fd-page__quick-chips button', text: 'Open now' } },
      { id: 'favourite', label: 'Local favourite', action: { type: 'clickText', selector: '.fd-page__quick-chips button', text: 'Local favourite' } },
      { id: 'cheap', label: 'Cheap eats', action: { type: 'clickText', selector: '.fd-page__quick-chips button', text: 'Cheap eats' } },
      { id: 'date', label: 'Date night', action: { type: 'clickText', selector: '.fd-page__quick-chips button', text: 'Date night' } },
      { id: 'family', label: 'Family friendly', action: { type: 'clickText', selector: '.fd-page__quick-chips button', text: 'Family friendly' } },
      { id: 'takeaway', label: 'Takeaway', action: { type: 'clickText', selector: '.fd-page__quick-chips button', text: 'Takeaway' } },
    ],
  },
]

const guideFilterGroups: ServiceProviderFilterGroup[] = [
  {
    id: 'guide-type',
    title: 'Guide type',
    singleSelect: true,
    options: [
      { id: 'culture', label: 'Culture', action: { type: 'clickText', selector: '.gd-page__quick-chips button, .disc-side-card__link', text: 'Culture' } },
      { id: 'wildlife', label: 'Wildlife', action: { type: 'clickText', selector: '.gd-page__quick-chips button, .disc-side-card__link', text: 'Wildlife' } },
      { id: 'food', label: 'Food tours', action: { type: 'clickText', selector: '.gd-page__quick-chips button, .disc-side-card__link', text: 'Food tours' } },
      { id: 'walks', label: 'City walks', action: { type: 'clickText', selector: '.gd-page__quick-chips button, .disc-side-card__link', text: 'City walks' } },
      { id: 'photo', label: 'Photography', action: { type: 'clickText', selector: '.gd-page__quick-chips button, .disc-side-card__link', text: 'Photography' } },
    ],
  },
  {
    id: 'guide-trust',
    title: 'Trust',
    singleSelect: true,
    options: [
      { id: 'licensed', label: 'Licensed guides', action: { type: 'clickText', selector: '.gd-page__quick-chips button', text: 'Licensed guides' } },
      { id: 'fast', label: 'Fast response', action: { type: 'clickText', selector: '.gd-page__quick-chips button', text: 'Fast response' } },
      { id: 'budget', label: 'Budget friendly', action: { type: 'clickText', selector: '.gd-page__quick-chips button', text: 'Budget friendly' } },
    ],
  },
  {
    id: 'guide-areas',
    title: 'Popular areas',
    singleSelect: true,
    options: [
      { id: 'windhoek', label: 'Windhoek', action: { type: 'clickText', selector: '.disc-side-card__link', text: 'Windhoek' } },
      { id: 'swakopmund', label: 'Swakopmund', action: { type: 'clickText', selector: '.disc-side-card__link', text: 'Swakopmund' } },
      { id: 'etosha', label: 'Etosha', action: { type: 'clickText', selector: '.disc-side-card__link', text: 'Etosha' } },
      { id: 'walvis', label: 'Walvis Bay', action: { type: 'clickText', selector: '.disc-side-card__link', text: 'Walvis Bay' } },
      { id: 'sossusvlei', label: 'Sossusvlei', action: { type: 'clickText', selector: '.disc-side-card__link', text: 'Sossusvlei' } },
    ],
  },
]

const transportFilterGroups: ServiceProviderFilterGroup[] = [
  {
    id: 'transport-type',
    title: 'Transport type',
    singleSelect: true,
    options: [
      { id: 'all', label: 'All transport', action: { type: 'clickText', selector: '.tp-mode-btn', text: 'All transport' } },
      { id: 'car', label: 'Vehicle rentals', action: { type: 'clickText', selector: '.tp-mode-btn', text: 'Vehicle rentals' } },
      { id: 'shared', label: 'Shared trips', action: { type: 'clickText', selector: '.tp-mode-btn', text: 'Shared trips' } },
    ],
  },
  {
    id: 'transport-needs',
    title: 'Needs',
    singleSelect: true,
    options: [
      { id: 'airport', label: 'Airport pickup', action: { type: 'clickText', selector: '.tp-page button', text: 'Airport pickup' } },
      { id: 'self-drive', label: 'Self-drive', action: { type: 'clickText', selector: '.tp-page button', text: 'Self-drive' } },
      { id: 'budget', label: 'Budget friendly', action: { type: 'clickText', selector: '.tp-page button', text: 'Budget friendly' } },
      { id: 'week', label: 'This week', action: { type: 'clickText', selector: '.tp-page button', text: 'This week' } },
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
  const foodPage = loc.pathname === '/food'
  const guidesPage = loc.pathname === '/guides'
  const transportPage = loc.pathname === '/transport'

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
              filterScope="stays"
            />
            <FeaturedStays />
          </>
        ) : null}
        {foodPage ? (
          <>
            <FoodCardsEnhancer />
            <ServiceProviderPageHeader
              title="Food & drinks"
              subtitle="Search restaurants, cafés, bars, and local food spots."
              searchPlaceholder="Search cuisine, venue, city, or mood"
              searchInputSelector="#fd-search"
              filterGroups={foodFilterGroups}
              filterScope="food"
            />
            <FeaturedFood />
          </>
        ) : null}
        {guidesPage ? (
          <>
            <GuidesCardsEnhancer />
            <ServiceProviderPageHeader
              title="Local guides"
              subtitle="Search trusted local experts, guide types, languages, and regions."
              searchPlaceholder="Search culture, wildlife, Windhoek, food tours"
              searchInputSelector="#gd-search"
              filterGroups={guideFilterGroups}
              filterScope="guides"
            />
            <FeaturedGuides />
          </>
        ) : null}
        {transportPage ? (
          <>
            <TransportPageEnhancer />
            <ServiceProviderPageHeader
              title="Transport"
              subtitle="Search vehicle rentals and shared trips."
              searchPlaceholder="Search Windhoek, airport pickup, Etosha, shared route"
              searchInputSelector="#tp-search"
              filterGroups={transportFilterGroups}
              filterScope="transport"
            />
            <div className="tp-planner-wrap">
              <TransportPlanRental />
              <TransportRouteSteps />
            </div>
          </>
        ) : null}
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}

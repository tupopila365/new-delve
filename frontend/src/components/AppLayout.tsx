import { Outlet, useLocation } from 'react-router-dom'
import { AccommodationCardsEnhancer } from './accommodation/AccommodationCardsEnhancer'
import { FeaturedStays } from './accommodation/FeaturedStays'
import { HostStoriesRow } from './HostStoriesRow'
import { FoodCardsEnhancer } from './food/FoodCardsEnhancer'
import { FeaturedFood } from './food/FeaturedFood'
import { FeaturedGuides } from './guides/FeaturedGuides'
import { GuidesCardsEnhancer } from './guides/GuidesCardsEnhancer'
import { FeaturedTransport } from './transport/FeaturedTransport'
import { TransportCardsEnhancer } from './transport/TransportCardsEnhancer'
import { TransportPageEnhancer } from './transport/TransportPageEnhancer'
import { TransportPlanRental, TransportRouteSteps } from './transport/TransportPlanner'
import { JourneysPageEnhancer } from './journeys/JourneysPageEnhancer'
import { FeaturedJourneys } from './journeys/FeaturedJourneys'
import { EventsPageEnhancer } from './events/EventsPageEnhancer'
import { FeaturedEvents } from './events/FeaturedEvents'
import { MessagesPageEnhancer } from './messages/MessagesPageEnhancer'
import { CommunityPageEnhancer } from './community/CommunityPageEnhancer'
import { UserDashboardPageEnhancer } from './dashboard/UserDashboardPageEnhancer'
import { AccountPageEnhancer } from './account/AccountPageEnhancer'
import { SettingsPageEnhancer } from './settings/SettingsPageEnhancer'
import { CreatePageEnhancer } from './create/CreatePageEnhancer'
import { BottomNav } from './BottomNav'
import { MobileTopBar } from './MobileTopBar'
import { ServiceProviderPageHeader } from './ServiceProviderPageHeader'
import type { ServiceProviderFilterGroup } from './ServiceProviderFilterButton'
import { TopNav } from './TopNav'
import { useMigrateStaySaves } from '../hooks/useStaySave'

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

const journeyFilterGroups: ServiceProviderFilterGroup[] = [
  {
    id: 'journey-style',
    title: 'Journey style',
    singleSelect: true,
    options: [
      { id: 'weekend', label: 'Weekend trips', action: { type: 'clickText', selector: '.jn-page__quick-chips button', text: 'Weekend trips' } },
      { id: 'nature', label: 'Nature', action: { type: 'clickText', selector: '.jn-page__quick-chips button', text: 'Nature' } },
      { id: 'culture', label: 'Culture', action: { type: 'clickText', selector: '.jn-page__quick-chips button', text: 'Culture' } },
      { id: 'food', label: 'Food', action: { type: 'clickText', selector: '.jn-page__quick-chips button', text: 'Food' } },
      { id: 'coast', label: 'Coast', action: { type: 'clickText', selector: '.jn-page__quick-chips button', text: 'Coast' } },
      { id: 'adventure', label: 'Adventure', action: { type: 'clickText', selector: '.jn-page__quick-chips button', text: 'Adventure' } },
      { id: 'family', label: 'Family friendly', action: { type: 'clickText', selector: '.jn-page__quick-chips button', text: 'Family friendly' } },
      { id: 'budget', label: 'Budget friendly', action: { type: 'clickText', selector: '.jn-page__quick-chips button', text: 'Budget friendly' } },
    ],
  },
  {
    id: 'journey-budget',
    title: 'Budget range',
    singleSelect: true,
    options: [
      { id: 'under-2k', label: 'Under N$2k', action: { type: 'clickText', selector: '.jn-page__budget-sync button', text: 'Under N$2k' } },
      { id: '2-5k', label: 'N$2–5k', action: { type: 'clickText', selector: '.jn-page__budget-sync button', text: 'N$2–5k' } },
      { id: '5-12k', label: 'N$5–12k', action: { type: 'clickText', selector: '.jn-page__budget-sync button', text: 'N$5–12k' } },
      { id: '12k-plus', label: 'N$12k+', action: { type: 'clickText', selector: '.jn-page__budget-sync button', text: 'N$12k+' } },
    ],
  },
]

const eventFilterGroups: ServiceProviderFilterGroup[] = [
  {
    id: 'event-type',
    title: 'Event type',
    singleSelect: true,
    options: [
      { id: 'music', label: 'Music', action: { type: 'clickText', selector: '.ev-page__quick-chips button', text: 'Music' } },
      { id: 'culture', label: 'Culture', action: { type: 'clickText', selector: '.ev-page__quick-chips button', text: 'Culture' } },
      { id: 'food', label: 'Food & drink', action: { type: 'clickText', selector: '.ev-page__quick-chips button', text: 'Food' } },
      { id: 'sports', label: 'Sports', action: { type: 'clickText', selector: '.ev-page__category-sync button', text: 'Sports' } },
      { id: 'business', label: 'Business', action: { type: 'clickText', selector: '.ev-page__category-sync button', text: 'Business' } },
    ],
  },
  {
    id: 'event-when',
    title: 'When',
    singleSelect: true,
    options: [
      { id: 'today', label: 'Today', action: { type: 'clickText', selector: '.ev-page__quick-chips button', text: 'Today' } },
      { id: 'weekend', label: 'This weekend', action: { type: 'clickText', selector: '.ev-page__quick-chips button', text: 'This weekend' } },
      { id: 'free', label: 'Free', action: { type: 'clickText', selector: '.ev-page__quick-chips button', text: 'Free' } },
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
  const staysPage = loc.pathname === '/accommodation'
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
            <HostStoriesRow />
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
            <TransportCardsEnhancer />
            <ServiceProviderPageHeader
              title="Transport"
              subtitle="Search vehicle rentals and shared trips."
              searchPlaceholder="Search Windhoek, airport pickup, Etosha, shared route"
              searchInputSelector="#tp-search"
              filterGroups={transportFilterGroups}
              filterScope="transport"
            />
            <div className="tp-mode-slot" data-transport-mode-slot />
            <div className="tp-planner-wrap">
              <TransportPlanRental />
              <TransportRouteSteps />
            </div>
            <FeaturedTransport />
          </>
        ) : null}
        {journeysPage ? (
          <>
            <JourneysPageEnhancer />
            <ServiceProviderPageHeader
              title="Explore journeys"
              subtitle="Discover real travel stories, itineraries, routes, and saved experiences from travellers and locals."
              eyebrow="Journeys"
              searchPlaceholder="Search Etosha, coast, weekend trip, food journey…"
              searchInputSelector="#jn-search"
              filterGroups={journeyFilterGroups}
              filterScope="journeys"
            />
            <FeaturedJourneys />
          </>
        ) : null}
        {eventsPage ? (
          <>
            <EventsPageEnhancer />
            <ServiceProviderPageHeader
              title="Events happening soon"
              subtitle="Find markets, music, culture nights, food events, meetups, and local gatherings."
              eyebrow="Events"
              searchPlaceholder="Search market, music, Windhoek, food, meetup…"
              searchInputSelector="#ev-search"
              filterGroups={eventFilterGroups}
              filterScope="events"
            />
            <FeaturedEvents />
          </>
        ) : null}
        {messagesPage ? (
          <>
            <MessagesPageEnhancer />
            <ServiceProviderPageHeader
              title="Messages"
              eyebrow=""
              searchPlaceholder="Search name or message"
              searchInputSelector="#msg-search"
            />
          </>
        ) : null}
        {communityPage ? (
          <>
            <CommunityPageEnhancer />
            <ServiceProviderPageHeader
              title="Community"
              eyebrow=""
              searchPlaceholder="Search questions, tips, groups, or #tags…"
              searchInputSelector="#cm-search"
            />
          </>
        ) : null}
        {dashboardPage ? (
          <>
            <UserDashboardPageEnhancer />
            <ServiceProviderPageHeader
              title="My travel dashboard"
              subtitle="Bookings, saved items, messages, and quick actions."
              eyebrow="Dashboard"
              showTools={false}
            />
          </>
        ) : null}
        {accountPage ? (
          <>
            <AccountPageEnhancer />
            <ServiceProviderPageHeader
              title="Account"
              subtitle="Your profile, verification status, and shortcuts."
              eyebrow="You"
              showTools={false}
            />
          </>
        ) : null}
        {settingsPage ? (
          <>
            <SettingsPageEnhancer />
            <ServiceProviderPageHeader
              title="Settings"
              subtitle="Edit profile, privacy, preferences, and account details."
              eyebrow="Preferences"
              showTools={false}
            />
          </>
        ) : null}
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

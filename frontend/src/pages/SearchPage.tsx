import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  BedDouble,
  Car,
  Compass,
  MessageCircleQuestion,
  Route,
  Search,
  Ticket,
  UserRound,
  Utensils,
  X,
} from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { apiFetch } from '../api/client'
import { QuickFilterChips } from '../components/marketplace'
import { SearchHit } from '../components/search'
import { messagingPaths } from '../components/messages/messageProviderUtils'
import { EmptyState } from '../components/ui'
import { communityPostPermalinkPath, postPermalinkPath } from '../utils/postPermalink'
import type { FeedPost } from '../components/IgPostCard'
import { isDelversPost } from '../utils/postFilters'
import {
  buildSearchApiPath,
  isSearchType,
  readSearchType,
  writeSearchParams,
  type SearchType,
} from '../utils/searchParams'
import './SearchPage.css'

const SEARCH_CATEGORIES = [
  { id: 'profile', label: 'People', Icon: UserRound },
  { id: 'ask_locals', label: 'Ask locals', Icon: MessageCircleQuestion },
  { id: 'delvers', label: 'Delvers', Icon: Compass },
  { id: 'food', label: 'Eat out', Icon: Utensils },
  { id: 'stay', label: 'Stay', Icon: BedDouble },
  { id: 'events', label: 'Events', Icon: Ticket },
  { id: 'guides', label: 'Guides', Icon: Compass },
  { id: 'journeys', label: 'Journeys', Icon: Route },
  { id: 'transport', label: 'Transport', Icon: Car },
] as const

type SearchUser = {
  id: number
  username: string
  display_name: string
  avatar: string | null
  user_type: string
  city: string
  region: string
  bio: string
  can_message?: boolean
}

type NamedListing = {
  id: number
  title?: string
  name?: string
  headline?: string
  region?: string
  city?: string
  cover_image?: string | null
  photo?: string | null
  price_per_night?: string | number | null
  price_per_day?: string | number | null
  rating_avg?: string | number | null
  username?: string
}

type SearchResults = {
  users: SearchUser[]
  accommodation: NamedListing[]
  vehicles: NamedListing[]
  bus_trips: {
    id: number
    route_detail?: { origin?: string; destination?: string }
    cover_image?: string | null
  }[]
  events: NamedListing[]
  food: NamedListing[]
  guides: NamedListing[]
  journeys: {
    id: number
    title: string
    summary?: string
    days?: number
    author?: { username: string; display_name?: string }
    cover_image?: string | null
  }[]
  posts: {
    id: number
    body: string
    is_delvers?: boolean
    image?: string | null
    author?: { username: string; display_name?: string }
    region?: string
  }[]
  questions: {
    id: number
    body: string
    place_label?: string
    author?: { username: string; display_name?: string }
    region?: string
    comments_count?: number
  }[]
}

const PLACEHOLDERS: Record<SearchType, string> = {
  profile: 'Search people and profiles…',
  ask_locals: 'Search ask-locals questions…',
  delvers: 'Search Delvers posts and moments…',
  food: 'Search restaurants, cafés, and bars…',
  stay: 'Search hotels, lodges, and stays…',
  events: 'Search events and tickets…',
  guides: 'Search local guides and tours…',
  journeys: 'Search travel routes and diaries…',
  transport: 'Search rentals, routes, and trips…',
}

function listingTitle(item: NamedListing): string {
  return item.title || item.name || item.headline || 'Listing'
}

function placeLine(item: { city?: string; region?: string }): string {
  return [item.city, item.region].filter(Boolean).join(', ') || 'Namibia'
}

function priceLabel(value: string | number | null | undefined, suffix: string): string | undefined {
  if (value == null || value === '') return undefined
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return `N$${value}${suffix}`
  return `N$${n.toLocaleString()}${suffix}`
}

function ratingLabel(value: string | number | null | undefined): string | undefined {
  if (value == null || value === '') return undefined
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n) || n <= 0) return undefined
  return `★ ${n.toFixed(1)}`
}

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { profile } = useAuth()
  const urlQ = searchParams.get('q')?.trim() ?? ''
  const urlType = readSearchType(searchParams)

  const [input, setInput] = useState(urlQ)
  const [type, setType] = useState<SearchType | ''>(urlType)

  useEffect(() => {
    setInput(urlQ)
  }, [urlQ])

  useEffect(() => {
    setType(urlType)
  }, [urlType])

  // Live search: debounce input into the URL (source of truth for the query).
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const nextQ = input.trim()
      if (nextQ === urlQ && type === urlType) return
      setSearchParams(writeSearchParams(nextQ, type), { replace: true })
    }, 300)
    return () => window.clearTimeout(timer)
  }, [input, type, urlQ, urlType, setSearchParams])

  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ['unified-search', urlQ, urlType],
    queryFn: () => apiFetch<SearchResults>(buildSearchApiPath(urlQ, urlType)),
    enabled: urlQ.length >= 2,
    retry: 1,
  })

  const placeholder = useMemo(() => {
    if (type && isSearchType(type)) return PLACEHOLDERS[type]
    return 'Search DELVE…'
  }, [type])

  const showAll = !type
  const showProfile = showAll || type === 'profile'
  const showAskLocals = showAll || type === 'ask_locals'
  const showDelvers = showAll || type === 'delvers'
  const showStay = showAll || type === 'stay'
  const showFood = showAll || type === 'food'
  const showEvents = showAll || type === 'events'
  const showGuides = showAll || type === 'guides'
  const showJourneys = showAll || type === 'journeys'
  const showTransport = showAll || type === 'transport'

  const delversPosts = useMemo(() => {
    const posts = data?.posts ?? []
    if (type === 'delvers') return posts
    return posts.filter((post) => isDelversPost(post as FeedPost))
  }, [data?.posts, type])

  const generalPosts = useMemo(() => {
    if (!showAll) return []
    return (data?.posts ?? []).filter((post) => !isDelversPost(post as FeedPost))
  }, [data?.posts, showAll])

  const resultCount = useMemo(() => {
    if (!data) return 0
    let n = 0
    if (showProfile) n += data.users.length
    if (showStay) n += data.accommodation.length
    if (showFood) n += data.food.length
    if (showEvents) n += data.events.length
    if (showGuides) n += data.guides.length
    if (showTransport) n += data.vehicles.length + data.bus_trips.length
    if (showJourneys) n += data.journeys.length
    if (showAskLocals) n += data.questions.length
    if (showDelvers) n += delversPosts.length
    if (showAll) n += generalPosts.length
    return n
  }, [
    data,
    delversPosts.length,
    generalPosts.length,
    showAll,
    showAskLocals,
    showDelvers,
    showEvents,
    showFood,
    showGuides,
    showJourneys,
    showProfile,
    showStay,
    showTransport,
  ])

  function onTypeClick(id: string) {
    const next = type === id ? '' : (id as SearchType)
    setType(next)
    setSearchParams(writeSearchParams(input.trim(), next), { replace: true })
  }

  function onClear() {
    setInput('')
    setSearchParams(writeSearchParams('', type), { replace: true })
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSearchParams(writeSearchParams(input.trim(), type), { replace: true })
  }

  const searching = urlQ.length >= 2 && (isLoading || isFetching)
  const activeCategoryLabel = type ? (SEARCH_CATEGORIES.find((c) => c.id === type)?.label ?? type) : ''

  return (
    <div className={`search-page-simple${urlQ.length >= 2 ? ' search-page-simple--results' : ''}`}>
      <div className="search-page-simple__panel">
        <form className="search-page-simple__form" onSubmit={onSubmit} role="search" aria-label="Search DELVE">
          <label className="visually-hidden" htmlFor="global-search-q">
            Search DELVE
          </label>
          <div className="search-page-simple__field">
            <Search size={18} strokeWidth={2.25} aria-hidden />
            <input
              id="global-search-q"
              type="search"
              placeholder={placeholder}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              autoComplete="off"
              enterKeyHint="search"
              autoFocus
            />
            {input ? (
              <button type="button" className="search-page-simple__clear" onClick={onClear} aria-label="Clear search">
                <X size={16} strokeWidth={2.25} aria-hidden />
              </button>
            ) : null}
          </div>
        </form>

        <QuickFilterChips
          ariaLabel="Search category"
          className="search-page-simple__categories"
          chips={SEARCH_CATEGORIES.map((item) => ({
            id: item.id,
            label: item.label,
            Icon: item.Icon,
            active: type === item.id,
          }))}
          onChipClick={onTypeClick}
        />
      </div>

      {urlQ.length < 2 ? (
        <p className="search-page-simple__hint">Type at least 2 characters to search across DELVE.</p>
      ) : searching ? (
        <p className="search-page-simple__hint" aria-live="polite">
          Searching for “{urlQ}”…
        </p>
      ) : isError ? (
        <EmptyState
          compact
          className="search-page-simple__empty"
          iconElement={<Search size={22} strokeWidth={1.75} />}
          title="Search isn't available right now"
          sub="Check your connection and try again."
          cta={{ label: 'Retry', onClick: () => void refetch() }}
        />
      ) : resultCount === 0 ? (
        <p className="search-page-simple__hint">
          No results for “{urlQ}”
          {activeCategoryLabel ? ` in ${activeCategoryLabel}` : ''}. Try another term or category.
        </p>
      ) : (
        <div className="search-page-simple__results" aria-live="polite">
          <p className="search-page-simple__summary">
            {resultCount} result{resultCount === 1 ? '' : 's'} for “{urlQ}”
          </p>

          {showProfile && data!.users.length > 0 ? (
            <section className="search-page-simple__section">
              <h2>People</h2>
              <ul>
                {data!.users.map((user) => {
                  const showMessage =
                    profile &&
                    user.username.toLowerCase() !== profile.username.toLowerCase() &&
                    user.can_message === true
                  return (
                    <li key={user.id} className="search-page-simple__person">
                      <SearchHit
                        to={`/u/${user.username}`}
                        title={user.display_name || user.username}
                        subtitle={`@${user.username}`}
                        meta={[user.city, user.region].filter(Boolean).join(', ') || undefined}
                        imageUrl={user.avatar}
                        imageVariant="avatar"
                        fallbackIcon={<UserRound size={18} />}
                      />
                      {showMessage ? (
                        <Link
                          to={messagingPaths('user').user(user.username)}
                          className="search-page-simple__message-link"
                        >
                          Message
                        </Link>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            </section>
          ) : null}

          {showStay && data!.accommodation.length > 0 ? (
            <section className="search-page-simple__section">
              <h2>Stays</h2>
              <ul>
                {data!.accommodation.map((item) => (
                  <li key={`stay-${item.id}`}>
                    <SearchHit
                      to={`/accommodation/${item.id}`}
                      title={listingTitle(item)}
                      subtitle={placeLine(item)}
                      meta={
                        [priceLabel(item.price_per_night, ' / night'), ratingLabel(item.rating_avg)]
                          .filter(Boolean)
                          .join(' · ') || undefined
                      }
                      imageUrl={item.cover_image}
                      fallbackIcon={<BedDouble size={18} />}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {showFood && data!.food.length > 0 ? (
            <section className="search-page-simple__section">
              <h2>Food</h2>
              <ul>
                {data!.food.map((item) => (
                  <li key={`food-${item.id}`}>
                    <SearchHit
                      to={`/food/${item.id}`}
                      title={listingTitle(item)}
                      subtitle={placeLine(item)}
                      meta={ratingLabel(item.rating_avg)}
                      imageUrl={item.cover_image}
                      fallbackIcon={<Utensils size={18} />}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {showEvents && data!.events.length > 0 ? (
            <section className="search-page-simple__section">
              <h2>Events</h2>
              <ul>
                {data!.events.map((item) => (
                  <li key={`event-${item.id}`}>
                    <SearchHit
                      to={`/events/${item.id}`}
                      title={listingTitle(item)}
                      subtitle={placeLine(item)}
                      imageUrl={item.cover_image}
                      fallbackIcon={<Ticket size={18} />}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {showGuides && data!.guides.length > 0 ? (
            <section className="search-page-simple__section">
              <h2>Guides</h2>
              <ul>
                {data!.guides.map((item) => (
                  <li key={`guide-${item.id}`}>
                    <SearchHit
                      to={`/guides/${item.id}`}
                      title={item.headline || listingTitle(item)}
                      subtitle={item.username ? `@${item.username}` : 'Tour guide'}
                      meta={ratingLabel(item.rating_avg)}
                      imageUrl={item.photo}
                      imageVariant="avatar"
                      fallbackIcon={<Compass size={18} />}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {showJourneys && data!.journeys.length > 0 ? (
            <section className="search-page-simple__section">
              <h2>Journeys</h2>
              <ul>
                {data!.journeys.map((item) => (
                  <li key={`journey-${item.id}`}>
                    <SearchHit
                      to={`/journeys/${item.id}`}
                      title={item.title}
                      subtitle={
                        item.author?.username
                          ? `@${item.author.username}`
                          : 'Traveller'
                      }
                      meta={
                        [
                          item.days ? `${item.days} ${item.days === 1 ? 'day' : 'days'}` : '',
                          item.summary?.slice(0, 60),
                        ]
                          .filter(Boolean)
                          .join(' · ') || undefined
                      }
                      imageUrl={item.cover_image}
                      fallbackIcon={<Route size={18} />}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {showTransport && data!.vehicles.length > 0 ? (
            <section className="search-page-simple__section">
              <h2>Vehicle rentals</h2>
              <ul>
                {data!.vehicles.map((item) => (
                  <li key={`vehicle-${item.id}`}>
                    <SearchHit
                      to={`/transport/vehicle/${item.id}`}
                      title={listingTitle(item)}
                      subtitle={placeLine(item)}
                      meta={priceLabel(item.price_per_day, ' / day')}
                      imageUrl={item.cover_image}
                      fallbackIcon={<Car size={18} />}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {showTransport && data!.bus_trips.length > 0 ? (
            <section className="search-page-simple__section">
              <h2>Bus trips</h2>
              <ul>
                {data!.bus_trips.map((item) => (
                  <li key={`bus-${item.id}`}>
                    <SearchHit
                      to={`/transport/bus/${item.id}`}
                      title={`${item.route_detail?.origin ?? '?'} → ${item.route_detail?.destination ?? '?'}`}
                      subtitle="Bus trip"
                      imageUrl={item.cover_image}
                      fallbackIcon={<Car size={18} />}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {showDelvers && delversPosts.length > 0 ? (
            <section className="search-page-simple__section">
              <h2>Delvers</h2>
              <ul>
                {delversPosts.map((post) => (
                  <li key={`delvers-${post.id}`}>
                    <SearchHit
                      to={postPermalinkPath(post.id)}
                      title={post.body.slice(0, 80) || 'Delvers post'}
                      subtitle={
                        post.author?.username ? `@${post.author.username}` : 'Delvers'
                      }
                      meta={post.region || undefined}
                      imageUrl={post.image}
                      fallbackIcon={<Compass size={18} />}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {showAll && generalPosts.length > 0 ? (
            <section className="search-page-simple__section">
              <h2>Posts</h2>
              <ul>
                {generalPosts.map((post) => (
                  <li key={`post-${post.id}`}>
                    <SearchHit
                      to={postPermalinkPath(post.id)}
                      title={post.body.slice(0, 80) || 'Post'}
                      subtitle={
                        post.author?.username ? `@${post.author.username}` : 'Community'
                      }
                      meta={post.region || undefined}
                      imageUrl={post.image}
                      fallbackIcon={<Compass size={18} />}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {showAskLocals && data!.questions.length > 0 ? (
            <section className="search-page-simple__section">
              <h2>Ask locals</h2>
              <ul>
                {data!.questions.map((question) => (
                  <li key={`question-${question.id}`}>
                    <SearchHit
                      to={communityPostPermalinkPath(question.id)}
                      title={question.body.slice(0, 100) || 'Question'}
                      subtitle={
                        question.author?.username
                          ? `@${question.author.username}`
                          : 'Ask locals'
                      }
                      meta={
                        [
                          question.place_label || question.region || '',
                          (question.comments_count ?? 0) > 0
                            ? `${question.comments_count} ${question.comments_count === 1 ? 'answer' : 'answers'}`
                            : 'Needs answer',
                        ]
                          .filter(Boolean)
                          .join(' · ') || undefined
                      }
                      imageVariant="avatar"
                      fallbackIcon={<MessageCircleQuestion size={18} />}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      )}
    </div>
  )
}

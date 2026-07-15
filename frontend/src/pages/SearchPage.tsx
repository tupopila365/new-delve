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
import { HOME_ATMOSPHERE_BG, HOME_HERO_BG } from '../data/homeDefaults'
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

/** Quick routes that feel like trip planning, not a generic filter UI. */
const TRAIL_PROMPTS = [
  { label: 'Weekend away', q: 'weekend' },
  { label: 'Coast', q: 'beach' },
  { label: 'Mountains', q: 'mountains' },
  { label: 'City walk', q: 'city' },
  { label: 'First night', q: 'lodge' },
  { label: 'Local food', q: 'food' },
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
  profile: 'Who are you looking for?',
  ask_locals: 'What do you need to know on the ground?',
  delvers: 'Find moments from the road…',
  food: 'Where should we eat?',
  stay: 'Where will you sleep tonight?',
  events: 'What’s on nearby?',
  guides: 'Who knows this place?',
  journeys: 'Whose route should you follow?',
  transport: 'How will you get there?',
}

function listingTitle(item: NamedListing): string {
  return item.title || item.name || item.headline || 'Listing'
}

function placeLine(item: { city?: string; region?: string }): string {
  return [item.city, item.region].filter(Boolean).join(', ') || 'Somewhere out there'
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
    return 'Where are you going?'
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

  function onTrailPrompt(q: string) {
    setInput(q)
    setSearchParams(writeSearchParams(q, type), { replace: true })
  }

  const searching = urlQ.length >= 2 && (isLoading || isFetching)
  const activeCategoryLabel = type ? (SEARCH_CATEGORIES.find((c) => c.id === type)?.label ?? type) : ''
  const hasQuery = urlQ.length >= 2
  const sceneBg = hasQuery ? HOME_ATMOSPHERE_BG : HOME_HERO_BG

  return (
    <div className={`search-trail${hasQuery ? ' search-trail--results' : ' search-trail--idle'}`}>
      <div className="search-trail__scene" aria-hidden>
        <div className="search-trail__scene-photo" style={{ backgroundImage: `url(${sceneBg})` }} />
        <div className="search-trail__scene-veil" />
      </div>

      <div className="search-trail__stage">
        {!hasQuery ? (
          <header className="search-trail__hero">
            <p className="search-trail__kicker">On the road</p>
            <h1 className="search-trail__title">Where to next?</h1>
            <p className="search-trail__lead">
              Name a place, a mood, or a need — stays, food, guides, and people who’ve already been.
            </p>
          </header>
        ) : (
          <header className="search-trail__hero search-trail__hero--compact">
            <p className="search-trail__kicker">Looking around</p>
            <h1 className="search-trail__title">Finding “{urlQ}”</h1>
          </header>
        )}

        <div className="search-trail__panel">
          <form className="search-trail__form" onSubmit={onSubmit} role="search" aria-label="Search DELVE">
            <label className="visually-hidden" htmlFor="global-search-q">
              Search DELVE
            </label>
            <div className="search-trail__field">
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
                <button type="button" className="search-trail__clear" onClick={onClear} aria-label="Clear search">
                  <X size={16} strokeWidth={2.25} aria-hidden />
                </button>
              ) : null}
            </div>
          </form>

          <QuickFilterChips
            ariaLabel="What are you looking for"
            className="search-trail__categories"
            chips={SEARCH_CATEGORIES.map((item) => ({
              id: item.id,
              label: item.label,
              Icon: item.Icon,
              active: type === item.id,
            }))}
            onChipClick={onTypeClick}
          />

          {!hasQuery ? (
            <div className="search-trail__prompts" role="list" aria-label="Trip ideas">
              {TRAIL_PROMPTS.map((prompt) => (
                <button
                  key={prompt.q}
                  type="button"
                  className="search-trail__prompt"
                  role="listitem"
                  onClick={() => onTrailPrompt(prompt.q)}
                >
                  {prompt.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {!hasQuery ? (
          <p className="search-trail__hint">Start typing a place or vibe — two letters and you’re moving.</p>
        ) : searching ? (
          <p className="search-trail__hint" aria-live="polite">
            Scanning the map for “{urlQ}”…
          </p>
        ) : isError ? (
          <EmptyState
            compact
            className="search-trail__empty"
            iconElement={<Search size={22} strokeWidth={1.75} />}
            title="The trail went quiet"
            sub="Check your connection and try again."
            cta={{ label: 'Retry', onClick: () => void refetch() }}
          />
        ) : resultCount === 0 ? (
          <p className="search-trail__hint">
            Nothing turned up for “{urlQ}”
            {activeCategoryLabel ? ` in ${activeCategoryLabel}` : ''}. Try another spelling, place, or category.
          </p>
        ) : (
          <div className="search-trail__results" aria-live="polite">
            <p className="search-trail__summary">
              {resultCount} find{resultCount === 1 ? '' : 's'} on this trail
            </p>

            {showStay && data!.accommodation.length > 0 ? (
              <section className="search-trail__section">
                <h2>Where the night goes</h2>
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
              <section className="search-trail__section">
                <h2>Tables worth finding</h2>
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

            {showGuides && data!.guides.length > 0 ? (
              <section className="search-trail__section">
                <h2>People who know the way</h2>
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
              <section className="search-trail__section">
                <h2>Routes already walked</h2>
                <ul>
                  {data!.journeys.map((item) => (
                    <li key={`journey-${item.id}`}>
                      <SearchHit
                        to={`/journeys/${item.id}`}
                        title={item.title}
                        subtitle={item.author?.username ? `@${item.author.username}` : 'Traveller'}
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

            {showEvents && data!.events.length > 0 ? (
              <section className="search-trail__section">
                <h2>What’s happening</h2>
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

            {showTransport && data!.vehicles.length > 0 ? (
              <section className="search-trail__section">
                <h2>Wheels for the stretch</h2>
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
              <section className="search-trail__section">
                <h2>Bus routes</h2>
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

            {showProfile && data!.users.length > 0 ? (
              <section className="search-trail__section">
                <h2>Travellers & hosts</h2>
                <ul>
                  {data!.users.map((user) => {
                    const showMessage =
                      profile &&
                      user.username.toLowerCase() !== profile.username.toLowerCase() &&
                      user.can_message === true
                    return (
                      <li key={user.id} className="search-trail__person">
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
                          <Link to={messagingPaths('user').user(user.username)} className="search-trail__message">
                            Message
                          </Link>
                        ) : null}
                      </li>
                    )
                  })}
                </ul>
              </section>
            ) : null}

            {showAskLocals && data!.questions.length > 0 ? (
              <section className="search-trail__section">
                <h2>Ask people on the ground</h2>
                <ul>
                  {data!.questions.map((question) => (
                    <li key={`question-${question.id}`}>
                      <SearchHit
                        to={communityPostPermalinkPath(question.id)}
                        title={question.body.slice(0, 100) || 'Question'}
                        subtitle={question.author?.username ? `@${question.author.username}` : 'Ask locals'}
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

            {showDelvers && delversPosts.length > 0 ? (
              <section className="search-trail__section">
                <h2>Moments from the road</h2>
                <ul>
                  {delversPosts.map((post) => (
                    <li key={`delvers-${post.id}`}>
                      <SearchHit
                        to={postPermalinkPath(post.id)}
                        title={post.body.slice(0, 80) || 'Delvers post'}
                        subtitle={post.author?.username ? `@${post.author.username}` : 'Delvers'}
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
              <section className="search-trail__section">
                <h2>Along the way</h2>
                <ul>
                  {generalPosts.map((post) => (
                    <li key={`post-${post.id}`}>
                      <SearchHit
                        to={postPermalinkPath(post.id)}
                        title={post.body.slice(0, 80) || 'Post'}
                        subtitle={post.author?.username ? `@${post.author.username}` : 'Community'}
                        meta={post.region || undefined}
                        imageUrl={post.image}
                        fallbackIcon={<Compass size={18} />}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}

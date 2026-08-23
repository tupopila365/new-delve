import type {
  SearchEntityType,
  SearchSuggestion,
  UnifiedSearchResult,
} from '@delve/contracts'
import type { Env } from '../../config/env.js'
import * as communityService from '../community/community.service.js'
import * as threadService from '../community/thread.service.js'
import * as journeyService from '../journey/journey.service.js'
import * as eventService from '../social/event.service.js'
import * as postService from '../social/post.service.js'
import * as publicProfile from '../social/profile-public.service.js'

const ALL_TYPES: SearchEntityType[] = [
  'traveler',
  'post',
  'community',
  'thread',
  'journey',
  'event',
]

const THREAD_KIND_LABEL: Record<string, string> = {
  POST: 'Post',
  QUESTION: 'Question',
  TIP: 'Tip',
  DISCUSSION: 'Discussion',
  RECOMMENDATION: 'Recommendation',
  ANNOUNCEMENT: 'Announcement',
  JOURNEY_SHARE: 'Journey',
  EVENT_SHARE: 'Event',
}

function emptyResult(): UnifiedSearchResult {
  return {
    travelers: [],
    posts: [],
    communities: [],
    threads: [],
    journeys: [],
    events: [],
  }
}

function parseTypes(raw?: string): SearchEntityType[] {
  if (!raw?.trim()) return ALL_TYPES
  const allowed = new Set<string>(ALL_TYPES)
  return raw
    .split(',')
    .map(part => part.trim().toLowerCase())
    .filter((part): part is SearchEntityType => allowed.has(part))
}

export async function unifiedSearch(
  env: Env,
  viewerId: string | null,
  opts: { q: string; types?: string; limit?: number },
): Promise<UnifiedSearchResult> {
  const q = opts.q.trim()
  if (!q) return emptyResult()

  const types = parseTypes(opts.types)
  if (types.length === 0) return emptyResult()

  const limit = opts.limit ?? 40
  const perType = Math.max(5, Math.ceil(limit / types.length))

  const [travelers, posts, communities, threads, journeys, events] = await Promise.all([
    types.includes('traveler') ? publicProfile.searchTravelers(q, viewerId) : Promise.resolve([]),
    types.includes('post') ? postService.searchPosts(env, q, viewerId) : Promise.resolve([]),
    types.includes('community') ? communityService.listCommunities(viewerId, { q }) : Promise.resolve([]),
    types.includes('thread') ? threadService.listThreads(viewerId, { q }) : Promise.resolve([]),
    types.includes('journey') ? journeyService.listJourneys(viewerId, { q }) : Promise.resolve([]),
    types.includes('event') ? eventService.searchEvents(env, viewerId, q) : Promise.resolve([]),
  ])

  return {
    travelers: travelers.slice(0, perType),
    posts: posts.slice(0, perType),
    communities: communities.slice(0, perType),
    threads: threads.slice(0, perType),
    journeys: journeys.slice(0, perType),
    events: events.slice(0, perType) as UnifiedSearchResult['events'],
  }
}

export async function searchSuggest(
  env: Env,
  viewerId: string | null,
  q: string,
): Promise<SearchSuggestion[]> {
  const term = q.trim()
  if (term.length < 2) return []

  const result = await unifiedSearch(env, viewerId, { q: term, limit: 24 })
  const suggestions: SearchSuggestion[] = []

  for (const community of result.communities.slice(0, 4)) {
    suggestions.push({
      id: `community:${community.id}`,
      label: community.name,
      context: `${community.destination} · ${community.memberCount.toLocaleString()} members`,
      type: 'Community',
      group: 'community',
      entityType: 'community',
      entityId: community.id,
    })
  }

  for (const journey of result.journeys.slice(0, 4)) {
    suggestions.push({
      id: `journey:${journey.id}`,
      label: journey.title,
      context: `${journey.startPlace} → ${journey.endPlace} · ${journey.durationDays} days`,
      type: 'Journey',
      group: 'journey',
      entityType: 'journey',
      entityId: journey.id,
    })
  }

  for (const event of result.events.slice(0, 4)) {
    const place = [event.locationName, event.city].filter(Boolean).join(' · ')
    suggestions.push({
      id: `event:${event.id}`,
      label: event.title,
      context: `${new Date(event.startAt).toLocaleDateString()}${place ? ` · ${place}` : ''}`,
      type: 'Event',
      group: 'event',
      entityType: 'event',
      entityId: event.id,
    })
  }

  for (const thread of result.threads.slice(0, 3)) {
    suggestions.push({
      id: `thread:${thread.id}`,
      label: thread.title,
      context: `${thread.community.name} · ${THREAD_KIND_LABEL[thread.kind] ?? thread.kind}`,
      type: 'Community post',
      group: 'thread',
      entityType: 'thread',
      entityId: thread.id,
    })
  }

  for (const traveler of result.travelers.slice(0, 3)) {
    suggestions.push({
      id: `traveler:${traveler.id}`,
      label: traveler.displayName,
      context: `@${traveler.username}${traveler.homeCity ? ` · ${traveler.homeCity}` : ''}`,
      type: 'Person',
      group: 'traveler',
      entityType: 'traveler',
      entityId: traveler.username,
    })
  }

  for (const post of result.posts.slice(0, 2)) {
    suggestions.push({
      id: `post:${post.id}`,
      label: post.caption?.slice(0, 80) || 'Delvers post',
      context: `@${post.author.username}`,
      type: 'Post',
      group: 'post',
      entityType: 'post',
      entityId: post.id,
    })
  }

  return suggestions.slice(0, 12)
}

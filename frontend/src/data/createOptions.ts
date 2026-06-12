export type CreateOption = {
  to: string
  emoji: string
  title: string
  desc: string
  providerOnly?: boolean
}

export const USER_CREATE_OPTIONS: CreateOption[] = [
  {
    to: '/create/post',
    emoji: '📸',
    title: 'Delvers post',
    desc: 'Share a photo, tip, or moment with travellers.',
  },
  {
    to: '/journeys/new',
    emoji: '🗺',
    title: 'Journey',
    desc: 'Publish a real route with stops, photos, costs, and tips.',
  },
  {
    to: '/events/new',
    emoji: '🎟',
    title: 'Event',
    desc: 'Create an event for travellers and locals.',
  },
  {
    to: '/community',
    emoji: '💬',
    title: 'Community question',
    desc: 'Ask locals or travellers for advice.',
  },
]

export const PROVIDER_CREATE_OPTIONS: CreateOption[] = [
  {
    to: '/provider/stays',
    emoji: '🏨',
    title: 'Stay listing',
    desc: 'Add a room, lodge, apartment, campsite, or hotel.',
    providerOnly: true,
  },
  {
    to: '/provider/food',
    emoji: '🍽',
    title: 'Food & drink venue',
    desc: 'Add a restaurant, café, bar, or food spot.',
    providerOnly: true,
  },
  {
    to: '/provider/guides',
    emoji: '🧭',
    title: 'Guide experience',
    desc: 'Create a guided tour or local experience.',
    providerOnly: true,
  },
  {
    to: '/provider/transport',
    emoji: '🚗',
    title: 'Transport listing',
    desc: 'Add a rental vehicle, route, or transport service.',
    providerOnly: true,
  },
  {
    to: '/events/new',
    emoji: '🎟',
    title: 'Business event',
    desc: 'List an event for your business or venue.',
    providerOnly: true,
  },
]

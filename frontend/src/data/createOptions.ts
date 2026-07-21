export type CreateOptionIcon =
  | 'camera'
  | 'route'
  | 'ticket'
  | 'message'
  | 'hotel'
  | 'utensils'
  | 'compass'
  | 'car'

export type CreateOption = {
  to: string
  icon: CreateOptionIcon
  title: string
  desc: string
  providerOnly?: boolean
}

export const USER_CREATE_OPTIONS: CreateOption[] = [
  {
    to: '/create/post',
    icon: 'camera',
    title: 'Delvers post',
    desc: 'Share a photo, tip, or moment with travellers.',
  },
  {
    to: '/journeys/new',
    icon: 'route',
    title: 'Journey',
    desc: 'Publish a real route with stops, photos, costs, and tips.',
  },
  {
    to: '/events/new',
    icon: 'ticket',
    title: 'Event',
    desc: 'Create an event for travellers and locals.',
  },
  {
    to: '/community',
    icon: 'message',
    title: 'Community question',
    desc: 'Ask locals or travellers for advice.',
  },
]

export const PROVIDER_CREATE_OPTIONS: CreateOption[] = [
  {
    to: '/provider/stays',
    icon: 'hotel',
    title: 'Stay listing',
    desc: 'Add a room, lodge, apartment, campsite, or hotel.',
    providerOnly: true,
  },
  {
    to: '/provider/food',
    icon: 'utensils',
    title: 'Foodies venue',
    desc: 'Add a restaurant, café, bar, or food spot.',
    providerOnly: true,
  },
  {
    to: '/provider/guides',
    icon: 'compass',
    title: 'Guide experience',
    desc: 'Create a guided tour or local experience.',
    providerOnly: true,
  },
  {
    to: '/provider/transport',
    icon: 'car',
    title: 'Transport listing',
    desc: 'Add a rental vehicle, route, or transport service.',
    providerOnly: true,
  },
  {
    to: '/events/new',
    icon: 'ticket',
    title: 'Business event',
    desc: 'List an event for your business or venue.',
    providerOnly: true,
  },
]

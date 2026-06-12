/**
 * localStorage store for user-created journeys.
 * Separate from the hardcoded mockTrips so user data persists across sessions.
 */
import type { MockTrip } from './mockTrips'

const KEY = 'delve_user_trips_v1'

type Store = {
  trips: MockTrip[]
  nextId: number
}

function load(): Store {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as Store
  } catch {
    // fallthrough
  }
  return { trips: [], nextId: 9001 }
}

function save(s: Store) {
  localStorage.setItem(KEY, JSON.stringify(s))
}

export function loadUserTrips(): MockTrip[] {
  return load().trips
}

export function saveUserTrip(trip: Omit<MockTrip, 'id'>): MockTrip {
  const s = load()
  const newTrip: MockTrip = { ...trip, id: s.nextId++ }
  s.trips = [newTrip, ...s.trips]
  save(s)
  return newTrip
}

export function deleteUserTrip(id: number): void {
  const s = load()
  s.trips = s.trips.filter((t) => t.id !== id)
  save(s)
}

export function findUserTrip(id: number): MockTrip | undefined {
  return load().trips.find((t) => t.id === id)
}

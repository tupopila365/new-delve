import type { QueryClient } from '@tanstack/react-query'



type InvalidateSocialOptions = {

  username?: string

  accommodationStories?: boolean

  listingId?: number

  eventId?: number

  vehicleListingId?: number

  busTripId?: number

  foodVenueId?: number

}



/** Invalidate React Query caches after creating or heavily mutating social posts. */

export async function invalidateSocialCaches(

  qc: QueryClient,

  options: InvalidateSocialOptions = {},

): Promise<void> {

  const tasks: Promise<unknown>[] = [

    qc.invalidateQueries({ queryKey: ['delvers-social'] }),

    qc.invalidateQueries({ queryKey: ['delvers-highlights'] }),

    qc.invalidateQueries({ queryKey: ['home-delvers-preview'] }),

    qc.invalidateQueries({ queryKey: ['home-community-questions'] }),

    qc.invalidateQueries({ queryKey: ['feed'] }),

    qc.invalidateQueries({ queryKey: ['delvers'] }),

  ]



  if (options.accommodationStories) {

    tasks.push(qc.invalidateQueries({ queryKey: ['accommodation-stories'] }))

    tasks.push(qc.invalidateQueries({ queryKey: ['provider-accommodation-stories'] }))

  }



  if (options.listingId) {

    tasks.push(qc.invalidateQueries({ queryKey: ['listing-moments', 'accommodation', String(options.listingId)] }))

    tasks.push(qc.invalidateQueries({ queryKey: ['stay-moments', String(options.listingId)] }))

    tasks.push(qc.invalidateQueries({ queryKey: ['listing-see-all', 'accommodation', String(options.listingId)] }))

  }



  if (options.eventId) {

    tasks.push(qc.invalidateQueries({ queryKey: ['listing-moments', 'event', String(options.eventId)] }))

    tasks.push(qc.invalidateQueries({ queryKey: ['event-moments', String(options.eventId)] }))

    tasks.push(qc.invalidateQueries({ queryKey: ['listing-see-all', 'event', String(options.eventId)] }))

  }



  if (options.vehicleListingId) {

    tasks.push(qc.invalidateQueries({ queryKey: ['listing-moments', 'vehicle', String(options.vehicleListingId)] }))

    tasks.push(qc.invalidateQueries({ queryKey: ['listing-see-all', 'transport', String(options.vehicleListingId)] }))

    tasks.push(qc.invalidateQueries({ queryKey: ['veh', String(options.vehicleListingId)] }))

    tasks.push(qc.invalidateQueries({ queryKey: ['vehicle-reviews', options.vehicleListingId] }))

  }



  if (options.busTripId) {

    tasks.push(qc.invalidateQueries({ queryKey: ['listing-moments', 'bus_trip', String(options.busTripId)] }))

    tasks.push(qc.invalidateQueries({ queryKey: ['listing-see-all', 'transport', String(options.busTripId)] }))

    tasks.push(qc.invalidateQueries({ queryKey: ['trip', String(options.busTripId)] }))

    tasks.push(qc.invalidateQueries({ queryKey: ['bus-trip-reviews', options.busTripId] }))

  }



  if (options.foodVenueId) {

    tasks.push(qc.invalidateQueries({ queryKey: ['listing-moments', 'food', String(options.foodVenueId)] }))

    tasks.push(qc.invalidateQueries({ queryKey: ['listing-see-all', 'food', String(options.foodVenueId)] }))

    tasks.push(qc.invalidateQueries({ queryKey: ['food', String(options.foodVenueId)] }))

    tasks.push(qc.invalidateQueries({ queryKey: ['food-reviews', options.foodVenueId] }))

  }



  if (options.username) {

    tasks.push(qc.invalidateQueries({ queryKey: ['public-profile', options.username] }))

    tasks.push(qc.invalidateQueries({ queryKey: ['user-posts', options.username] }))

    tasks.push(qc.invalidateQueries({ queryKey: ['user-saved', options.username] }))

  }



  await Promise.all(tasks)

}



type EngagementOptions = {

  authorUsername?: string

  savedByUsername?: string

  queryKey?: unknown[]

  /**
   * Skip invalidating the feeds the user is currently looking at. Use this for
   * like/save/fire toggles: the optimistic update already reflects the change,
   * and refetching the feed here causes reorder/flicker and can momentarily
   * reset the toggle if the write hasn't propagated to a read replica yet.
   */
  skipFeeds?: boolean

}



/** Invalidate feeds and optional profile caches after like/save/comment. */

export async function invalidatePostEngagementCaches(

  qc: QueryClient,

  options: EngagementOptions = {},

): Promise<void> {

  const tasks: Promise<unknown>[] = []



  if (options.queryKey?.length) {

    tasks.push(qc.invalidateQueries({ queryKey: options.queryKey }))

  } else if (!options.skipFeeds) {

    tasks.push(

      qc.invalidateQueries({ queryKey: ['delvers-social'] }),

      qc.invalidateQueries({ queryKey: ['delvers-highlights'] }),

      qc.invalidateQueries({ queryKey: ['feed'] }),

      qc.invalidateQueries({ queryKey: ['delvers'] }),

    )

  }



  if (options.authorUsername) {

    tasks.push(qc.invalidateQueries({ queryKey: ['public-profile', options.authorUsername] }))

    tasks.push(qc.invalidateQueries({ queryKey: ['user-posts', options.authorUsername] }))

  }

  if (options.savedByUsername) {

    tasks.push(qc.invalidateQueries({ queryKey: ['user-saved', options.savedByUsername] }))

  }



  await Promise.all(tasks)

}


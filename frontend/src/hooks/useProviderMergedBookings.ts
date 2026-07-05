import { useMemo } from 'react'
import { getProviderBookings } from '../data/providerData'
import { mergeProviderBookings, useProviderEventBookings } from './useProviderEventData'
import { useProviderFoodBookings } from './useProviderFoodData'
import { useProviderGuideBookings } from './useProviderGuideBookings'
import { useProviderStayBookings } from './useProviderStayData'
import { useProviderTransportBookings } from './useProviderTransportData'
import type { ListingCategory } from '../data/providerData'

type Options = {
  allowedCategories: ListingCategory[]
  includeEvents?: boolean
  includeStays?: boolean
  includeGuides?: boolean
  includeTransport?: boolean
  includeFood?: boolean
  enabled?: boolean
}

export function useProviderMergedBookings({
  allowedCategories,
  includeEvents = allowedCategories.length === 0 || allowedCategories.includes('Event'),
  includeStays = allowedCategories.length === 0 || allowedCategories.includes('Stay'),
  includeGuides = allowedCategories.length === 0 || allowedCategories.includes('Guide'),
  includeTransport = allowedCategories.length === 0 || allowedCategories.includes('Transport'),
  includeFood = allowedCategories.length === 0 || allowedCategories.includes('Food'),
  enabled = true,
}: Options) {
  const on = enabled
  const { data: eventBookings = [] } = useProviderEventBookings(on && includeEvents)
  const { data: stayBookings = [] } = useProviderStayBookings(on && includeStays)
  const { data: guideBookings = [] } = useProviderGuideBookings(on && includeGuides)
  const { data: transportBookings = [] } = useProviderTransportBookings(on && includeTransport)
  const { data: foodBookings = [] } = useProviderFoodBookings(on && includeFood)

  return useMemo(
    () =>
      mergeProviderBookings(
        getProviderBookings(),
        eventBookings,
        allowedCategories,
        stayBookings,
        transportBookings,
        foodBookings,
        guideBookings,
      ),
    [
      allowedCategories,
      eventBookings,
      stayBookings,
      guideBookings,
      transportBookings,
      foodBookings,
    ],
  )
}

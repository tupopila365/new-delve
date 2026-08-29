import { describe, expect, it } from 'vitest'
import {
  businessAreaDtoSchema,
  businessDtoSchema,
  businessPublicDtoSchema,
  createBusinessAreaBodySchema,
  createListingBodySchema,
  listingDtoSchema,
  updateBusinessAreaBodySchema,
  updateListingBodySchema,
} from '@delve/contracts'

describe('BusinessArea Foundation Contracts & DTOs', () => {
  it('validates BusinessArea creation body', () => {
    const valid = createBusinessAreaBodySchema.safeParse({
      name: 'Desert Star Restaurant',
      category: 'Restaurant',
      description: 'Fine dining in the dunes',
    })
    expect(valid.success).toBe(true)

    const missingCategory = createBusinessAreaBodySchema.safeParse({
      name: 'Desert Star Restaurant',
    })
    expect(missingCategory.success).toBe(false)
  })

  it('validates BusinessArea update body', () => {
    const valid = updateBusinessAreaBodySchema.safeParse({
      name: 'Desert Sun Dining',
      category: 'Food & Dining',
      description: null,
    })
    expect(valid.success).toBe(true)
  })

  it('validates BusinessArea DTO structure', () => {
    const dto = businessAreaDtoSchema.safeParse({
      id: 'bizarea-1',
      businessId: 'biz-1',
      name: 'Desert Sun Lodge Accommodation',
      category: 'Accommodation',
      description: null,
      logoUrl: null,
      coverUrl: null,
      createdAt: '2026-08-29T10:00:00.000Z',
      updatedAt: '2026-08-29T10:00:00.000Z',
    })
    expect(dto.success).toBe(true)
  })

  it('allows BusinessDto and BusinessPublicDto to parse with optional areas', () => {
    const biz = businessDtoSchema.parse({
      id: 'biz-1',
      name: 'Desert Sun Lodge',
      slug: 'desert-sun-lodge',
      description: null,
      logoUrl: null,
      coverUrl: null,
      email: null,
      phone: null,
      website: null,
      city: 'Swakopmund',
      countryCode: 'NA',
      address: null,
      category: 'Accommodation',
      status: 'VERIFIED',
      createdAt: '2026-08-29T10:00:00.000Z',
      updatedAt: '2026-08-29T10:00:00.000Z',
    })
    expect(biz.areas).toEqual([])

    const pubBiz = businessPublicDtoSchema.parse({
      id: 'biz-1',
      name: 'Desert Sun Lodge',
      slug: 'desert-sun-lodge',
      description: null,
      logoUrl: null,
      coverUrl: null,
      website: null,
      city: 'Swakopmund',
      countryCode: 'NA',
      address: null,
      category: 'Accommodation',
      status: 'VERIFIED',
      createdAt: '2026-08-29T10:00:00.000Z',
    })
    expect(pubBiz.areas).toEqual([])
  })

  it('allows create and update listing payloads without businessAreaId', () => {
    const createParsed = createListingBodySchema.safeParse({
      title: 'Standard Room',
      description: 'Comfortable stay',
      priceAmount: 150,
      currency: 'USD',
    })
    expect(createParsed.success).toBe(true)
    if (createParsed.success) {
      expect(createParsed.data.businessAreaId).toBeUndefined()
    }

    const updateParsed = updateListingBodySchema.safeParse({
      title: 'Deluxe Suite',
    })
    expect(updateParsed.success).toBe(true)
  })

  it('accepts optional businessAreaId on create and update listing payloads', () => {
    const createParsed = createListingBodySchema.safeParse({
      title: 'Sunset Safari Tour',
      businessAreaId: 'bizarea-activities',
    })
    expect(createParsed.success).toBe(true)
    if (createParsed.success) {
      expect(createParsed.data.businessAreaId).toBe('bizarea-activities')
    }

    const updateParsed = updateListingBodySchema.safeParse({
      businessAreaId: 'bizarea-transport',
    })
    expect(updateParsed.success).toBe(true)
  })

  it('supports listing DTO with or without businessArea summary', () => {
    const listingWithoutArea = listingDtoSchema.parse({
      id: 'lst-1',
      businessId: 'biz-1',
      title: 'Standard Room',
      description: null,
      status: 'PUBLISHED',
      coverMediaId: null,
      pricing: { amount: '150.00', currency: 'USD' },
      media: [],
      createdAt: '2026-08-29T10:00:00.000Z',
      updatedAt: '2026-08-29T10:00:00.000Z',
    })
    expect(listingWithoutArea.businessAreaId).toBeNull()
    expect(listingWithoutArea.businessArea).toBeNull()

    const listingWithArea = listingDtoSchema.parse({
      id: 'lst-2',
      businessId: 'biz-1',
      businessAreaId: 'bizarea-1',
      businessArea: {
        id: 'bizarea-1',
        name: 'Desert Sun Accommodation',
        category: 'Accommodation',
      },
      title: 'Deluxe Suite',
      description: null,
      status: 'PUBLISHED',
      coverMediaId: null,
      pricing: { amount: '250.00', currency: 'USD' },
      media: [],
      createdAt: '2026-08-29T10:00:00.000Z',
      updatedAt: '2026-08-29T10:00:00.000Z',
    })
    expect(listingWithArea.businessAreaId).toBe('bizarea-1')
    expect(listingWithArea.businessArea?.name).toBe('Desert Sun Accommodation')
  })
})

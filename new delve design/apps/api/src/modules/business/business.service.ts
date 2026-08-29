import { prisma } from '@delve/database'
import type {
  BusinessAreaDto,
  BusinessDashboardDto,
  BusinessDto,
  BusinessMemberRole,
  BusinessMembershipDto,
  BusinessPublicDto,
  CreateBusinessAreaBody,
  CreateBusinessBody,
  UpdateBusinessAreaBody,
  UpdateBusinessBody,
} from '@delve/contracts'
import { AppError } from '../../middleware/error-handler.js'

type BusinessAreaRow = {
  id: string
  businessId: string
  name: string
  category: string
  description: string | null
  logoUrl: string | null
  coverUrl: string | null
  createdAt: Date
  updatedAt: Date
}

type BusinessRow = {
  id: string
  name: string
  slug: string
  description: string | null
  logoUrl: string | null
  coverUrl: string | null
  email: string | null
  phone: string | null
  website: string | null
  city: string | null
  countryCode: string | null
  address: string | null
  category: string | null
  status: BusinessDto['status']
  createdAt: Date
  updatedAt: Date
  areas?: BusinessAreaRow[]
}

function toBusinessAreaDto(a: BusinessAreaRow): BusinessAreaDto {
  return {
    id: a.id,
    businessId: a.businessId,
    name: a.name,
    category: a.category,
    description: a.description,
    logoUrl: a.logoUrl,
    coverUrl: a.coverUrl,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  }
}

function toBusinessDto(b: BusinessRow): BusinessDto {
  return {
    id: b.id,
    name: b.name,
    slug: b.slug,
    description: b.description,
    logoUrl: b.logoUrl,
    coverUrl: b.coverUrl,
    email: b.email,
    phone: b.phone,
    website: b.website,
    city: b.city,
    countryCode: b.countryCode,
    address: b.address,
    category: b.category,
    areas: (b.areas ?? []).map(toBusinessAreaDto),
    status: b.status,
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
  }
}

/** Public traveler DTO — never includes email/phone. */
function toBusinessPublicDto(b: BusinessRow): BusinessPublicDto {
  return {
    id: b.id,
    name: b.name,
    slug: b.slug,
    description: b.description,
    logoUrl: b.logoUrl,
    coverUrl: b.coverUrl,
    website: b.website,
    city: b.city,
    countryCode: b.countryCode,
    address: b.address,
    category: b.category,
    areas: (b.areas ?? []).map(toBusinessAreaDto),
    status: 'VERIFIED',
    createdAt: b.createdAt.toISOString(),
  }
}

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
  return base || 'business'
}

async function uniqueSlug(name: string): Promise<string> {
  const base = slugify(name)
  for (let i = 0; i < 8; i++) {
    const candidate = i === 0 ? base : `${base}-${Math.random().toString(36).slice(2, 7)}`
    const existing = await prisma.business.findUnique({ where: { slug: candidate }, select: { id: true } })
    if (!existing) return candidate
  }
  return `${base}-${Date.now().toString(36)}`
}

async function requireVerifiedUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new AppError(401, 'UNAUTHORIZED', 'Sign in required')
  if (user.accountStatus === 'deactivated') {
    throw new AppError(403, 'ACCOUNT_DEACTIVATED', 'This account has been deactivated.')
  }
  if (user.accountStatus === 'disabled' || user.accountStatus === 'restricted') {
    throw new AppError(403, 'ACCOUNT_RESTRICTED', 'This account is restricted. Contact support.')
  }
  if (!user.emailVerifiedAt) {
    throw new AppError(403, 'EMAIL_NOT_VERIFIED', 'Verify your email before continuing.')
  }
  return user
}

export async function requireBusinessMembership(
  userId: string,
  businessId: string,
  allowedRoles: BusinessMemberRole[],
) {
  const membership = await prisma.businessMember.findUnique({
    where: { userId_businessId: { userId, businessId } },
  })
  if (!membership) {
    throw new AppError(403, 'NOT_A_MEMBER', 'You are not a member of this business.')
  }
  if (!allowedRoles.includes(membership.role as BusinessMemberRole)) {
    throw new AppError(403, 'INSUFFICIENT_ROLE', 'Your role does not permit this action.')
  }
  return membership
}

/** Create business + OWNER membership in one transaction. Never trust client owner/role/status. */
export async function createBusiness(userId: string, body: CreateBusinessBody): Promise<BusinessMembershipDto> {
  await requireVerifiedUser(userId)
  const slug = await uniqueSlug(body.name)

  const result = await prisma.$transaction(async (tx) => {
    const business = await tx.business.create({
      data: {
        name: body.name,
        slug,
        description: body.description ?? null,
        email: body.email ?? null,
        phone: body.phone ?? null,
        website: body.website ?? null,
        city: body.city ?? null,
        countryCode: body.countryCode ?? null,
        address: body.address ?? null,
        category: body.category ?? null,
        status: 'DRAFT',
      },
    })
    const membership = await tx.businessMember.create({
      data: {
        userId,
        businessId: business.id,
        role: 'OWNER',
      },
    })
    return { business, membership }
  })

  return {
    id: result.membership.id,
    role: 'OWNER',
    createdAt: result.membership.createdAt.toISOString(),
    business: toBusinessDto(result.business),
  }
}

export async function listMyBusinesses(userId: string): Promise<BusinessMembershipDto[]> {
  await requireVerifiedUser(userId)
  const rows = await prisma.businessMember.findMany({
    where: { userId },
    include: { business: { include: { areas: { orderBy: { createdAt: 'asc' } } } } },
    orderBy: { createdAt: 'asc' },
  })
  return rows.map((row) => ({
    id: row.id,
    role: row.role as BusinessMemberRole,
    createdAt: row.createdAt.toISOString(),
    business: toBusinessDto(row.business),
  }))
}

export async function getBusinessForMember(userId: string, businessId: string): Promise<BusinessMembershipDto> {
  await requireVerifiedUser(userId)
  const membership = await prisma.businessMember.findUnique({
    where: { userId_businessId: { userId, businessId } },
    include: { business: { include: { areas: { orderBy: { createdAt: 'asc' } } } } },
  })
  if (!membership) {
    throw new AppError(404, 'NOT_FOUND', 'Business not found.')
  }
  return {
    id: membership.id,
    role: membership.role as BusinessMemberRole,
    createdAt: membership.createdAt.toISOString(),
    business: toBusinessDto(membership.business),
  }
}

export async function updateBusiness(
  userId: string,
  businessId: string,
  body: UpdateBusinessBody,
): Promise<BusinessDto> {
  await requireVerifiedUser(userId)
  await requireBusinessMembership(userId, businessId, ['OWNER', 'MANAGER'])

  const updated = await prisma.business.update({
    where: { id: businessId },
    data: {
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.email !== undefined ? { email: body.email } : {}),
      ...(body.phone !== undefined ? { phone: body.phone } : {}),
      ...(body.website !== undefined ? { website: body.website } : {}),
      ...(body.city !== undefined ? { city: body.city } : {}),
      ...(body.countryCode !== undefined ? { countryCode: body.countryCode } : {}),
      ...(body.address !== undefined ? { address: body.address } : {}),
      ...(body.category !== undefined ? { category: body.category } : {}),
      ...(body.logoUrl !== undefined ? { logoUrl: body.logoUrl } : {}),
      ...(body.coverUrl !== undefined ? { coverUrl: body.coverUrl } : {}),
    },
    include: { areas: { orderBy: { createdAt: 'asc' } } },
  })
  return toBusinessDto(updated)
}

function hasText(value: string | null | undefined) {
  return Boolean(value && value.trim().length > 0)
}

function profileCompletionPercent(business: BusinessDto): number {
  const checks = [
    hasText(business.name),
    hasText(business.description),
    hasText(business.logoUrl),
    hasText(business.coverUrl),
    hasText(business.email),
    hasText(business.phone) || hasText(business.website),
    hasText(business.city) || hasText(business.countryCode),
    hasText(business.category) || hasText(business.address),
  ]
  return Math.round((checks.filter(Boolean).length / checks.length) * 100)
}

/**
 * Dashboard summary for the authenticated provider.
 * Listing/deal/post/booking counts are real DB aggregates — currently 0 until those models exist.
 */
export async function getMyDashboard(userId: string): Promise<BusinessDashboardDto> {
  const memberships = await listMyBusinesses(userId)
  const membership = memberships[0] ?? null
  if (!membership) {
    return {
      membership: null,
      profileCompletionPercent: 0,
      listingCount: 0,
      dealCount: 0,
      postCount: 0,
      bookingCount: 0,
    }
  }

  // Listing/deal counts are real. Business posts / bookings remain 0 until those models exist.
  const [listingCount, dealCount] = await Promise.all([
    prisma.listing.count({ where: { businessId: membership.business.id } }),
    prisma.deal.count({ where: { businessId: membership.business.id } }),
  ])
  const postCount = 0
  const bookingCount = 0

  return {
    membership,
    profileCompletionPercent: profileCompletionPercent(membership.business),
    listingCount,
    dealCount,
    postCount,
    bookingCount,
  }
}

/**
 * Traveler-facing public profile by slug.
 * Only VERIFIED businesses are visible; drafts and other statuses return 404.
 */
export async function getPublicBusinessBySlug(slug: string): Promise<BusinessPublicDto> {
  const normalized = slug.trim().toLowerCase()
  if (!normalized) throw new AppError(400, 'VALIDATION_ERROR', 'Business slug required')

  const business = await prisma.business.findUnique({
    where: { slug: normalized },
    include: { areas: { orderBy: { createdAt: 'asc' } } },
  })
  if (!business || business.status !== 'VERIFIED') {
    throw new AppError(404, 'NOT_FOUND', 'Business not found.')
  }
  return toBusinessPublicDto(business)
}

export async function listBusinessAreas(userId: string, businessId: string): Promise<BusinessAreaDto[]> {
  await requireVerifiedUser(userId)
  await requireBusinessMembership(userId, businessId, ['OWNER', 'MANAGER', 'CONTENT_EDITOR'])

  const rows = await prisma.businessArea.findMany({
    where: { businessId },
    orderBy: { createdAt: 'asc' },
  })
  return rows.map(toBusinessAreaDto)
}

export async function createBusinessArea(
  userId: string,
  businessId: string,
  body: CreateBusinessAreaBody,
): Promise<BusinessAreaDto> {
  await requireVerifiedUser(userId)
  await requireBusinessMembership(userId, businessId, ['OWNER', 'MANAGER'])

  const area = await prisma.businessArea.create({
    data: {
      businessId,
      name: body.name,
      category: body.category,
      description: body.description ?? null,
      logoUrl: body.logoUrl ?? null,
      coverUrl: body.coverUrl ?? null,
    },
  })
  return toBusinessAreaDto(area)
}

export async function updateBusinessArea(
  userId: string,
  businessId: string,
  areaId: string,
  body: UpdateBusinessAreaBody,
): Promise<BusinessAreaDto> {
  await requireVerifiedUser(userId)
  await requireBusinessMembership(userId, businessId, ['OWNER', 'MANAGER'])

  const existing = await prisma.businessArea.findUnique({ where: { id: areaId } })
  if (!existing || existing.businessId !== businessId) {
    throw new AppError(404, 'NOT_FOUND', 'Business area not found.')
  }

  const updated = await prisma.businessArea.update({
    where: { id: areaId },
    data: {
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.category !== undefined ? { category: body.category } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.logoUrl !== undefined ? { logoUrl: body.logoUrl } : {}),
      ...(body.coverUrl !== undefined ? { coverUrl: body.coverUrl } : {}),
    },
  })
  return toBusinessAreaDto(updated)
}

export async function deleteBusinessArea(
  userId: string,
  businessId: string,
  areaId: string,
): Promise<{ success: true }> {
  await requireVerifiedUser(userId)
  await requireBusinessMembership(userId, businessId, ['OWNER', 'MANAGER'])

  const existing = await prisma.businessArea.findUnique({ where: { id: areaId } })
  if (!existing || existing.businessId !== businessId) {
    throw new AppError(404, 'NOT_FOUND', 'Business area not found.')
  }

  await prisma.businessArea.delete({ where: { id: areaId } })
  return { success: true }
}

import { prisma } from '@delve/database'
import type {
  CommunityCategory,
  CommunityDetail,
  CommunityDto,
  CommunityMember,
  CommunityMemberRole,
  CommunityMembershipStatus,
  CommunityRule,
  CommunityType,
  CreateCommunityBody,
  CreateCommunityReportBody,
  UpdateCommunityBody,
  UpsertCommunityRuleBody,
} from '@delve/contracts'
import { AppError } from '../../middleware/error-handler.js'
import {
  canAssignRole,
  canManageCommunity,
  canModerateContent,
  canRemoveMember,
  isAdminPlus,
  isModeratorPlus,
  mapDbRole,
  type MembershipCtx,
} from './community-permissions.js'

type DbMembershipStatus = 'JOINED' | 'REQUESTED' | 'MODERATOR' | 'BANNED'
type DbRole = 'OWNER' | 'ADMIN' | 'MODERATOR' | 'MEMBER'

function mapMembership(status: DbMembershipStatus | null | undefined): CommunityMembershipStatus {
  if (!status) return 'none'
  if (status === 'BANNED') return 'banned'
  if (status === 'REQUESTED') return 'requested'
  return 'joined'
}

function inferCommunityType(category: CommunityCategory): CommunityType {
  if (category === 'TRANSPORT') return 'TRANSPORT'
  if (category === 'DESTINATION' || category === 'LOCAL_ADVICE') return 'DESTINATION'
  return 'INTEREST'
}

async function loadMembership(communityId: string, userId: string | null): Promise<MembershipCtx> {
  if (!userId) return null
  const row = await prisma.communityMembership.findUnique({
    where: { communityId_userId: { communityId, userId } },
  })
  if (!row) return null
  return { status: row.status, role: row.role, mutedUntil: row.mutedUntil }
}

async function writeAudit(
  communityId: string,
  actorId: string | null,
  action: string,
  targetType?: string,
  targetId?: string,
  metadata?: Record<string, unknown>,
) {
  await prisma.communityAuditLog.create({
    data: {
      communityId,
      actorId,
      action,
      targetType,
      targetId,
      metadata: metadata ? (metadata as object) : undefined,
    },
  })
}

async function toDto(
  row: {
    id: string
    slug: string
    name: string
    description: string
    about: string
    communityType: CommunityType
    category: string
    destination: string
    city: string | null
    country: string | null
    isGlobal: boolean
    topics: string[]
    avatarUrl: string | null
    coverUrl: string | null
    privacy: 'PUBLIC' | 'PRIVATE'
    requireJoinApproval: boolean
    requireRuleAcknowledgement: boolean
    requirePostApproval: boolean
    postingPermission: string
    official: boolean
    businessManaged: boolean
    memberCount: number
    lastActivityAt: Date
    ownerUserId: string | null
    owner?: {
      id: string
      username: string
      travelerProfile: { displayName: string | null; avatarUrl: string | null } | null
    } | null
    _count?: { threads: number; rules: number }
  },
  membership: MembershipCtx,
): Promise<CommunityDto> {
  const memberRole: CommunityMemberRole | null = membership ? mapDbRole(membership.role) : null
  let membershipStatus = mapMembership(membership?.status)
  if (membership && isModeratorPlus(membership) && membershipStatus === 'joined') {
    membershipStatus = 'moderator'
  }

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    about: row.about,
    communityType: row.communityType,
    category: row.category as CommunityCategory,
    destination: row.destination,
    city: row.city,
    country: row.country,
    isGlobal: row.isGlobal,
    topics: row.topics,
    avatarUrl: row.avatarUrl,
    coverUrl: row.coverUrl,
    privacy: row.privacy,
    requireJoinApproval: row.requireJoinApproval,
    requireRuleAcknowledgement: row.requireRuleAcknowledgement,
    requirePostApproval: row.requirePostApproval,
    postingPermission: row.postingPermission as CommunityDto['postingPermission'],
    official: row.official,
    businessManaged: row.businessManaged,
    memberCount: row.memberCount,
    postCount: row._count?.threads,
    lastActivityAt: row.lastActivityAt.toISOString(),
    membershipStatus,
    memberRole,
    ruleCount: row._count?.rules,
    owner: row.owner
      ? {
          id: row.owner.id,
          username: row.owner.username,
          displayName: row.owner.travelerProfile?.displayName?.trim() || row.owner.username,
          avatarUrl: row.owner.travelerProfile?.avatarUrl ?? null,
        }
      : row.ownerUserId
        ? null
        : null,
  }
}

export async function createCommunity(userId: string, body: CreateCommunityBody): Promise<CommunityDetail> {
  const slugTaken = await prisma.community.findUnique({ where: { slug: body.slug } })
  if (slugTaken) throw new AppError(409, 'SLUG_TAKEN', 'That community URL is already taken')

  const isGlobal = body.isGlobal ?? !(body.city || body.country)
  const destination =
    body.destination?.trim() ||
    body.city?.trim() ||
    body.country?.trim() ||
    (isGlobal ? 'Worldwide' : 'Unknown')

  const row = await prisma.$transaction(async tx => {
    const community = await tx.community.create({
      data: {
        slug: body.slug,
        name: body.name.trim(),
        description: body.description?.trim() || '',
        about: body.about?.trim() || '',
        communityType: body.communityType ?? inferCommunityType(body.category),
        category: body.category,
        destination,
        city: body.city?.trim() || null,
        country: body.country?.trim() || null,
        isGlobal,
        topics: body.topics ?? [],
        avatarUrl: body.avatarUrl ?? null,
        coverUrl: body.coverUrl ?? null,
        privacy: body.privacy ?? 'PUBLIC',
        requireJoinApproval: body.requireJoinApproval ?? false,
        requireRuleAcknowledgement: body.requireRuleAcknowledgement ?? false,
        requirePostApproval: body.requirePostApproval ?? false,
        postingPermission: body.postingPermission ?? 'MEMBERS',
        ownerUserId: userId,
        memberCount: 1,
        lastActivityAt: new Date(),
      },
      include: {
        owner: { include: { travelerProfile: true } },
        _count: { select: { threads: true, rules: true } },
      },
    })

    await tx.communityMembership.create({
      data: {
        communityId: community.id,
        userId,
        status: 'JOINED',
        role: 'OWNER',
      },
    })

    await tx.communityAuditLog.create({
      data: {
        communityId: community.id,
        actorId: userId,
        action: 'COMMUNITY_CREATED',
      },
    })

    return community
  })

  const dto = await toDto(row, { status: 'JOINED', role: 'OWNER', mutedUntil: null })
  return {
    ...dto,
    canManage: true,
    canModerate: true,
    isOwner: true,
    owner: row.owner
      ? {
          id: row.owner.id,
          username: row.owner.username,
          displayName: row.owner.travelerProfile?.displayName?.trim() || row.owner.username,
          avatarUrl: row.owner.travelerProfile?.avatarUrl ?? null,
        }
      : null,
  }
}

export async function updateCommunity(
  userId: string,
  communityId: string,
  body: UpdateCommunityBody,
): Promise<CommunityDetail> {
  const community = await prisma.community.findFirst({ where: { id: communityId, deletedAt: null } })
  if (!community) throw new AppError(404, 'NOT_FOUND', 'Community not found')

  const membership = await loadMembership(communityId, userId)
  if (!canManageCommunity(membership)) {
    throw new AppError(403, 'FORBIDDEN', 'You cannot edit this community')
  }

  const isGlobal = body.isGlobal ?? community.isGlobal
  const row = await prisma.community.update({
    where: { id: communityId },
    data: {
      ...(body.name != null ? { name: body.name.trim() } : {}),
      ...(body.description != null ? { description: body.description.trim() } : {}),
      ...(body.about != null ? { about: body.about.trim() } : {}),
      ...(body.category != null ? { category: body.category } : {}),
      ...(body.communityType != null ? { communityType: body.communityType } : {}),
      ...(body.destination != null ? { destination: body.destination.trim() } : {}),
      ...(body.city !== undefined ? { city: body.city?.trim() || null } : {}),
      ...(body.country !== undefined ? { country: body.country?.trim() || null } : {}),
      ...(body.isGlobal != null ? { isGlobal } : {}),
      ...(body.topics != null ? { topics: body.topics } : {}),
      ...(body.avatarUrl !== undefined ? { avatarUrl: body.avatarUrl } : {}),
      ...(body.coverUrl !== undefined ? { coverUrl: body.coverUrl } : {}),
      ...(body.privacy != null ? { privacy: body.privacy } : {}),
      ...(body.requireJoinApproval != null ? { requireJoinApproval: body.requireJoinApproval } : {}),
      ...(body.requireRuleAcknowledgement != null
        ? { requireRuleAcknowledgement: body.requireRuleAcknowledgement }
        : {}),
      ...(body.requirePostApproval != null ? { requirePostApproval: body.requirePostApproval } : {}),
      ...(body.postingPermission != null ? { postingPermission: body.postingPermission } : {}),
      updatedAt: new Date(),
    },
    include: {
      owner: { include: { travelerProfile: true } },
      _count: { select: { threads: true, rules: true } },
    },
  })

  await writeAudit(communityId, userId, 'COMMUNITY_UPDATED')
  const dto = await toDto(row, membership)
  return {
    ...dto,
    canManage: canManageCommunity(membership),
    canModerate: canModerateContent(membership),
    isOwner: membership?.role === 'OWNER',
    owner: row.owner
      ? {
          id: row.owner.id,
          username: row.owner.username,
          displayName: row.owner.travelerProfile?.displayName?.trim() || row.owner.username,
          avatarUrl: row.owner.travelerProfile?.avatarUrl ?? null,
        }
      : null,
  }
}

export async function getCommunityDetail(slugOrId: string, viewerId: string | null): Promise<CommunityDetail> {
  const row = await prisma.community.findFirst({
    where: { deletedAt: null, OR: [{ slug: slugOrId }, { id: slugOrId }] },
    include: {
      owner: { include: { travelerProfile: true } },
      _count: { select: { threads: true, rules: true } },
    },
  })
  if (!row) throw new AppError(404, 'NOT_FOUND', 'Community not found')

  const membership = await loadMembership(row.id, viewerId)
  const dto = await toDto(row, membership)
  return {
    ...dto,
    canManage: canManageCommunity(membership),
    canModerate: canModerateContent(membership),
    isOwner: membership?.role === 'OWNER',
    owner: row.owner
      ? {
          id: row.owner.id,
          username: row.owner.username,
          displayName: row.owner.travelerProfile?.displayName?.trim() || row.owner.username,
          avatarUrl: row.owner.travelerProfile?.avatarUrl ?? null,
        }
      : null,
  }
}

export async function listCommunityRules(communityId: string): Promise<CommunityRule[]> {
  const rows = await prisma.communityRule.findMany({
    where: { communityId },
    orderBy: { sortOrder: 'asc' },
  })
  return rows.map(r => ({
    id: r.id,
    title: r.title,
    description: r.description,
    sortOrder: r.sortOrder,
  }))
}

export async function createCommunityRule(
  userId: string,
  communityId: string,
  body: UpsertCommunityRuleBody,
): Promise<CommunityRule> {
  const membership = await loadMembership(communityId, userId)
  if (!canManageCommunity(membership)) throw new AppError(403, 'FORBIDDEN', 'Not allowed')

  const maxOrder = await prisma.communityRule.aggregate({
    where: { communityId },
    _max: { sortOrder: true },
  })
  const row = await prisma.communityRule.create({
    data: {
      communityId,
      title: body.title.trim(),
      description: body.description?.trim() || '',
      sortOrder: body.sortOrder ?? (maxOrder._max.sortOrder ?? -1) + 1,
    },
  })
  await writeAudit(communityId, userId, 'RULE_CREATED', 'RULE', row.id)
  return { id: row.id, title: row.title, description: row.description, sortOrder: row.sortOrder }
}

export async function updateCommunityRule(
  userId: string,
  communityId: string,
  ruleId: string,
  body: UpsertCommunityRuleBody,
): Promise<CommunityRule> {
  const membership = await loadMembership(communityId, userId)
  if (!canManageCommunity(membership)) throw new AppError(403, 'FORBIDDEN', 'Not allowed')

  const existing = await prisma.communityRule.findFirst({ where: { id: ruleId, communityId } })
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Rule not found')

  const row = await prisma.communityRule.update({
    where: { id: ruleId },
    data: {
      ...(body.title != null ? { title: body.title.trim() } : {}),
      ...(body.description != null ? { description: body.description.trim() } : {}),
      ...(body.sortOrder != null ? { sortOrder: body.sortOrder } : {}),
    },
  })
  await writeAudit(communityId, userId, 'RULE_UPDATED', 'RULE', ruleId)
  return { id: row.id, title: row.title, description: row.description, sortOrder: row.sortOrder }
}

export async function deleteCommunityRule(userId: string, communityId: string, ruleId: string) {
  const membership = await loadMembership(communityId, userId)
  if (!canManageCommunity(membership)) throw new AppError(403, 'FORBIDDEN', 'Not allowed')

  const existing = await prisma.communityRule.findFirst({ where: { id: ruleId, communityId } })
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Rule not found')

  await prisma.communityRule.delete({ where: { id: ruleId } })
  await writeAudit(communityId, userId, 'RULE_DELETED', 'RULE', ruleId)
}

export async function listCommunityMembers(communityId: string, viewerId: string | null): Promise<CommunityMember[]> {
  const community = await prisma.community.findFirst({ where: { id: communityId, deletedAt: null } })
  if (!community) throw new AppError(404, 'NOT_FOUND', 'Community not found')

  const viewerMem = await loadMembership(communityId, viewerId)
  const isMember = isModeratorPlus(viewerMem) || viewerMem?.status === 'JOINED'
  if (community.privacy === 'PRIVATE' && !isMember && viewerMem?.status !== 'REQUESTED') {
    throw new AppError(403, 'FORBIDDEN', 'Members only')
  }

  const rows = await prisma.communityMembership.findMany({
    where: { communityId, status: { in: ['JOINED', 'MODERATOR'] } },
    include: { user: { include: { travelerProfile: true } } },
    orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
    take: 200,
  })

  return rows.map(m => ({
    userId: m.userId,
    username: m.user.username,
    displayName: m.user.travelerProfile?.displayName?.trim() || m.user.username,
    avatarUrl: m.user.travelerProfile?.avatarUrl ?? null,
    role: mapDbRole(m.role),
    status: mapMembership(m.status),
    joinedAt: m.createdAt.toISOString(),
  }))
}

export async function updateMemberRole(
  actorId: string,
  communityId: string,
  targetUserId: string,
  role: CommunityMemberRole,
) {
  const dbRole = role.toUpperCase() as DbRole
  const actorMem = await loadMembership(communityId, actorId)
  const targetMem = await loadMembership(communityId, targetUserId)
  if (!targetMem) throw new AppError(404, 'NOT_FOUND', 'Member not found')
  if (!canAssignRole(actorMem, dbRole)) throw new AppError(403, 'FORBIDDEN', 'Not allowed')
  if (targetMem.role === 'OWNER') throw new AppError(403, 'FORBIDDEN', 'Cannot change owner role')

  await prisma.communityMembership.update({
    where: { communityId_userId: { communityId, userId: targetUserId } },
    data: { role: dbRole },
  })
  await writeAudit(communityId, actorId, 'ROLE_CHANGED', 'USER', targetUserId, { role: dbRole })
}

export async function banMember(actorId: string, communityId: string, targetUserId: string, reason?: string) {
  const actorMem = await loadMembership(communityId, actorId)
  const targetMem = await loadMembership(communityId, targetUserId)
  if (!targetMem) throw new AppError(404, 'NOT_FOUND', 'Member not found')
  if (!canRemoveMember(actorMem, targetMem)) throw new AppError(403, 'FORBIDDEN', 'Not allowed')

  await prisma.communityMembership.update({
    where: { communityId_userId: { communityId, userId: targetUserId } },
    data: { status: 'BANNED', banReason: reason?.trim() || null },
  })
  await prisma.community.update({
    where: { id: communityId },
    data: { memberCount: { decrement: 1 } },
  })
  await writeAudit(communityId, actorId, 'MEMBER_BANNED', 'USER', targetUserId, { reason })
}

export async function createReport(userId: string, communityId: string, body: CreateCommunityReportBody) {
  const membership = await loadMembership(communityId, userId)
  if (!membership || membership.status === 'BANNED') {
    throw new AppError(403, 'FORBIDDEN', 'Join this community to report content')
  }

  const row = await prisma.communityReport.create({
    data: {
      communityId,
      reporterId: userId,
      targetType: body.targetType,
      targetId: body.targetId,
      ruleId: body.ruleId ?? null,
      reason: body.reason.trim(),
      description: body.description?.trim() || null,
    },
  })
  return { id: row.id }
}

export async function listReports(userId: string, communityId: string) {
  const membership = await loadMembership(communityId, userId)
  if (!canModerateContent(membership)) throw new AppError(403, 'FORBIDDEN', 'Not allowed')

  const rows = await prisma.communityReport.findMany({
    where: { communityId, status: 'OPEN' },
    include: {
      reporter: { include: { travelerProfile: true } },
      rule: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  return rows.map(r => ({
    id: r.id,
    targetType: r.targetType,
    targetId: r.targetId,
    reason: r.reason,
    description: r.description,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
    reporter: {
      id: r.reporter.id,
      username: r.reporter.username,
      displayName: r.reporter.travelerProfile?.displayName?.trim() || r.reporter.username,
      avatarUrl: r.reporter.travelerProfile?.avatarUrl ?? null,
    },
    rule: r.rule
      ? { id: r.rule.id, title: r.rule.title, description: r.rule.description, sortOrder: r.rule.sortOrder }
      : null,
  }))
}

export async function resolveReport(userId: string, communityId: string, reportId: string) {
  const membership = await loadMembership(communityId, userId)
  if (!canModerateContent(membership)) throw new AppError(403, 'FORBIDDEN', 'Not allowed')

  await prisma.communityReport.update({
    where: { id: reportId },
    data: { status: 'RESOLVED' },
  })
  await writeAudit(communityId, userId, 'REPORT_RESOLVED', 'REPORT', reportId)
}

export { toDto as communityRowToDto, loadMembership, mapMembership }

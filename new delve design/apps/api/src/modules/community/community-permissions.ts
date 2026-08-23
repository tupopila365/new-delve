import type { CommunityMemberRole } from '@delve/contracts'

type DbRole = 'OWNER' | 'ADMIN' | 'MODERATOR' | 'MEMBER'
type DbStatus = 'JOINED' | 'REQUESTED' | 'MODERATOR' | 'BANNED'

export type MembershipCtx = {
  status: DbStatus
  role: DbRole
  mutedUntil: Date | null
} | null

export function mapDbRole(role: DbRole): CommunityMemberRole {
  return role.toLowerCase() as CommunityMemberRole
}

export function isActiveMember(m: MembershipCtx): boolean {
  if (!m) return false
  if (m.status === 'BANNED') return false
  if (m.status === 'REQUESTED') return false
  if (m.mutedUntil && m.mutedUntil.getTime() > Date.now()) return true
  return m.status === 'JOINED' || m.status === 'MODERATOR'
}

export function isModeratorPlus(m: MembershipCtx): boolean {
  if (!isActiveMember(m)) return false
  return m!.role === 'OWNER' || m!.role === 'ADMIN' || m!.role === 'MODERATOR'
}

export function isAdminPlus(m: MembershipCtx): boolean {
  if (!isActiveMember(m)) return false
  return m!.role === 'OWNER' || m!.role === 'ADMIN'
}

export function isOwner(m: MembershipCtx): boolean {
  return isActiveMember(m) && m!.role === 'OWNER'
}

export function canManageCommunity(m: MembershipCtx): boolean {
  return isAdminPlus(m)
}

export function canModerateContent(m: MembershipCtx): boolean {
  return isModeratorPlus(m)
}

export function canAssignRole(actor: MembershipCtx, targetRole: DbRole): boolean {
  if (!actor || actor.status === 'BANNED') return false
  if (actor.role === 'OWNER') return targetRole !== 'OWNER'
  if (actor.role === 'ADMIN') return targetRole === 'MODERATOR' || targetRole === 'MEMBER'
  return false
}

export function canRemoveMember(actor: MembershipCtx, target: MembershipCtx): boolean {
  if (!actor || !target) return false
  if (target.role === 'OWNER') return false
  if (actor.role === 'OWNER') return true
  if (actor.role === 'ADMIN') return target.role === 'MODERATOR' || target.role === 'MEMBER'
  return false
}

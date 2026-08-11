import { prisma } from '@delve/database'
import type { AdminAuditAction } from '@delve/contracts'
import { createHash, randomUUID } from 'node:crypto'

export type AdminAuditInput = {
  action: AdminAuditAction
  outcome: 'success' | 'failure' | 'denied'
  actorUserId?: string | null
  actorSessionId?: string | null
  targetType?: string | null
  targetId?: string | null
  reason?: string | null
  metadata?: Record<string, unknown>
  correlationId?: string | null
  /** Normalized identifier — stored hashed only for anonymous failures. */
  identifier?: string | null
}

export function hashIdentifier(identifier: string): string {
  return createHash('sha256').update(identifier.trim().toLowerCase()).digest('hex')
}

export function newCorrelationId(): string {
  return randomUUID()
}

/**
 * Append-only admin audit write. Never throws secrets outward — swallows non-critical failures.
 */
export async function writeAdminAudit(input: AdminAuditInput): Promise<void> {
  try {
    const metadata = input.metadata
      ? (JSON.parse(JSON.stringify(sanitizeAuditMetadata(input.metadata))) as object)
      : undefined
    await prisma.adminAuditLog.create({
      data: {
        action: input.action,
        outcome: input.outcome,
        actorUserId: input.actorUserId || null,
        actorSessionId: input.actorSessionId || null,
        targetType: input.targetType || null,
        targetId: input.targetId || null,
        reason: input.reason ? String(input.reason).slice(0, 500) : null,
        metadata,
        correlationId: input.correlationId || newCorrelationId(),
        identifierHash: input.identifier ? hashIdentifier(input.identifier) : null,
      },
    })
  } catch {
    // Non-critical: never block auth on audit write failure.
  }
}

const BLOCKED_META_KEYS = /password|token|secret|authorization|cookie|refresh|hash/i

function sanitizeAuditMetadata(value: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, raw] of Object.entries(value)) {
    if (BLOCKED_META_KEYS.test(key)) continue
    if (typeof raw === 'string') {
      out[key] = raw.slice(0, 200)
      continue
    }
    if (typeof raw === 'number' || typeof raw === 'boolean' || raw === null) {
      out[key] = raw
      continue
    }
  }
  return out
}

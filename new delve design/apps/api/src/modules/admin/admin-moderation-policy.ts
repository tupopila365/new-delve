import type { AdminAccountStatus } from '@delve/contracts'

export function moderationPolicyContext(input: {
  removedLast30Days: number
  priorAccountRestrictions: number
  accountStatus: AdminAccountStatus | string | null
}) {
  const facts: string[] = []
  if (input.removedLast30Days > 0) {
    facts.push(`${input.removedLast30Days} content removal(s) in the last 30 days`)
  }
  if (input.priorAccountRestrictions > 0) {
    facts.push(`${input.priorAccountRestrictions} prior account restriction(s)`)
  }
  const status = input.accountStatus || 'unknown'
  facts.push(`Current account status: ${String(status).replace(/_/g, ' ')}`)
  const recommendReview = input.removedLast30Days >= 3 || input.priorAccountRestrictions >= 1
  return {
    facts,
    recommendation: recommendReview
      ? 'Consider reviewing the Traveler account. This is guidance only and does not change account status.'
      : null,
  }
}

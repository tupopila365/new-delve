/** Client preference for which provider business is active in the dashboard. */

const KEY_PREFIX = 'delve.activeBusinessId.'

export function readActiveBusinessId(username: string | undefined | null): number | null {
  if (!username || typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(`${KEY_PREFIX}${username}`)
    const n = Number(raw)
    return Number.isFinite(n) && n > 0 ? n : null
  } catch {
    return null
  }
}

export function writeActiveBusinessId(username: string | undefined | null, id: number | null): void {
  if (!username || typeof localStorage === 'undefined') return
  try {
    if (id == null) {
      localStorage.removeItem(`${KEY_PREFIX}${username}`)
      return
    }
    localStorage.setItem(`${KEY_PREFIX}${username}`, String(id))
  } catch {
    /* ignore quota / private mode */
  }
}

/** Drop the synthetic multi_provider marker — real modules use concrete types only. */
export function concreteBusinessTypes(types: string[] | undefined | null): string[] {
  return (types ?? []).filter((t) => t !== 'multi_provider')
}

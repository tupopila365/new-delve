import type { Env } from '../config/env.js'
import { runFinancialReconciliation } from '../modules/payment/reconciliation.service.js'

let timer: ReturnType<typeof setTimeout> | null = null
let running = false

export function startReconciliationScheduler(env: Env) {
  if (!env.reconciliationScheduleEnabled || !env.stripeConfigured) return () => undefined
  const intervalMs = env.RECONCILIATION_INTERVAL_MINUTES * 60 * 1000

  const tick = async () => {
    if (running) return
    running = true
    try {
      await runFinancialReconciliation(env, { scope: 'STALE', triggeredByType: 'SCHEDULE' })
    } catch (err) {
      console.error('[reconciliation-scheduler]', err instanceof Error ? err.message : 'run failed')
    } finally {
      running = false
      timer = setTimeout(() => void tick(), intervalMs)
      timer.unref()
    }
  }

  timer = setTimeout(() => void tick(), intervalMs)
  timer.unref()
  return () => {
    if (timer) clearTimeout(timer)
  }
}

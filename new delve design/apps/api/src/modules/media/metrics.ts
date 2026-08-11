/** Privacy-safe media metrics. Never log secrets, signed params, tokens, or media bytes content. */

type MetricName =
  | 'upload_intent_created'
  | 'upload_completed'
  | 'upload_failed'
  | 'deletion_failed'
  | 'abandoned_upload_intent'

export function recordMediaMetric(name: MetricName, fields: Record<string, string | number | undefined> = {}) {
  const safe: Record<string, string | number> = {}
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue
    if (/secret|signature|token|authorization|password/i.test(key)) continue
    safe[key] = value
  }
  // Structured console metric — replace with your APM sink later.
  console.info(JSON.stringify({ type: 'media_metric', name, ...safe, at: new Date().toISOString() }))
}

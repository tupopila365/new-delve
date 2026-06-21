/** Stable numeric id for messaging — matches mock API `messagingNumericIdForUsername`. */
export function messagingUserIdForUsername(username: string): number {
  const u = username.trim().toLowerCase()
  if (u === 'demo_user') return 1
  if (u === 'demo_provider') return 2
  let h = 2166136261
  for (let i = 0; i < username.length; i++) {
    h ^= username.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return 10_000 + (Math.abs(h) % 900_000)
}

export function formatMessageTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

export type ProviderProfile = {
  username: string
  display_name?: string
  bio?: string
  city?: string
  region?: string
  user_type?: string
}

export type AutomatedMessage = {
  id: string
  body: string
  label?: string
}

export function buildProviderAutomatedMessages(profile: ProviderProfile): AutomatedMessage[] {
  const name = profile.display_name?.trim() || profile.username
  const place = [profile.city, profile.region].filter(Boolean).join(', ')
  const isProvider = profile.user_type === 'service_provider'

  if (isProvider) {
    const lines = [
      `Thanks for messaging ${name}. This is an automated welcome — a team member will reply shortly.`,
      place
        ? `We're based in ${place}. Share your travel dates, group size, and any questions below.`
        : 'Share your travel dates, group size, and any questions below.',
    ]
    if (profile.bio?.trim()) {
      lines.push(profile.bio.trim())
    }
    return lines.map((body, i) => ({
      id: `auto-${profile.username}-${i}`,
      body,
      label: i === 0 ? 'Automated · Provider' : undefined,
    }))
  }

  return [
    {
      id: `auto-${profile.username}-0`,
      body: `Say hello to ${name}. Keep your plans and questions in this thread.`,
      label: 'Automated',
    },
  ]
}

export const DM_QUICK_REPLIES = [
  'Hi — is this still available?',
  'What are your rates?',
  "I'd like to make a booking.",
  'Can you share more details?',
] as const

export const PROVIDER_DM_QUICK_REPLIES = [
  'Thanks for reaching out — how can I help?',
  'Your booking is confirmed.',
  'Could you share your arrival date?',
  'We look forward to hosting you.',
] as const

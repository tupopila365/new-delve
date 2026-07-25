/** Calm “how locals do this” copy for claim sheets and offer detail. */

export type LocalBookingTip = {
  title: string
  body: string
}

export function localBookingTipForDeal(input: {
  eligibility?: string | null
  offer_kind?: string | null
  badge_kind?: string | null
  source?: string | null
  proof_required?: string | null
}): LocalBookingTip {
  const eligibility = (input.eligibility || '').toLowerCase()
  const kind = (input.offer_kind || input.badge_kind || '').toLowerCase()
  const isSale = input.source === 'listing_sale' || input.badge_kind === 'sale'

  if (isSale) {
    return {
      title: 'How locals book this',
      body: 'Book while the sale badge is showing. The lower price applies on the listing — no special code needed.',
    }
  }
  if (eligibility === 'sadc') {
    return {
      title: 'How locals book this',
      body: 'Message the host, mention the SADC rate, and bring your SADC passport (or ID) at check-in. Hosts do this every week — it’s normal.',
    }
  }
  if (eligibility === 'student') {
    return {
      title: 'How locals book this',
      body: 'Ask for the student rate when you enquire, then show a valid student card at check-in. Keep it simple and friendly.',
    }
  }
  if (eligibility === 'local') {
    return {
      title: 'How locals book this',
      body: 'Say you’re booking the local / resident rate. A national ID or proof of address is usually enough at arrival.',
    }
  }
  if (kind === 'package') {
    return {
      title: 'How locals book this',
      body: 'Treat the package as one clear trip price. Message the host with your dates, confirm what’s included, then lock it in.',
    }
  }
  if (input.proof_required?.trim()) {
    return {
      title: 'How locals book this',
      body: 'Mention the rate when you book, then bring the listed proof at check-in. Ordinary ID checks — not a hurdle.',
    }
  }
  return {
    title: 'How locals book this',
    body: 'Message the host, name the rate, and confirm dates. If you’re unsure you qualify, ask kindly — hosts are used to helping.',
  }
}

export const RATES_KNOW_HOW = [
  {
    id: 'sadc',
    title: 'SADC passport',
    body: 'Many resident rates just need a SADC passport at check-in.',
    to: '/deals?eligibility=sadc',
  },
  {
    id: 'student',
    title: 'Student ID',
    body: 'Student rates usually ask for a valid student card — show it when you arrive.',
    to: '/deals?eligibility=student',
  },
  {
    id: 'guide',
    title: 'Ask a guide',
    body: 'Unsure about borders, seasons, or what to bring? Guides help you figure it out.',
    to: '/guides',
  },
  {
    id: 'community',
    title: 'Ask locals',
    body: 'Community tips cover when to go, what to pack, and how bookings work on the ground.',
    to: '/community',
  },
] as const

export const WELCOME_RATES_STORAGE_KEY = 'delve_welcome_rates_dismissed'

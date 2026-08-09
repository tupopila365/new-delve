import type { ChatMessage, Conversation, SafetyCaseStatus } from './types'

export const CONVERSATIONS: Conversation[] = [
  {
    id: 'c1', type: 'personal', name: 'Youssef M.', handle: '@youssef.m',
    avatar: 'https://images.unsplash.com/photo-1679486038087-40723e5bbf6b?w=112&h=112&fit=crop&auto=format',
    preview: 'Are you arriving Friday or Saturday?', time: '2m', unread: 2, muted: false, pinned: true, verified: false,
    onlineAllowed: true, readReceiptsAllowed: true, contextLabel: 'Mutual Journey: Morocco Golden Route',
  },
  {
    id: 'c2', type: 'journey', name: 'Morocco Golden Route', handle: '4 travelers',
    avatar: 'https://images.unsplash.com/photo-1539239476882-b5cc2f18d7e0?w=112&h=112&fit=crop&auto=format',
    preview: 'Layla: I booked the hammam for Friday evening', time: '18m', unread: 3, muted: false, pinned: true, verified: false,
    contextLabel: '14–21 Aug · Marrakech → Fès',
  },
  {
    id: 'c3', type: 'business', name: 'Riad Dar Zitoun', handle: 'Verified business',
    avatar: 'https://images.unsplash.com/photo-1539635278303-d4002c07eae3?w=112&h=112&fit=crop&auto=format',
    preview: 'Your early check-in for Aug 14 is confirmed', time: '1h', unread: 0, muted: false, pinned: false, verified: true,
    bookingRef: 'DLV-EX-STAY1', contextLabel: 'Stay · 14–16 Aug', responseExpectation: 'Usually replies within a few hours',
  },
  {
    id: 'c4', type: 'transport', name: 'Atlas Transfers', handle: 'Airport transfer · Verified',
    avatar: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=112&h=112&fit=crop&auto=format',
    preview: 'Driver will meet you at Arrivals A', time: '2h', unread: 1, muted: false, pinned: false, verified: true,
    bookingRef: 'DLV-EX-TRF08', transportMode: 'Airport transfer', contextLabel: 'RAK → Medina · 14 Aug 10:40',
  },
  {
    id: 'c5', type: 'transport', name: 'Host Lena', handle: 'Community ride host',
    avatar: 'https://images.unsplash.com/photo-1582152629442-4a864303fb96?w=112&h=112&fit=crop&auto=format',
    preview: 'Pickup is still the mall entrance', time: '4h', unread: 0, muted: false, pinned: false, verified: false,
    bookingRef: 'DLV-EX-CR11', transportMode: 'Community ride', contextLabel: 'Walvis → Swakop · seat',
  },
  {
    id: 'c6', type: 'community', name: 'Morocco Travellers', handle: '2.4k members',
    avatar: 'https://images.unsplash.com/photo-1517256673644-36ad11246d21?w=112&h=112&fit=crop&auto=format',
    preview: 'Moderator pinned: Ramadan dates 2027', time: '3h', unread: 0, muted: true, pinned: false, verified: false,
    contextLabel: 'Public community · Rules apply',
  },
  {
    id: 'c7', type: 'support', name: 'Delve Support', handle: 'Case SUP-EX-441',
    avatar: null,
    preview: 'We received your refund question.', time: '1d', unread: 0, muted: false, pinned: false, verified: true,
    supportCaseRef: 'SUP-EX-441', bookingRef: 'DLV-EX-CX44', responseExpectation: 'Typical reply within a few hours when open',
  },
  {
    id: 'c8', type: 'request', name: 'Samir K.', handle: '@samir.k · Request',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=112&h=112&fit=crop&auto=format',
    preview: 'Hi — saw your Journey post. Can I join?', time: '5h', unread: 1, muted: false, pinned: false, verified: false,
    isRequest: true, contextLabel: 'No mutual Journey yet',
  },
  {
    id: 'c9', type: 'personal', name: 'Priya K.', handle: '@priyak',
    avatar: 'https://images.unsplash.com/photo-1712673363487-4f5e529df0b3?w=112&h=112&fit=crop&auto=format',
    preview: 'Draft: Thanks for the tip about…', time: '2d', unread: 0, muted: false, pinned: false, verified: false,
    draft: 'Thanks for the tip about the bus', archived: false,
  },
]

export const THREADS: Record<string, ChatMessage[]> = {
  c1: [
    { id: 'm1', conversationId: 'c1', from: 'other', kind: 'text', text: 'Hey! So excited for Morocco', time: '09:12', delivery: 'read' },
    { id: 'm2', conversationId: 'c1', from: 'other', kind: 'text', text: 'Which riad did you book in the end?', time: '09:13', delivery: 'read' },
    { id: 'm3', conversationId: 'c1', from: 'me', kind: 'text', text: 'Riad Dar Zitoun! The reviews are incredible', time: '09:16', delivery: 'read' },
    { id: 'm4', conversationId: 'c1', from: 'me', kind: 'booking', time: '09:17', delivery: 'read', entity: { type: 'booking', title: 'Riad Dar Zitoun', subtitle: '14–16 Aug · Example ref DLV-EX-STAY1', status: 'Confirmed', meta: 'Payment details stay private' } },
    { id: 'm5', conversationId: 'c1', from: 'other', kind: 'text', text: 'Nice!! Are you arriving Friday or Saturday?', time: '11:04', delivery: 'delivered', reactions: [{ emoji: '🙏', count: 1, mine: true }] },
  ],
  c2: [
    { id: 'j0', conversationId: 'c2', from: 'system', kind: 'system', text: 'Amara added a stay to the Journey itinerary', time: 'Yesterday' },
    { id: 'j1', conversationId: 'c2', from: 'other', senderName: 'Layla', kind: 'text', text: 'I booked the hammam for Friday evening', time: '10:02', delivery: 'read' },
    { id: 'j2', conversationId: 'c2', from: 'me', kind: 'deal', time: '10:10', delivery: 'read', entity: { type: 'deal', title: 'Medina Walking Tour', subtitle: 'Example deal · 20% off', price: 'N$ 280', status: 'Available' } },
    { id: 'j3', conversationId: 'c2', from: 'other', senderName: 'Youssef', kind: 'text', text: 'That deal looks good — who is in?', time: '10:22' },
  ],
  c3: [
    { id: 'b1', conversationId: 'c3', from: 'other', senderName: 'Riad Dar Zitoun', kind: 'text', text: 'Welcome. Your early check-in for Aug 14 is confirmed.', time: '08:00', delivery: 'read' },
    { id: 'b2', conversationId: 'c3', from: 'system', kind: 'system', text: 'Automated · Booking confirmation notice', time: '08:00' },
    { id: 'b3', conversationId: 'c3', from: 'me', kind: 'text', text: 'Thank you — we will arrive around 13:00.', time: '08:40', delivery: 'read' },
  ],
  c4: [
    { id: 't1', conversationId: 'c4', from: 'other', senderName: 'Atlas Transfers', kind: 'text', text: 'Your transfer is confirmed. Driver will meet you at Arrivals A with a Delve sign.', time: '07:10' },
    { id: 't2', conversationId: 'c4', from: 'me', kind: 'location', time: '07:30', delivery: 'sent', locationLabel: 'Pickup: Arrivals A (shared once)' },
    { id: 't3', conversationId: 'c4', from: 'other', kind: 'text', text: 'Seen — we will wait there.', time: '07:32' },
  ],
  c5: [
    { id: 'cr1', conversationId: 'c5', from: 'system', kind: 'system', text: 'Community ride host — not labeled as a licensed operator unless verified', time: 'Mon' },
    { id: 'cr2', conversationId: 'c5', from: 'other', senderName: 'Lena', kind: 'text', text: 'Pickup is still the mall entrance. Blue hatchback.', time: '16:00' },
  ],
  c6: [
    { id: 'cm1', conversationId: 'c6', from: 'system', kind: 'system', text: 'Moderator pinned a community announcement', time: 'Mon' },
    { id: 'cm2', conversationId: 'c6', from: 'other', senderName: 'Moderator Nora', kind: 'text', text: 'Please keep marketplace offers in the Deals channel.', time: '12:00' },
  ],
  c7: [
    { id: 's1', conversationId: 'c7', from: 'other', senderName: 'Delve Support', kind: 'text', text: 'We received your refund question for example case SUP-EX-441.', time: 'Yesterday' },
    { id: 's2', conversationId: 'c7', from: 'system', kind: 'system', text: 'Internal staff notes are never shown here', time: 'Yesterday' },
    { id: 's3', conversationId: 'c7', from: 'me', kind: 'text', text: 'Thanks — the bank has not shown the refund yet.', time: 'Yesterday', delivery: 'delivered' },
  ],
  c8: [
    { id: 'r1', conversationId: 'c8', from: 'other', kind: 'text', text: 'Hi — saw your Journey post. Can I join?', time: '09:00' },
    { id: 'r2', conversationId: 'c8', from: 'system', kind: 'system', text: 'Message request · Read receipts and online status are hidden until you accept', time: '09:00' },
  ],
  c9: [
    { id: 'p1', conversationId: 'c9', from: 'other', kind: 'text', text: 'The Intercape coach was fine — sit upstairs if you can.', time: 'Mon' },
  ],
}

export const SAFETY_CASES: { id: string; category: string; status: SafetyCaseStatus; ref: string; updated: string }[] = [
  { id: 'sc1', category: 'Suspicious payment request', status: 'Under review', ref: 'SAFE-EX-102', updated: '2h ago' },
]

export const BLOCKED_ACCOUNTS = [
  { id: 'bl1', name: 'Unknown seller', handle: '@deal.rush', when: '12 Jul 2026' },
]

export const NEW_MESSAGE_TARGETS = [
  { id: 'n1', name: 'Youssef M.', handle: '@youssef.m', status: 'can_message' as const, note: 'Follows you · Journey member' },
  { id: 'n2', name: 'Riad Dar Zitoun', handle: 'Verified business', status: 'booking_required' as const, note: 'Active booking channel available' },
  { id: 'n3', name: 'Samir K.', handle: '@samir.k', status: 'request_required' as const, note: 'Message request required' },
  { id: 'n4', name: 'Private account', handle: '@hidden', status: 'cannot_message' as const, note: 'This traveler disabled requests' },
]

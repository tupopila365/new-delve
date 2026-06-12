export type QaAnswerRow = {
  author: string
  initial: string
  time: string
  body: string
  helpful: number
  isYours?: boolean
}

export type QaQuestion = {
  id: string
  author: string
  initial: string
  time: string
  region: string
  question: string
  tags: string[]
  views: number
  answers: QaAnswerRow[]
}

const LOCATION_TAG_NAMES = new Set([
  'Windhoek',
  'Erongo',
  'Tokyo',
  'Lisbon',
  'Etosha',
  'Khomas',
  'Kunene',
  'Oshana',
  'Swakopmund',
  'Cape Town',
  'Airport',
])

export function isLocationTag(tag: string, region: string): boolean {
  if (tag.toLowerCase() === region.toLowerCase()) return true
  return LOCATION_TAG_NAMES.has(tag)
}

export function questionStatus(answerCount: number, maxHelpful: number) {
  if (answerCount === 0) return { label: 'Needs answer', variant: 'needs' as const }
  if (maxHelpful >= 10) return { label: 'Popular', variant: 'popular' as const }
  if (answerCount >= 2) return { label: `${answerCount} local answers`, variant: 'answered' as const }
  return { label: 'Local answered', variant: 'answered' as const }
}
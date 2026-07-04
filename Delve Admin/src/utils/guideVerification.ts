const GUIDE_DOCS = [
  'Business registration',
  'Tour guide license',
  'First aid certificate (optional)',
  'Tourism / hospitality license (optional)',
]

export function expectedGuideDocHints(): string[] {
  return [...GUIDE_DOCS]
}

export function isGuideBusiness(businessTypes: string[] | undefined): boolean {
  return (businessTypes ?? []).includes('guide')
}

export function guideServiceLabel(): string {
  return 'Tour guide'
}

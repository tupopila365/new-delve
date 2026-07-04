const FOOD_DOCS = [
  'Business registration',
  'Food handling certificate (optional)',
]

export function expectedFoodDocHints(): string[] {
  return [...FOOD_DOCS]
}

export function isFoodBusiness(businessTypes: string[] | undefined): boolean {
  return (businessTypes ?? []).includes('food_drink')
}

export function foodServiceLabel(): string {
  return 'Food & drink venue'
}

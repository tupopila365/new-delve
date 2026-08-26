

export function moneyLabel(currency: string, amount: string) {
  const n = Number(amount)
  const formatted = Number.isFinite(n)
    ? n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : amount
  return `${currency} ${formatted}`
}

export function moneyOrUnknown(currency: string, amount: string | null | undefined, unknown: boolean) {
  if (unknown || amount == null) return 'Not reconciled'
  return moneyLabel(currency, amount)
}


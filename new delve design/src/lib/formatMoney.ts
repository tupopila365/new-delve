/** Display-only. Never use this to compute discounts. */
export function formatMoney(currency: string, amount: string | number | null | undefined): string {
  if (amount == null || amount === '') return ''
  const raw = typeof amount === 'number' ? amount.toFixed(2) : amount
  const n = Number(raw)
  if (!Number.isFinite(n)) return `${currency} ${raw}`
  return `${currency} ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

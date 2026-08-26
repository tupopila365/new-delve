import { moneyLabel, moneyOrUnknown } from '../../lib/money'

export function Money({ currency, amount }: { currency: string; amount: string }) {
  return <span>{moneyLabel(currency, amount)}</span>
}

export function MoneyOrUnknown({
  currency,
  amount,
  unknown,
}: {
  currency: string
  amount: string | null | undefined
  unknown: boolean
}) {
  return <span>{moneyOrUnknown(currency, amount, unknown)}</span>
}

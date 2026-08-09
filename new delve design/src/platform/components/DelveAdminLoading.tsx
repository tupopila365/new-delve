type Props = {
  count?: number
}

export function DelveAdminLoading({ count = 4 }: Props) {
  return (
    <div className="da-loading" aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="da-loading__bar" />
      ))}
    </div>
  )
}

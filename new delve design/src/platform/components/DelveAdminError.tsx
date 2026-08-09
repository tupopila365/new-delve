type Props = {
  message?: string
  onRetry?: () => void
}

export function DelveAdminError({ message = 'Something went wrong.', onRetry }: Props) {
  return (
    <div className="da-error" role="alert">
      <p>{message}</p>
      {onRetry ? (
        <button type="button" className="da-error__retry" onClick={onRetry}>
          Try again
        </button>
      ) : null}
    </div>
  )
}

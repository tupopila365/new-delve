type Props = {
  className?: string
}

export function DetailSkeleton({ className = '' }: Props) {
  return <div className={`skeleton dl-detail__skeleton ${className}`.trim()} />
}

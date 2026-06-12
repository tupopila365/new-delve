type Props = {
  count?: number
  className?: string
  variant?: 'card' | 'row'
}

export function ListSkeleton({ count = 5, className = '', variant = 'card' }: Props) {
  return (
    <div className={`ui-skeleton-rail ui-skeleton-rail--${variant} ${className}`.trim()} aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="ui-skeleton-rail__item">
          <div className="skeleton ui-skeleton-rail__media" />
          <div className="ui-skeleton-rail__body">
            <div className="skeleton ui-skeleton-rail__line ui-skeleton-rail__line--title" />
            <div className="skeleton ui-skeleton-rail__line ui-skeleton-rail__line--meta" />
          </div>
        </div>
      ))}
    </div>
  )
}

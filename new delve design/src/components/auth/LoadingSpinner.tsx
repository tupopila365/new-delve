export interface LoadingSpinnerProps {
  size?: number
  /** Stroke colour; defaults to the current text colour so it inherits buttons. */
  color?: string
  label?: string
  thickness?: number
}

export default function LoadingSpinner({
  size = 18,
  color = 'currentColor',
  label,
  thickness = 2,
}: LoadingSpinnerProps) {
  return (
    <span
      className="auth-spinner"
      role={label ? 'status' : undefined}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      style={{
        width: size,
        height: size,
        borderWidth: thickness,
        borderStyle: 'solid',
        borderColor: 'currentColor',
        borderTopColor: 'transparent',
        borderRadius: '50%',
        display: 'inline-block',
        color,
        flexShrink: 0,
      }}
    />
  )
}

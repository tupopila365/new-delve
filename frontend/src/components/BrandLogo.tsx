import delveLogo from '../assets/DELVElogo.jpg'

type Props = {
  className?: string
  /** Decorative when parent link already has aria-label */
  alt?: string
}

/** Shared DELVE wordmark image. */
export function BrandLogo({ className = '', alt = 'DELVE' }: Props) {
  return <img src={delveLogo} alt={alt} className={`delve-brand-logo ${className}`.trim()} decoding="async" />
}

export interface MediaPreviewProps {
  previewUrl?: string | null
  deliveryUrl?: string | null
  alt?: string
  size?: number
}

export default function MediaPreview({
  previewUrl,
  deliveryUrl,
  alt = '',
  size = 72,
}: MediaPreviewProps) {
  const src = deliveryUrl || previewUrl
  return (
    <div
      className="rounded-full overflow-hidden flex-shrink-0"
      style={{
        width: size,
        height: size,
        background: 'var(--surface-subtle)',
        border: '1px solid var(--border)',
      }}
    >
      {src ? (
        <img
          src={src}
          alt={alt}
          width={size}
          height={size}
          className="w-full h-full object-cover"
          decoding="async"
        />
      ) : (
        <div className="w-full h-full" aria-hidden />
      )}
    </div>
  )
}

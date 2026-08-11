/**
 * Shared Cloudinary delivery URL builder.
 * Do not hand-roll Cloudinary URLs in feature components.
 * Browser loads transformed assets from Cloudinary CDN — Backend V2 never streams files.
 */

export type DeliveryPreset = 'avatar' | 'card' | 'detail'

export type BuildCloudinaryUrlInput = {
  cloudName: string
  publicId: string
  version?: number | null
  resourceType?: 'image' | 'video'
  width?: number
  height?: number
  crop?: 'fill' | 'limit' | 'fit' | 'thumb'
  gravity?: 'auto' | 'face' | 'center'
}

const PRESET_WIDTHS: Record<DeliveryPreset, number[]> = {
  avatar: [48, 96, 192],
  card: [480, 768, 1200],
  detail: [800, 1200, 1600],
}

export function buildCloudinaryUrl(input: BuildCloudinaryUrlInput): string {
  const transforms = ['f_auto', 'q_auto']
  if (input.width) transforms.push(`w_${input.width}`)
  if (input.height) transforms.push(`h_${input.height}`)
  if (input.crop) transforms.push(`c_${input.crop}`)
  if (input.gravity) transforms.push(`g_${input.gravity}`)
  const version = input.version ? `/v${input.version}` : ''
  const resource = input.resourceType === 'video' ? 'video' : 'image'
  return `https://res.cloudinary.com/${input.cloudName}/${resource}/upload/${transforms.join(',')}${version}/${input.publicId}`
}

export function buildResponsiveDelivery(input: {
  cloudName: string
  publicId: string
  version?: number | null
  resourceType?: 'image' | 'video'
  preset: DeliveryPreset
}) {
  const widths = PRESET_WIDTHS[input.preset]
  const crop = input.preset === 'avatar' ? 'fill' : 'limit'
  const gravity = input.preset === 'avatar' ? 'auto' : undefined
  const srcSet = widths
    .map(
      w =>
        `${buildCloudinaryUrl({
          cloudName: input.cloudName,
          publicId: input.publicId,
          version: input.version,
          resourceType: input.resourceType,
          width: w,
          crop,
          gravity,
        })} ${w}w`,
    )
    .join(', ')
  const url = buildCloudinaryUrl({
    cloudName: input.cloudName,
    publicId: input.publicId,
    version: input.version,
    resourceType: input.resourceType,
    width: widths[Math.min(1, widths.length - 1)],
    crop,
    gravity,
  })
  return {
    url,
    srcSet,
    sizes:
      input.preset === 'avatar'
        ? '48px'
        : input.preset === 'card'
          ? '(max-width: 768px) 100vw, 768px'
          : '(max-width: 1200px) 100vw, 1200px',
    widths,
  }
}

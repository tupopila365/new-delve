import JourneyCoverMedia from './JourneyCoverMedia'

type StopMediaItem = {
  url: string
  resourceType?: 'image' | 'video' | string | null
}

export default function JourneyStopMediaGallery({
  mediaUrls,
  mediaResourceTypes = [],
}: {
  mediaUrls: string[]
  mediaResourceTypes?: Array<'image' | 'video' | string | null | undefined>
}) {
  const items: StopMediaItem[] = mediaUrls.filter(Boolean).map((url, i) => {
    const t = mediaResourceTypes[i]
    const resourceType =
      t === 'video' || t === 'image'
        ? t
        : /\.(mp4|webm|mov)(\?|$)/i.test(url) || /\/video\/upload\//i.test(url)
          ? 'video'
          : 'image'
    return { url, resourceType }
  })

  if (!items.length) return null

  const [hero, ...rest] = items

  return (
    <div className="space-y-2">
      <div className="relative w-full overflow-hidden" style={{ maxHeight: 280, background: '#000' }}>
        <JourneyCoverMedia
          url={hero.url}
          resourceType={hero.resourceType}
          className="w-full object-cover"
          variant="inline"
        />
      </div>
      {rest.length > 0 && (
        <div className="grid grid-cols-3 gap-1.5 px-3 pb-3">
          {rest.map((item, i) => (
            <div
              key={`${item.url}-${i}`}
              className="relative aspect-square rounded-lg overflow-hidden"
              style={{ background: 'var(--surface-subtle)' }}
            >
              <JourneyCoverMedia
                url={item.url}
                resourceType={item.resourceType}
                className="w-full h-full object-cover"
                variant="card"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

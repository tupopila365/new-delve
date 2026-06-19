import { mediaUrl } from '../../api/client'
import { guidePackageDetailPath } from '../booking/bookingUtils'
import type { VenueStoryChannel, VenueStorySlide } from '../food/stories/types'
import {
  guideDisplayName,
  guideRegionLine,
  type GuideProfile,
  type PortfolioItem,
} from '../../utils/guideListing'
import type { TourPackage } from './types'

function imgSrc(path: string): string {
  return mediaUrl(path) || path
}

function pickCover(guide: GuideProfile, portfolio: PortfolioItem[], packages: TourPackage[]): string {
  const fromGuide = guide.photo ? imgSrc(guide.photo) : ''
  if (fromGuide) return fromGuide
  for (const item of portfolio) {
    const src = imgSrc(item.src)
    if (src) return src
  }
  for (const pkg of packages) {
    if (pkg.photo) {
      const src = imgSrc(pkg.photo)
      if (src) return src
    }
    for (const photo of pkg.photos ?? []) {
      const src = imgSrc(photo)
      if (src) return src
    }
  }
  return ''
}

function packagePhotoUrls(pkg: TourPackage): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  const add = (raw: string | null | undefined) => {
    if (!raw) return
    const src = imgSrc(raw)
    if (!src || seen.has(src)) return
    seen.add(src)
    out.push(src)
  }
  add(pkg.photo)
  for (const photo of pkg.photos ?? []) add(photo)
  return out
}

function shortLabel(title: string, max = 16): string {
  const t = title.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

export function buildGuideStoryChannels(
  guide: GuideProfile,
  options: {
    guideId: string
    guidePath?: string
    portfolio?: PortfolioItem[]
    packages?: TourPackage[]
  },
): VenueStoryChannel[] {
  const guidePath = options.guidePath ?? `/guides/${options.guideId}`
  const portfolio = options.portfolio ?? []
  const packages = options.packages ?? []
  const cover = pickCover(guide, portfolio, packages)
  const name = guideDisplayName(guide)
  const region = guideRegionLine(guide)
  const channels: VenueStoryChannel[] = []

  const introSlides: VenueStorySlide[] = []
  if (cover && (guide.headline || guide.bio?.trim())) {
    introSlides.push({
      id: `${guide.id}-intro`,
      kind: 'image',
      src: cover,
      headline: guide.headline,
      sub: guide.bio?.trim() || region,
      ctaPath: guidePath,
      ctaLabel: 'View guide',
    })
  }
  if (cover) {
    introSlides.push({
      id: `${guide.id}-host`,
      kind: 'image',
      src: cover,
      headline: `With ${name}`,
      sub: [`@${guide.username}`, region, guide.languages?.slice(0, 2).join(', ')].filter(Boolean).join(' · '),
      ctaPath: guidePath,
      ctaLabel: 'View guide',
    })
  }
  if (introSlides.length > 0) {
    channels.push({
      id: 'the-guide',
      label: 'The guide',
      coverSrc: cover,
      slides: introSlides,
    })
  }

  const portfolioSlides: VenueStorySlide[] = portfolio.flatMap((item, i) => {
    const src = imgSrc(item.src)
    if (!src) return []
    return [
      {
        id: `portfolio-${i}`,
        kind: 'image' as const,
        src,
        headline: item.caption?.trim() || 'On the trail',
        sub: name,
        ctaPath: guidePath,
        ctaLabel: 'View guide',
      },
    ]
  })

  if (portfolioSlides.length > 0) {
    channels.push({
      id: 'portfolio',
      label: 'Portfolio',
      coverSrc: portfolioSlides[0].src,
      slides: portfolioSlides,
    })
  }

  for (const pkg of packages.slice(0, 6)) {
    const urls = packagePhotoUrls(pkg)
    if (urls.length === 0) continue

    const packagePath = guidePackageDetailPath(options.guideId, pkg.id)
    const hoursLabel = `${pkg.hours} ${pkg.hours === 1 ? 'hour' : 'hours'}`
    const meta = [`$${pkg.price}`, hoursLabel].join(' · ')

    const slides: VenueStorySlide[] = urls.map((src, i) => ({
      id: `${pkg.id}-slide-${i}`,
      kind: 'image',
      src,
      headline: pkg.title,
      sub:
        i === 0
          ? [meta, pkg.description?.trim()].filter(Boolean).join(' — ')
          : pkg.description?.trim() || meta,
      ctaPath: packagePath,
      ctaLabel: 'View experience',
    }))

    channels.push({
      id: `pkg-${pkg.id}`,
      label: shortLabel(pkg.title),
      coverSrc: urls[0],
      slides,
    })
  }

  return channels
}

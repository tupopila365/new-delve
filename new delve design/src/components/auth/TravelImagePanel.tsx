import type { ReactNode } from 'react'
import { MapPin, Quote } from 'lucide-react'
import DelveLogo from './DelveLogo'
import heroDunes from '../../assets/auth/auth-hero-dunes.jpg'
import heroCoast from '../../assets/auth/auth-hero-coast.png'

export type TravelImageKey = 'dunes' | 'coast'

export const travelImages: Record<TravelImageKey, { src: string; alt: string; place: string }> = {
  dunes: {
    src: heroDunes,
    alt: 'Aerial view of a gravel road winding between sunlit desert dunes at golden hour',
    place: 'Sossusvlei, Namibia',
  },
  coast: {
    src: heroCoast,
    alt: 'Coastal road at dusk with sea fog rolling over dark dunes and a distant lighthouse',
    place: 'Skeleton Coast, Namibia',
  },
}

export interface TravelImagePanelProps {
  image?: TravelImageKey
  /** Overlay strength — 'strong' keeps text legible on busy photography. */
  overlay?: 'soft' | 'strong'
  headline?: string
  supporting?: string
  showLogo?: boolean
  showWordmark?: boolean
  showCaption?: boolean
  children?: ReactNode
  minHeight?: number | string
  rounded?: boolean
}

export default function TravelImagePanel({
  image = 'dunes',
  overlay = 'strong',
  headline = 'Every good trip starts with a first step.',
  supporting = 'Delve connects travelers with the deals, rides, stays and people that make a journey worth telling.',
  showLogo = true,
  showWordmark = true,
  showCaption = true,
  children,
  minHeight = '100%',
  rounded = false,
}: TravelImagePanelProps) {
  const source = travelImages[image]

  return (
    <div
      className="relative overflow-hidden h-full w-full"
      style={{ minHeight, borderRadius: rounded ? 20 : 0, background: '#1A1024' }}
    >
      <img
        src={source.src}
        alt={source.alt}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ filter: 'saturate(1.02)' }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            overlay === 'strong'
              ? 'linear-gradient(165deg, rgba(95,47,201,0.78) 0%, rgba(26,16,36,0.55) 45%, rgba(12,10,9,0.88) 100%)'
              : 'linear-gradient(165deg, rgba(140,82,255,0.45) 0%, rgba(12,10,9,0.65) 100%)',
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{ background: 'radial-gradient(120% 80% at 15% 10%, rgba(199,172,255,0.28), transparent 60%)' }}
      />

      <div className="relative h-full flex flex-col justify-between p-8 xl:p-10" style={{ color: '#FFFAF2' }}>
        <div className="flex items-center justify-between gap-4">
          {showLogo && <DelveLogo tone="onImage" size="md" showWordmark={showWordmark} />}
          {showCaption && (
            <span
              className="inline-flex items-center gap-1.5 text-xs font-medium rounded-full px-3 py-1.5"
              style={{ background: 'rgba(255,250,242,0.16)', backdropFilter: 'blur(6px)' }}
            >
              <MapPin size={12} />
              {source.place}
            </span>
          )}
        </div>

        <div className="max-w-[26rem]">
          <Quote size={22} style={{ color: '#C7ACFF', marginBottom: 12 }} aria-hidden="true" />
          <p className="font-display font-bold leading-tight" style={{ fontSize: 30, letterSpacing: '-0.01em' }}>
            {headline}
          </p>
          <p className="text-sm mt-3" style={{ color: 'rgba(255,250,242,0.82)', lineHeight: 1.6 }}>
            {supporting}
          </p>
          {children && <div className="mt-6">{children}</div>}
        </div>
      </div>
    </div>
  )
}

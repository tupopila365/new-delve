import { MapPin } from 'lucide-react'
import type { ExploreRegionSource } from '../../hooks/useExploreRegion'
import './HomeRegionPicker.css'

type Props = {
  region: string
  source: ExploreRegionSource
  canPick: boolean
  regions: readonly string[]
  onSelect: (region: string) => void
  onClear: () => void
}

export function HomeRegionPicker({ region, source, canPick, regions, onSelect, onClear }: Props) {
  if (!canPick && !region) return null

  if (!canPick) {
    return (
      <p className="home-region home-region--locked" aria-label={`Exploring ${region}`}>
        <MapPin size={14} strokeWidth={2.25} aria-hidden />
        <span>
          Exploring <strong>{region}</strong>
          {source === 'profile' ? ' · from your profile' : null}
        </span>
      </p>
    )
  }

  return (
    <div className="home-region">
      <p className="home-region__label" id="home-region-label">
        <MapPin size={14} strokeWidth={2.25} aria-hidden />
        Exploring
      </p>
      <div className="home-region__chips" role="group" aria-labelledby="home-region-label">
        <button
          type="button"
          className={`home-region__chip${!region ? ' home-region__chip--active' : ''}`}
          aria-pressed={!region}
          onClick={onClear}
        >
          Nationwide
        </button>
        {regions.map((name) => {
          const active = region === name
          return (
            <button
              key={name}
              type="button"
              className={`home-region__chip${active ? ' home-region__chip--active' : ''}`}
              aria-pressed={active}
              onClick={() => onSelect(name)}
            >
              {name}
            </button>
          )
        })}
      </div>
    </div>
  )
}

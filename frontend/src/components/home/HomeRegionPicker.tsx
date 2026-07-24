import { MapPin } from 'lucide-react'
import type { ExploreRegionSource } from '../../hooks/useExploreRegion'
import './HomeRegionPicker.css'

type Props = {
  region: string
  source: ExploreRegionSource
  canPick: boolean
  regions: readonly string[]
  /** Country label for “All in {country}” chip. */
  countryLabel?: string
  onSelect: (region: string) => void
  onClear: () => void
}

export function HomeRegionPicker({
  region,
  canPick,
  regions,
  countryLabel = 'this country',
  onSelect,
  onClear,
}: Props) {
  if (!canPick && !region) return null
  if (regions.length === 0) return null

  return (
    <div className="home-region">
      <p className="home-region__label" id="home-region-label">
        <MapPin size={14} strokeWidth={2.25} aria-hidden />
        Region in {countryLabel}
      </p>
      <div className="home-region__chips" role="group" aria-labelledby="home-region-label">
        <button
          type="button"
          className={`home-region__chip${!region ? ' home-region__chip--active' : ''}`}
          aria-pressed={!region}
          onClick={onClear}
        >
          All of {countryLabel}
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

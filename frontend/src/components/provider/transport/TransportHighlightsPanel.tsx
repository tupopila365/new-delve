import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { apiFetch } from '../../../api/client'
import { friendlyApiMessage } from '../../../utils/friendlyError'
import { HighlightChannelEditor } from '../../highlights/HighlightChannelEditor'
import {
  ensureHighlightChannelsMediaUrls,
  normalizeHighlightsForSave,
  type HighlightChannelInput,
} from '../../highlights'
import type { ProviderBusTripListing } from './busTripListingTypes'
import type { ProviderVehicleListing } from './vehicleListingTypes'

type Kind = 'vehicle' | 'bus'

type Props = {
  vehicles: ProviderVehicleListing[]
  busTrips: ProviderBusTripListing[]
  canManage?: boolean
  showVehicles?: boolean
  showBuses?: boolean
  initialKind?: Kind
  initialId?: number | null
}

function channelsFrom(raw: HighlightChannelInput[] | undefined | null): HighlightChannelInput[] {
  return (raw ?? []).map((ch) => ({
    id: ch.id,
    label: ch.label,
    coverSrc: ch.coverSrc,
    slides: (ch.slides ?? []).map((s) => ({ ...s })),
  }))
}

function busLabel(trip: ProviderBusTripListing): string {
  const r = trip.route_detail
  return `${r.origin} → ${r.destination} · ${new Date(trip.departs_at).toLocaleDateString()}`
}

export function TransportHighlightsPanel({
  vehicles,
  busTrips,
  canManage = true,
  showVehicles = true,
  showBuses = true,
  initialKind,
  initialId = null,
}: Props) {
  const qc = useQueryClient()
  const availableKinds = useMemo(() => {
    const kinds: Kind[] = []
    if (showVehicles && vehicles.length > 0) kinds.push('vehicle')
    if (showBuses && busTrips.length > 0) kinds.push('bus')
    return kinds
  }, [showVehicles, showBuses, vehicles.length, busTrips.length])

  const defaultKind: Kind | null =
    initialKind && availableKinds.includes(initialKind)
      ? initialKind
      : availableKinds[0] ?? null

  const [kind, setKind] = useState<Kind | null>(defaultKind)
  const [selectedId, setSelectedId] = useState<number | null>(() => {
    if (initialId && defaultKind === 'vehicle' && vehicles.some((v) => v.id === initialId)) return initialId
    if (initialId && defaultKind === 'bus' && busTrips.some((t) => t.id === initialId)) return initialId
    if (defaultKind === 'vehicle') return vehicles[0]?.id ?? null
    if (defaultKind === 'bus') return busTrips[0]?.id ?? null
    return null
  })
  const [channels, setChannels] = useState<HighlightChannelInput[]>([])
  const [error, setError] = useState('')
  const [savedFlash, setSavedFlash] = useState('')

  const selectedVehicle = useMemo(
    () => (kind === 'vehicle' ? vehicles.find((v) => v.id === selectedId) ?? null : null),
    [kind, vehicles, selectedId],
  )
  const selectedBus = useMemo(
    () => (kind === 'bus' ? busTrips.find((t) => t.id === selectedId) ?? null : null),
    [kind, busTrips, selectedId],
  )

  useEffect(() => {
    if (initialKind && availableKinds.includes(initialKind)) setKind(initialKind)
    if (initialId != null) setSelectedId(initialId)
  }, [initialKind, initialId, availableKinds])

  useEffect(() => {
    if (kind === 'vehicle') {
      setChannels(channelsFrom(selectedVehicle?.listing_stories))
    } else if (kind === 'bus') {
      setChannels(channelsFrom(selectedBus?.route_detail?.listing_stories))
    } else {
      setChannels([])
    }
    setError('')
  }, [kind, selectedVehicle, selectedBus])

  const saveMut = useMutation({
    mutationFn: async () => {
      const listing_stories = await ensureHighlightChannelsMediaUrls(
        normalizeHighlightsForSave(channels),
      )
      if (kind === 'vehicle' && selectedVehicle) {
        return apiFetch<ProviderVehicleListing>(`/api/transport/provider-vehicles/${selectedVehicle.id}/`, {
          method: 'PATCH',
          body: JSON.stringify({ listing_stories }),
        })
      }
      if (kind === 'bus' && selectedBus) {
        return apiFetch<ProviderBusTripListing>(`/api/transport/provider-bus-trips/${selectedBus.id}/`, {
          method: 'PATCH',
          body: JSON.stringify({
            route_detail: {
              ...selectedBus.route_detail,
              listing_stories,
            },
          }),
        })
      }
      throw new Error('Select a vehicle or route first.')
    },
    onSuccess: async (saved) => {
      setError('')
      if (kind === 'vehicle' && saved && 'listing_stories' in saved) {
        setChannels(channelsFrom((saved as ProviderVehicleListing).listing_stories))
      }
      if (kind === 'bus' && saved && 'route_detail' in saved) {
        setChannels(channelsFrom((saved as ProviderBusTripListing).route_detail?.listing_stories))
      }
      setSavedFlash('Highlights saved')
      window.setTimeout(() => setSavedFlash(''), 2200)
      await qc.invalidateQueries({ queryKey: ['provider-vehicles'] })
      await qc.invalidateQueries({ queryKey: ['provider-bus-trips'] })
      await qc.invalidateQueries({ queryKey: ['veh'] })
      await qc.invalidateQueries({ queryKey: ['trip'] })
      await qc.invalidateQueries({ queryKey: ['bus'] })
      await qc.invalidateQueries({ queryKey: ['transport'] })
    },
    onError: (e) => setError(friendlyApiMessage(e, 'Could not save highlights.')),
  })

  if (availableKinds.length === 0) {
    return (
      <div className="stay-stories">
        <header className="stay-stories__head">
          <div>
            <h2 className="stay-stories__title">Highlights</h2>
            <p className="stay-stories__sub">
              Organize photos and videos travellers see on vehicle and route detail pages.
            </p>
          </div>
        </header>
        <div className="stay-stories__empty">
          <strong>Add a listing first</strong>
          <p>Create a vehicle or bus trip, then come back to manage highlights.</p>
        </div>
      </div>
    )
  }

  const options =
    kind === 'vehicle'
      ? vehicles.map((v) => ({
          id: v.id,
          label: `${v.title}${(v.listing_stories?.length ?? 0) > 0 ? ` · ${v.listing_stories!.length} ring(s)` : ' · no highlights'}`,
        }))
      : busTrips.map((t) => ({
          id: t.id,
          label: `${busLabel(t)}${(t.route_detail.listing_stories?.length ?? 0) > 0 ? ` · ${t.route_detail.listing_stories!.length} ring(s)` : ' · no highlights'}`,
        }))

  const publicHref =
    kind === 'vehicle' && selectedVehicle
      ? `/transport/vehicle/${selectedVehicle.id}`
      : kind === 'bus' && selectedBus
        ? `/transport/bus/${selectedBus.id}`
        : null

  return (
    <div className="stay-stories">
      <header className="stay-stories__head">
        <div>
          <h2 className="stay-stories__title">Highlights</h2>
          <p className="stay-stories__sub">
            Organize photos and videos travellers can tap through — not social posts.
          </p>
        </div>
        {canManage && (selectedVehicle || selectedBus) ? (
          <button
            type="button"
            className="prov-ui__btn prov-ui__btn--primary"
            disabled={saveMut.isPending}
            onClick={() => saveMut.mutate()}
          >
            {saveMut.isPending ? 'Saving…' : 'Save highlights'}
          </button>
        ) : null}
      </header>

      <div className="stay-stories__listing-picks">
        {availableKinds.length > 1 ? (
          <>
            <p className="stay-stories__label">Type</p>
            <div className="stay-stories__pick-row" style={{ marginBottom: 12 }}>
              {availableKinds.map((k) => (
                <button
                  key={k}
                  type="button"
                  className={`stay-stories__pick${kind === k ? ' is-active' : ''}`}
                  onClick={() => {
                    setKind(k)
                    setSelectedId(k === 'vehicle' ? vehicles[0]?.id ?? null : busTrips[0]?.id ?? null)
                  }}
                >
                  {k === 'vehicle' ? 'Vehicles' : 'Bus routes'}
                </button>
              ))}
            </div>
          </>
        ) : null}

        <label className="stay-stories__label" htmlFor="transport-highlights-listing">
          {kind === 'bus' ? 'Trip' : 'Vehicle'}
        </label>
        <select
          id="transport-highlights-listing"
          className="stay-stories__select"
          value={selectedId ?? ''}
          onChange={(e) => {
            const next = Number(e.target.value)
            setSelectedId(Number.isFinite(next) ? next : null)
          }}
        >
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
        {publicHref ? (
          <p className="stay-stories__pick-meta">
            Public page: <Link to={publicHref}>View listing</Link>
          </p>
        ) : null}
      </div>

      {error ? (
        <p className="stay-stories__error" role="alert">
          {error}
        </p>
      ) : null}
      {savedFlash ? (
        <p className="stay-stories__saved" role="status">
          {savedFlash}
        </p>
      ) : null}

      {canManage && (selectedVehicle || selectedBus) ? (
        <HighlightChannelEditor
          channels={channels}
          onChange={setChannels}
          hint={
            kind === 'bus'
              ? 'Highlight rings on this route — coach, scenery, boarding tips. Organize media travellers can tap through.'
              : 'Highlight rings on this vehicle — exterior, interior, features. Organize media travellers can tap through.'
          }
          emptyCopy="No custom highlights yet. Auto-generated rings still use your cover and gallery photos."
        />
      ) : null}

      {canManage && channels.length === 0 ? (
        <p className="stay-stories__hint">
          <Plus size={14} aria-hidden /> Tip: create a ring like “Interior” or “Along the way”, then add slides.
        </p>
      ) : null}
    </div>
  )
}

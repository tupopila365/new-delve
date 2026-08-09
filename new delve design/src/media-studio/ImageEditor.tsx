import { useMemo, useState } from 'react'
import { Contrast, Droplets, RotateCcw, Sun, ThermometerSun } from 'lucide-react'
import { DEFAULT_ADJUSTMENTS, IMAGE_FILTERS } from './config'
import { cssFilterFromAdjustments } from './format'
import type { Adjustments, FilterOption, ImageEditState } from './types'
import { StudioChromeHeader } from './Publish'

const ASPECTS = [
  { label: 'Free', ratio: '' },
  { label: '1:1', ratio: '1 / 1' },
  { label: '4:5', ratio: '4 / 5' },
  { label: '9:16', ratio: '9 / 16' },
  { label: '16:9', ratio: '16 / 9' },
]

/** Existing image editor — preserved and used when media type is image. */
export function ImageEditor({
  src,
  onBack,
  onNext,
}: {
  src: string
  onBack: () => void
  onNext: (edit: ImageEditState) => void
}) {
  const [filter, setFilter] = useState<FilterOption>(IMAGE_FILTERS[0])
  const [aspect, setAspect] = useState('4 / 5')
  const [adj, setAdj] = useState<Adjustments>({ ...DEFAULT_ADJUSTMENTS })
  const [panel, setPanel] = useState<'crop' | 'filter' | 'adjust'>('filter')
  const [altText, setAltText] = useState('')
  const [rotation, setRotation] = useState<0 | 90 | 180 | 270>(0)

  const computedFilter = useMemo(() => cssFilterFromAdjustments(filter.css, adj), [filter, adj])

  return (
    <div className="flex flex-col h-full min-h-0" style={{ background: 'var(--bg)' }}>
      <StudioChromeHeader
        title="Edit photo"
        onBack={onBack}
        primaryLabel="Next"
        onPrimary={() => onNext({
          aspectRatio: aspect,
          filter,
          adjustments: adj,
          altText,
          caption: '',
          location: '',
          rotation,
        })}
      />
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
        <div className="flex-1 min-h-0 flex items-center justify-center p-3" style={{ background: '#0C0A09' }}>
          <div className="w-full max-w-md overflow-hidden rounded-xl bg-black" style={{ aspectRatio: aspect || '4 / 5' }}>
            <img
              src={src}
              alt={altText || 'Selected photo'}
              className="h-full w-full object-cover"
              style={{ filter: computedFilter, transform: `rotate(${rotation}deg)` }}
            />
          </div>
        </div>
        <div className="lg:w-[320px] shrink-0 overflow-y-auto p-3" style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)' }}>
          <div className="flex gap-1 mb-3">
            {(['crop', 'filter', 'adjust'] as const).map(p => (
              <button key={p} type="button" onClick={() => setPanel(p)} className="flex-1 min-h-[40px] rounded-xl text-xs font-semibold capitalize"
                style={{ background: panel === p ? 'var(--primary)' : 'var(--surface-subtle)', color: panel === p ? '#fff' : 'var(--fg)' }}>{p}</button>
            ))}
          </div>
          {panel === 'crop' && (
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap gap-1.5">
                {ASPECTS.map(a => (
                  <button key={a.label} type="button" onClick={() => setAspect(a.ratio)} className="min-h-[40px] px-2.5 rounded-full text-xs font-semibold"
                    style={{ background: aspect === a.ratio ? 'var(--primary)' : 'var(--surface-subtle)', color: aspect === a.ratio ? '#fff' : 'var(--fg)', border: '1px solid var(--border)' }}>{a.label}</button>
                ))}
              </div>
              <button type="button" className="min-h-[44px] rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-1" style={{ border: '1px solid var(--border)' }}
                onClick={() => setRotation(r => ((r + 90) % 360) as 0 | 90 | 180 | 270)}>
                <RotateCcw size={14} /> Rotate 90°
              </button>
              <label className="text-xs flex flex-col gap-1">Alternative text
                <input value={altText} onChange={e => setAltText(e.target.value)} className="rounded-lg px-3 py-2.5 min-h-[44px]" style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' }} />
              </label>
            </div>
          )}
          {panel === 'filter' && (
            <div className="flex gap-2 overflow-x-auto scroll-rail">
              {IMAGE_FILTERS.map(f => (
                <button key={f.id} type="button" onClick={() => setFilter(f)} className="shrink-0 w-16 text-center">
                  <div className="h-16 w-16 rounded-xl mb-1 overflow-hidden" style={{ border: filter.id === f.id ? '2px solid var(--primary)' : '1px solid var(--border)' }}>
                    <img src={src} alt="" className="h-full w-full object-cover" style={{ filter: f.css || 'none' }} />
                  </div>
                  <span className="text-[10px]">{f.name}</span>
                </button>
              ))}
            </div>
          )}
          {panel === 'adjust' && (
            <div className="flex flex-col gap-3">
              {([
                { key: 'brightness' as const, Icon: Sun },
                { key: 'contrast' as const, Icon: Contrast },
                { key: 'saturation' as const, Icon: Droplets },
                { key: 'warmth' as const, Icon: ThermometerSun },
              ]).map(({ key, Icon }) => (
                <label key={key} className="text-xs flex flex-col gap-1 capitalize">
                  <span className="inline-flex items-center gap-1"><Icon size={14} /> {key}</span>
                  <input type="range" min={-50} max={50} value={adj[key]} onChange={e => setAdj(a => ({ ...a, [key]: Number(e.target.value) }))} style={{ accentColor: 'var(--primary)' }} />
                </label>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

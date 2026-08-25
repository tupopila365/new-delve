import { useEffect } from 'react'
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from 'lucide-react'
import type { CatalogMedia } from '../../data/marketingDealsCatalog'

export default function DealMediaLightbox({
  items,
  index,
  zoom,
  onClose,
  onIndex,
  onZoom,
}: {
  items: CatalogMedia[]
  index: number
  zoom: number
  onClose: () => void
  onIndex: (next: number) => void
  onZoom: (next: number) => void
}) {
  const item = items[index]
  const count = items.length

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') onIndex((index - 1 + count) % count)
      if (e.key === 'ArrowRight') onIndex((index + 1) % count)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [count, index, onClose, onIndex])

  if (!item) return null

  return (
    <div
      className="fixed inset-0 z-[80] flex flex-col"
      style={{ background: 'rgba(0,0,0,0.92)' }}
      role="dialog"
      aria-modal="true"
      aria-label="Deal media"
    >
      <div className="flex items-center justify-between px-3 py-3">
        <p className="text-xs m-0" style={{ color: '#fff' }}>
          {index + 1} / {count}
        </p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Zoom out"
            onClick={() => onZoom(Math.max(0.5, Number((zoom - 0.25).toFixed(2))))}
            className="p-2 rounded-full"
            style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', border: 'none', cursor: 'pointer' }}
          >
            <ZoomOut size={18} />
          </button>
          <span className="text-xs tabular-nums w-10 text-center" style={{ color: '#fff' }}>
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            aria-label="Zoom in"
            onClick={() => onZoom(Math.min(3, Number((zoom + 0.25).toFixed(2))))}
            className="p-2 rounded-full"
            style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', border: 'none', cursor: 'pointer' }}
          >
            <ZoomIn size={18} />
          </button>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="p-2 rounded-full ml-1"
            style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', border: 'none', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="flex-1 relative overflow-auto flex items-center justify-center px-2">
        {item.type === 'video' ? (
          <video
            key={item.url}
            src={item.url}
            className="max-w-full max-h-[78vh]"
            style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
            controls
            playsInline
            autoPlay
          />
        ) : (
          <img
            src={item.url}
            alt={item.alt}
            className="max-w-full max-h-[78vh] object-contain"
            style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
          />
        )}

        {count > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous"
              onClick={() => onIndex((index - 1 + count) % count)}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.14)', color: '#fff', border: 'none', cursor: 'pointer' }}
            >
              <ChevronLeft size={20} />
            </button>
            <button
              type="button"
              aria-label="Next"
              onClick={() => onIndex((index + 1) % count)}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.14)', color: '#fff', border: 'none', cursor: 'pointer' }}
            >
              <ChevronRight size={20} />
            </button>
          </>
        )}
      </div>
    </div>
  )
}

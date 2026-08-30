import React, { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut, RotateCcw, Trash2, Loader2 } from 'lucide-react'

export interface LightboxMediaItem {
  id?: string
  url: string
  type: 'image' | 'video' | string
  alt?: string
  canDelete?: boolean
}

interface MediaLightboxProps {
  items: LightboxMediaItem[]
  initialIndex?: number
  onClose: () => void
  onDelete?: (mediaId: string) => Promise<void>
}

export default function MediaLightbox({
  items,
  initialIndex = 0,
  onClose,
  onDelete,
}: MediaLightboxProps) {
  const [index, setIndex] = useState(initialIndex)
  const [zoom, setZoom] = useState(1)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const count = items.length
  const currentItem = items[index]

  // Keyboard controls
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') {
        setIndex(prev => (prev - 1 + count) % count)
        setZoom(1)
      }
      if (e.key === 'ArrowRight') {
        setIndex(prev => (prev + 1) % count)
        setZoom(1)
      }
      if (e.key === '+' || e.key === '=') {
        setZoom(z => Math.min(3, Number((z + 0.25).toFixed(2))))
      }
      if (e.key === '-' || e.key === '_') {
        setZoom(z => Math.max(0.5, Number((z - 0.25).toFixed(2))))
      }
      if (e.key === '0') {
        setZoom(1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [count, onClose])

  if (!currentItem || count === 0) return null

  const isVideo = currentItem.type === 'video' || /\.(mp4|webm|mov|mkv)$/i.test(currentItem.url)

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col bg-black/95 backdrop-blur-md select-none animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label="Media preview"
      onClick={e => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      {/* Header Controls Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/80 to-transparent z-10">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/10 text-white/90 tabular-nums">
            {index + 1} / {count}
          </span>
          {currentItem.alt && (
            <span className="text-xs text-neutral-300 truncate max-w-[200px] sm:max-w-md hidden sm:inline">
              {currentItem.alt}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {/* Zoom controls (available for both images and video) */}
          <button
            type="button"
            aria-label="Zoom out"
            onClick={() => setZoom(z => Math.max(0.5, Number((z - 0.25).toFixed(2))))}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white transition-all border border-white/5"
            title="Zoom out (-)"
          >
            <ZoomOut size={18} />
          </button>

          <button
            type="button"
            aria-label="Reset zoom"
            onClick={() => setZoom(1)}
            className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold tabular-nums text-white transition-all min-w-[52px] text-center border border-white/5"
            title="Reset zoom (0)"
          >
            {Math.round(zoom * 100)}%
          </button>

          <button
            type="button"
            aria-label="Zoom in"
            onClick={() => setZoom(z => Math.min(3, Number((z + 0.25).toFixed(2))))}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white transition-all border border-white/5"
            title="Zoom in (+)"
          >
            <ZoomIn size={18} />
          </button>

          {zoom !== 1 && (
            <button
              type="button"
              aria-label="Reset scale"
              onClick={() => setZoom(1)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white transition-all border border-white/5"
              title="Reset view"
            >
              <RotateCcw size={16} />
            </button>
          )}

          {/* Delete media action if authorized */}
          {onDelete && currentItem.id && (currentItem.canDelete ?? true) && (
            confirmDelete ? (
              <div className="flex items-center gap-1 bg-red-950/80 border border-red-500/40 rounded-xl px-2 py-1">
                <span className="text-xs text-red-300 font-medium">Delete?</span>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={async () => {
                    setDeleting(true)
                    try {
                      await onDelete(currentItem.id!)
                      onClose()
                    } catch {
                      setDeleting(false)
                      setConfirmDelete(false)
                    }
                  }}
                  className="px-2 py-0.5 rounded-lg bg-red-600 hover:bg-red-500 text-xs font-semibold text-white transition-all"
                >
                  {deleting ? <Loader2 size={12} className="animate-spin" /> : 'Yes'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="px-1.5 py-0.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs text-neutral-300 transition-all"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                aria-label="Delete media"
                onClick={() => setConfirmDelete(true)}
                className="p-2 rounded-xl bg-white/10 hover:bg-red-600/30 hover:border-red-500/40 active:scale-95 text-red-400 transition-all border border-white/5"
                title="Delete media"
              >
                <Trash2 size={17} />
              </button>
            )
          )}

          {/* Close button */}
          <button
            type="button"
            aria-label="Close preview"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-red-500/30 hover:border-red-500/50 active:scale-95 text-white transition-all border border-white/5 ml-1"
            title="Close (Esc)"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Main Interactive Stage */}
      <div
        className="flex-1 relative overflow-hidden flex items-center justify-center p-2 sm:p-4"
        onWheel={e => {
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            const delta = e.deltaY < 0 ? 0.2 : -0.2
            setZoom(z => Math.min(3, Math.max(0.5, Number((z + delta).toFixed(2)))))
          }
        }}
      >
        <div
          className="transition-transform duration-150 ease-out flex items-center justify-center max-w-full max-h-full"
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'center center',
            cursor: zoom > 1 ? 'grab' : 'default',
          }}
        >
          {isVideo ? (
            <video
              key={currentItem.url}
              src={currentItem.url}
              className="max-w-full max-h-[82vh] rounded-xl shadow-2xl object-contain"
              controls
              playsInline
              autoPlay
            />
          ) : (
            <img
              src={currentItem.url}
              alt={currentItem.alt || 'Event media'}
              className="max-w-full max-h-[82vh] rounded-xl shadow-2xl object-contain pointer-events-auto"
              draggable={false}
            />
          )}
        </div>

        {/* Carousel Prev Button */}
        {count > 1 && (
          <button
            type="button"
            aria-label="Previous item"
            onClick={() => {
              setIndex(prev => (prev - 1 + count) % count)
              setZoom(1)
            }}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/60 hover:bg-black/90 active:scale-95 text-white flex items-center justify-center border border-white/10 shadow-xl backdrop-blur-sm transition-all"
          >
            <ChevronLeft size={22} />
          </button>
        )}

        {/* Carousel Next Button */}
        {count > 1 && (
          <button
            type="button"
            aria-label="Next item"
            onClick={() => {
              setIndex(prev => (prev + 1) % count)
              setZoom(1)
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/60 hover:bg-black/90 active:scale-95 text-white flex items-center justify-center border border-white/10 shadow-xl backdrop-blur-sm transition-all"
          >
            <ChevronRight size={22} />
          </button>
        )}
      </div>

      {/* Footer thumbnail strip (if multiple items) */}
      {count > 1 && (
        <div className="flex items-center justify-center gap-2 p-3 bg-gradient-to-t from-black/80 to-transparent overflow-x-auto z-10">
          {items.map((it, i) => (
            <button
              key={it.id || `${it.url}-${i}`}
              type="button"
              onClick={() => {
                setIndex(i)
                setZoom(1)
              }}
              className={`relative w-12 h-12 rounded-lg overflow-hidden border-2 transition-all shrink-0 ${
                i === index
                  ? 'border-indigo-500 scale-105 shadow-lg shadow-indigo-500/30 opacity-100'
                  : 'border-white/10 opacity-60 hover:opacity-90'
              }`}
            >
              {it.type === 'video' ? (
                <video src={it.url} className="w-full h-full object-cover" muted />
              ) : (
                <img src={it.url} alt="" className="w-full h-full object-cover" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

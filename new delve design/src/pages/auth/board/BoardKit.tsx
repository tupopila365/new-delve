import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'

/** Shared building blocks for the `08 Authentication` design board. */

export interface SectionIntroProps {
  index: string
  title: string
  description: string
  meta?: string
  children?: ReactNode
}

export function SectionIntro({ index, title, description, meta, children }: SectionIntroProps) {
  return (
    <header className="mb-7">
      <div className="flex items-center gap-2 mb-2">
        <span
          className="text-xs font-bold tracking-widest px-2 py-1 rounded-md"
          style={{ background: 'rgba(140,82,255,0.12)', color: 'var(--primary)' }}
        >
          {index}
        </span>
        {meta && (
          <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>
            {meta}
          </span>
        )}
      </div>
      <h2
        className="font-display font-bold"
        style={{ fontSize: 26, letterSpacing: '-0.02em', color: 'var(--fg)', margin: 0 }}
      >
        {title}
      </h2>
      <p className="text-sm mt-2" style={{ color: 'var(--fg-muted)', lineHeight: 1.65, maxWidth: 720 }}>
        {description}
      </p>
      {children}
    </header>
  )
}

export interface PreviewCardProps {
  title: string
  caption?: string
  children: ReactNode
  /** Adds inner padding — off for device frames that bleed to the edge. */
  padded?: boolean
  tag?: string
}

export function PreviewCard({ title, caption, children, padded = true, tag }: PreviewCardProps) {
  return (
    <figure
      className="rounded-2xl overflow-hidden m-0"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <figcaption
        className="flex items-start justify-between gap-3 px-4 py-3"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div className="min-w-0">
          <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>
            {title}
          </p>
          {caption && (
            <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)', lineHeight: 1.5 }}>
              {caption}
            </p>
          )}
        </div>
        {tag && (
          <span
            className="text-xs font-medium px-2 py-1 rounded-md flex-shrink-0"
            style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', color: 'var(--fg-muted)' }}
          >
            {tag}
          </span>
        )}
      </figcaption>
      <div style={{ padding: padded ? 16 : 0, background: padded ? 'var(--surface)' : 'var(--surface-subtle)' }}>
        {children}
      </div>
    </figure>
  )
}

export interface ThemeScopeProps {
  theme: 'light' | 'dark'
  children: ReactNode
  className?: string
  style?: CSSProperties
}

/** Forces a colour theme for a subtree so light and dark frames can sit together. */
export function ThemeScope({ theme, children, className, style }: ThemeScopeProps) {
  return (
    <div data-theme={theme} className={className} style={{ background: 'var(--bg)', color: 'var(--fg)', ...style }}>
      {children}
    </div>
  )
}

export interface DeviceFrameProps {
  width: number
  height: number
  children: ReactNode
  label?: string
  theme?: 'light' | 'dark'
  /** Phone frames get rounded corners and a status bar hint. */
  device?: 'desktop' | 'tablet' | 'mobile'
  maxScale?: number
}

/**
 * Renders a fixed-width viewport (1440 / 1024 / 390) scaled to fit whatever
 * column it lands in, so the board shows true proportions without media queries.
 */
export function DeviceFrame({
  width,
  height,
  children,
  label,
  theme,
  device = 'desktop',
  maxScale = 1,
}: DeviceFrameProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [scale, setScale] = useState(0.4)

  useEffect(() => {
    const element = containerRef.current
    if (!element) return
    const observer = new ResizeObserver(entries => {
      const available = entries[0].contentRect.width
      if (available > 0) setScale(Math.min(maxScale, available / width))
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [width, maxScale])

  const radius = device === 'mobile' ? 26 : 12

  const frame = (
    <div
      style={{
        width,
        height,
        overflow: 'hidden',
        background: 'var(--bg)',
        borderRadius: radius,
      }}
    >
      {children}
    </div>
  )

  return (
    <div>
      <div ref={containerRef} style={{ width: '100%' }}>
        <div style={{ height: height * scale, overflow: 'hidden' }}>
          <div className="auth-frame-scale" style={{ transform: `scale(${scale})`, width, height }}>
            {theme ? (
              <ThemeScope theme={theme} style={{ width, height, borderRadius: radius, overflow: 'hidden' }}>
                {frame}
              </ThemeScope>
            ) : (
              frame
            )}
          </div>
        </div>
      </div>
      {label && (
        <p className="text-xs mt-2 tabular-nums" style={{ color: 'var(--fg-muted)' }}>
          {label} · {width}×{height} at {Math.round(scale * 100)}%
        </p>
      )}
    </div>
  )
}

export interface SwatchProps {
  name: string
  value: string
  usage?: string
  /** Text colour used to check contrast on the swatch itself. */
  onColor?: string
}

export function Swatch({ name, value, usage, onColor = '#FFFFFF' }: SwatchProps) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
      <div
        className="flex items-end p-3"
        style={{ background: value, height: 76, color: onColor, fontSize: 12, fontWeight: 600 }}
      >
        Aa
      </div>
      <div className="p-3" style={{ background: 'var(--surface)' }}>
        <p className="text-xs font-semibold" style={{ color: 'var(--fg)' }}>
          {name}
        </p>
        <p className="text-xs tabular-nums mt-0.5" style={{ color: 'var(--fg-muted)' }}>
          {value}
        </p>
        {usage && (
          <p className="text-xs mt-1" style={{ color: 'var(--fg-muted)', lineHeight: 1.5 }}>
            {usage}
          </p>
        )}
      </div>
    </div>
  )
}

export interface ChipProps {
  children: ReactNode
  tone?: 'neutral' | 'brand' | 'success' | 'warning' | 'danger'
}

export function Chip({ children, tone = 'neutral' }: ChipProps) {
  const color =
    tone === 'brand'
      ? 'var(--primary)'
      : tone === 'success'
        ? 'var(--auth-success)'
        : tone === 'warning'
          ? 'var(--auth-warning)'
          : tone === 'danger'
            ? 'var(--auth-danger)'
            : 'var(--fg-muted)'
  return (
    <span
      className="inline-flex items-center text-xs font-medium px-2 py-1 rounded-md"
      style={{
        color,
        background: tone === 'neutral' ? 'var(--surface-subtle)' : `color-mix(in srgb, ${color} 12%, transparent)`,
        border: `1px solid ${tone === 'neutral' ? 'var(--border)' : `color-mix(in srgb, ${color} 30%, transparent)`}`,
      }}
    >
      {children}
    </span>
  )
}

export interface SpecTableProps {
  columns: string[]
  rows: ReactNode[][]
  caption?: string
}

export function SpecTable({ columns, rows, caption }: SpecTableProps) {
  return (
    <div
      className="rounded-xl overflow-x-auto"
      style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}
    >
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
        {caption && (
          <caption
            className="text-xs text-left px-4 py-2"
            style={{ color: 'var(--fg-muted)', borderBottom: '1px solid var(--border)' }}
          >
            {caption}
          </caption>
        )}
        <thead>
          <tr style={{ background: 'var(--surface-subtle)' }}>
            {columns.map(column => (
              <th
                key={column}
                className="text-xs font-semibold uppercase tracking-wider text-left px-4 py-2.5"
                style={{ color: 'var(--fg-muted)', borderBottom: '1px solid var(--border)' }}
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className="text-sm px-4 py-3 align-top"
                  style={{
                    color: cellIndex === 0 ? 'var(--fg)' : 'var(--fg-muted)',
                    fontWeight: cellIndex === 0 ? 600 : 400,
                    borderBottom: rowIndex === rows.length - 1 ? 'none' : '1px solid var(--border)',
                    lineHeight: 1.55,
                  }}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export interface BoardGridProps {
  children: ReactNode
  /** Minimum column width before wrapping. */
  min?: number
  gap?: number
}

export function BoardGrid({ children, min = 300, gap = 20 }: BoardGridProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${min}px, 1fr))`, gap }}>
      {children}
    </div>
  )
}

export interface NoteProps {
  title: string
  children: ReactNode
  tone?: 'brand' | 'warning' | 'danger' | 'neutral'
}

export function Note({ title, children, tone = 'brand' }: NoteProps) {
  const color =
    tone === 'warning'
      ? 'var(--auth-warning)'
      : tone === 'danger'
        ? 'var(--auth-danger)'
        : tone === 'neutral'
          ? 'var(--fg-muted)'
          : 'var(--primary)'
  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: `color-mix(in srgb, ${color} 7%, var(--surface))`,
        border: `1px solid color-mix(in srgb, ${color} 28%, transparent)`,
      }}
    >
      <p className="text-sm font-semibold mb-1" style={{ color: 'var(--fg)' }}>
        {title}
      </p>
      <div className="text-sm" style={{ color: 'var(--fg-muted)', lineHeight: 1.6 }}>
        {children}
      </div>
    </div>
  )
}

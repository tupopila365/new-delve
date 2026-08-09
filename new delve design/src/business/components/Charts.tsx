/** Lightweight SVG charts — avoids recharts dependency for the design prototype. */

type Point = { label: string; value: number }

export function AreaSpark({
  data,
  height = 200,
  color = '#8C52FF',
  formatY,
}: {
  data: Point[]
  height?: number
  color?: string
  formatY?: (v: number) => string
}) {
  const max = Math.max(...data.map(d => d.value), 1)
  const w = 100
  const h = 100
  const padX = 2
  const padY = 8
  const coords = data.map((d, i) => {
    const x = padX + (i / Math.max(data.length - 1, 1)) * (w - padX * 2)
    const y = h - padY - (d.value / max) * (h - padY * 2)
    return { x, y, ...d }
  })
  const line = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x},${c.y}`).join(' ')
  const area = `${line} L${coords[coords.length - 1].x},${h - padY} L${coords[0].x},${h - padY} Z`

  return (
    <div className="w-full" style={{ height }}>
      <div className="flex h-full gap-2">
        <div className="flex flex-col justify-between py-1 shrink-0">
          <span className="text-[10px]" style={{ color: '#6F695F' }}>{formatY ? formatY(max) : max}</span>
          <span className="text-[10px]" style={{ color: '#6F695F' }}>0</span>
        </div>
        <div className="flex-1 flex flex-col min-w-0">
          <svg viewBox={`0 0 ${w} ${h}`} className="w-full flex-1" preserveAspectRatio="none">
            <defs>
              <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.2} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            {[0.25, 0.5, 0.75].map(t => (
              <line
                key={t}
                x1={padX}
                x2={w - padX}
                y1={padY + t * (h - padY * 2)}
                y2={padY + t * (h - padY * 2)}
                stroke="#F0EBE3"
                strokeDasharray="2 2"
              />
            ))}
            <path d={area} fill={`url(#grad-${color.replace('#', '')})`} />
            <path d={line} fill="none" stroke={color} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
          </svg>
          <div className="flex justify-between mt-1 px-0.5">
            {data.map(d => (
              <span key={d.label} className="text-[10px]" style={{ color: '#6F695F' }}>{d.label}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export function DualBarChart({
  data,
  height = 200,
  aKey = 'a',
  bKey = 'b',
  aLabel = 'Previous',
  bLabel = 'Current',
  aColor = '#EDE5FF',
  bColor = '#5F2FC9',
}: {
  data: { label: string; a: number; b: number }[]
  height?: number
  aKey?: string
  bKey?: string
  aLabel?: string
  bLabel?: string
  aColor?: string
  bColor?: string
}) {
  void aKey
  void bKey
  const max = Math.max(...data.flatMap(d => [d.a, d.b]), 1)

  return (
    <div className="w-full flex flex-col" style={{ height }}>
      <div className="flex items-center gap-3 mb-2 justify-end">
        <span className="flex items-center gap-1.5 text-[10px]" style={{ color: '#6F695F' }}>
          <span className="w-2 h-2 rounded-sm" style={{ background: aColor }} /> {aLabel}
        </span>
        <span className="flex items-center gap-1.5 text-[10px]" style={{ color: '#6F695F' }}>
          <span className="w-2 h-2 rounded-sm" style={{ background: bColor }} /> {bLabel}
        </span>
      </div>
      <div className="flex-1 flex items-end gap-3 px-1">
        {data.map(d => (
          <div key={d.label} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
            <div className="flex items-end gap-1 w-full flex-1">
              <div
                className="flex-1 rounded-t-sm min-h-[4px]"
                style={{ height: `${(d.a / max) * 100}%`, background: aColor }}
                title={`${aLabel}: ${d.a}`}
              />
              <div
                className="flex-1 rounded-t-sm min-h-[4px]"
                style={{ height: `${(d.b / max) * 100}%`, background: bColor }}
                title={`${bLabel}: ${d.b}`}
              />
            </div>
            <span className="text-[10px]" style={{ color: '#6F695F' }}>{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function DonutChart({
  data,
  colors,
  size = 160,
}: {
  data: { name: string; value: number }[]
  colors: string[]
  size?: number
}) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1
  const r = 60
  const cx = 80
  const cy = 80
  const stroke = 18
  const circ = 2 * Math.PI * r
  let offset = 0

  return (
    <svg width={size} height={size} viewBox="0 0 160 160">
      {data.map((d, i) => {
        const len = (d.value / total) * circ
        const dash = `${len} ${circ - len}`
        const el = (
          <circle
            key={d.name}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={colors[i % colors.length]}
            strokeWidth={stroke}
            strokeDasharray={dash}
            strokeDashoffset={-offset}
            strokeLinecap="butt"
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        )
        offset += len
        return el
      })}
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize="18" fontWeight="700" fill="#1A1814">
        {total}%
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" fontSize="10" fill="#6F695F">
        sources
      </text>
    </svg>
  )
}

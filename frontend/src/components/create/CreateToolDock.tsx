 import { Crop, Scissors, SlidersHorizontal, Type, Sparkles, SmilePlus, PenLine } from 'lucide-react'

export type CreateTool = 'filters' | 'crop' | 'caption' | 'trim' | 'adjust' | 'text' | 'stickers' | 'draw'

type Props = {
  active: CreateTool | null
  onChange: (tool: CreateTool) => void
  showTrim: boolean
  include?: CreateTool[]
}

const TOOLS: { id: CreateTool; label: string; Icon: typeof SlidersHorizontal }[] = [
  { id: 'filters', label: 'Filters', Icon: SlidersHorizontal },
  { id: 'adjust', label: 'Adjust', Icon: Sparkles },
  { id: 'crop', label: 'Crop', Icon: Crop },
  { id: 'caption', label: 'Caption', Icon: Type },
  { id: 'text', label: 'Text', Icon: Type },
  { id: 'stickers', label: 'Stickers', Icon: SmilePlus },
  { id: 'draw', label: 'Draw', Icon: PenLine },
  { id: 'trim', label: 'Trim', Icon: Scissors },
]

export function CreateToolDock({ active, onChange, showTrim, include }: Props) {
  const visible = TOOLS.filter((tool) => {
    if (include && !include.includes(tool.id)) return false
    if (!showTrim && tool.id === 'trim') return false
    return true
  })

  return (
    <nav
      className="create-tool-dock"
      style={{ gridTemplateColumns: `repeat(${visible.length}, minmax(0, 1fr))` }}
      aria-label="Editing tools"
    >
      {visible.map((tool) => (
        <button
          key={tool.id}
          type="button"
          className={active === tool.id ? 'is-active' : ''}
          onClick={() => onChange(tool.id)}
        >
          <tool.Icon size={18} strokeWidth={2.25} aria-hidden />
          <span>{tool.label}</span>
        </button>
      ))}
    </nav>
  )
}
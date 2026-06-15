import { useMemo, useState } from 'react'
import { Check, SlidersHorizontal, X } from 'lucide-react'
import './ServiceProviderFilterButton.css'

export type ServiceProviderFilterAction = {
  type: 'clickText'
  selector: string
  text: string
}

export type ServiceProviderFilterOption = {
  id: string
  label: string
  helper?: string
  action?: ServiceProviderFilterAction
}

export type ServiceProviderFilterGroup = {
  id: string
  title: string
  singleSelect?: boolean
  options: ServiceProviderFilterOption[]
}

type Props = {
  groups: ServiceProviderFilterGroup[]
  label?: string
  scope?: string
}

function textOf(node: HTMLElement) {
  return node.textContent?.replace(/\s+/g, ' ').trim().toLowerCase() ?? ''
}

function runAction(action?: ServiceProviderFilterAction) {
  if (!action) return
  const targetText = action.text.toLowerCase()
  const candidates = Array.from(document.querySelectorAll<HTMLElement>(action.selector))
  const target = candidates.find((node) => textOf(node) === targetText) ?? candidates.find((node) => textOf(node).includes(targetText))
  target?.click()
}

function dispatchFilterChange(scope: string | undefined, selected: string[]) {
  if (!scope) return
  window.dispatchEvent(new CustomEvent('service-provider-filters-change', { detail: { scope, selected } }))
}

export function ServiceProviderFilterButton({ groups, label = 'Filters', scope }: Props) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<string[]>([])

  const selectedCount = selected.length
  const optionMap = useMemo(() => {
    const map = new Map<string, ServiceProviderFilterOption>()
    groups.forEach((group) => group.options.forEach((option) => map.set(option.id, option)))
    return map
  }, [groups])

  const toggleOption = (group: ServiceProviderFilterGroup, option: ServiceProviderFilterOption) => {
    const active = selected.includes(option.id)
    let next: string[]
    if (group.singleSelect) {
      const groupIds = group.options.map((item) => item.id)
      const withoutGroup = selected.filter((id) => !groupIds.includes(id))
      next = active ? withoutGroup : [...withoutGroup, option.id]
    } else {
      next = active ? selected.filter((id) => id !== option.id) : [...selected, option.id]
    }

    setSelected(next)
    dispatchFilterChange(scope, next)
    runAction(option.action)
  }

  const clearAll = () => {
    selected.forEach((id) => runAction(optionMap.get(id)?.action))
    setSelected([])
    dispatchFilterChange(scope, [])
  }

  return (
    <div className="sp-filter">
      <button
        type="button"
        className={open ? 'sp-filter__trigger sp-filter__trigger--active' : 'sp-filter__trigger'}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <SlidersHorizontal size={16} strokeWidth={2.25} aria-hidden />
        <span>{label}</span>
        {selectedCount > 0 ? <b>{selectedCount}</b> : null}
      </button>

      {open ? (
        <div className="sp-filter__panel" role="dialog" aria-label="Service provider filters">
          <div className="sp-filter__panel-head">
            <div>
              <strong>Find what fits</strong>
              <p>Tap a few boxes. Keep it simple.</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close filters">
              <X size={16} strokeWidth={2.25} aria-hidden />
            </button>
          </div>

          {groups.map((group) => (
            <section key={group.id} className="sp-filter__group">
              <h3>{group.title}</h3>
              <div className="sp-filter__options">
                {group.options.map((option) => {
                  const active = selected.includes(option.id)
                  return (
                    <button
                      key={option.id}
                      type="button"
                      className={active ? 'sp-filter__option sp-filter__option--active' : 'sp-filter__option'}
                      onClick={() => toggleOption(group, option)}
                      aria-pressed={active}
                    >
                      <span className="sp-filter__tick" aria-hidden>
                        {active ? <Check size={13} strokeWidth={2.7} /> : null}
                      </span>
                      <span>
                        <b>{option.label}</b>
                        {option.helper ? <small>{option.helper}</small> : null}
                      </span>
                    </button>
                  )
                })}
              </div>
            </section>
          ))}

          {selectedCount > 0 ? (
            <button type="button" className="sp-filter__clear" onClick={clearAll}>
              Clear filters
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

import { useEffect } from 'react'
import './TransportPageEnhancer.css'

function replaceText(root: ParentNode) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const nodes: Text[] = []
  while (walker.nextNode()) nodes.push(walker.currentNode as Text)
  nodes.forEach((node) => {
    const current = node.nodeValue || ''
    const next = current
      .replace(/Find a bus trip/g, 'Find a shared trip')
      .replace(/Bus trips/g, 'Shared trips')
      .replace(/bus trips/g, 'shared trips')
      .replace(/bus trip/g, 'shared trip')
    if (next !== current) node.nodeValue = next
  })
}

function moveModeBar() {
  const slot = document.querySelector<HTMLElement>('[data-transport-mode-slot]')
  const modeBar = document.querySelector<HTMLElement>('.tp-page__mode-bar')
  if (!slot || !modeBar || modeBar.parentElement === slot) return
  slot.appendChild(modeBar)
}

export function TransportPageEnhancer() {
  useEffect(() => {
    const sync = () => {
      replaceText(document.body)
      moveModeBar()
    }

    sync()
    const observer = new MutationObserver(sync)
    observer.observe(document.body, { childList: true, subtree: true, characterData: true })
    return () => observer.disconnect()
  }, [])

  return null
}

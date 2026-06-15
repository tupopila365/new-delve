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

export function TransportPageEnhancer() {
  useEffect(() => {
    replaceText(document.body)
    const observer = new MutationObserver(() => replaceText(document.body))
    observer.observe(document.body, { childList: true, subtree: true, characterData: true })
    return () => observer.disconnect()
  }, [])

  return null
}

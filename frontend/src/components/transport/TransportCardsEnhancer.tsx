import { useEffect } from 'react'
import './TransportCardsEnhancer.css'

function shareIcon() {
  return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.35" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><path d="M8.59 13.51l6.83 3.98"></path><path d="M15.41 6.51L8.59 10.49"></path></svg>'
}

function bookmarkIcon(saved = false) {
  return `<svg width="17" height="17" viewBox="0 0 24 24" fill="${saved ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>`
}

function makeActionButton(kind: string, label: string, icon: string) {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = `transport-card-image-actions__btn transport-card-image-actions__btn--${kind}`
  button.setAttribute('aria-label', label)
  button.setAttribute('title', label)
  button.innerHTML = `${icon}<span>${label}</span>`
  return button
}

function enhanceVehicleCard(card: HTMLAnchorElement) {
  const media = card.querySelector<HTMLElement>('.tp-vehicle-card__img-wrap')
  if (!media) return

  let row = media.querySelector<HTMLDivElement>('.transport-card-image-actions')
  if (!row) {
    row = document.createElement('div')
    row.className = 'transport-card-image-actions'
    media.appendChild(row)
  }

  const saveButton = media.querySelector<HTMLButtonElement>('.acc-media-card__save')
  if (saveButton && saveButton.parentElement !== row) {
    saveButton.classList.add('transport-card-image-actions__save')
    row.appendChild(saveButton)
  }

  if (!row.querySelector('[data-transport-share]')) {
    const shareButton = makeActionButton('share', 'Share vehicle', shareIcon())
    shareButton.dataset.transportShare = card.getAttribute('href') || ''
    row.appendChild(shareButton)
  }
}

function enhanceSharedTripCard(card: HTMLAnchorElement) {
  const media = card.querySelector<HTMLElement>('.tp-trip-card__media')
  if (!media) return

  let row = media.querySelector<HTMLDivElement>('.transport-card-image-actions')
  if (!row) {
    row = document.createElement('div')
    row.className = 'transport-card-image-actions'
    media.appendChild(row)
  }

  if (!row.querySelector('[data-transport-save]')) {
    const saveButton = makeActionButton('save', 'Save shared trip', bookmarkIcon(false))
    saveButton.dataset.transportSave = card.getAttribute('href') || ''
    row.appendChild(saveButton)
  }

  if (!row.querySelector('[data-transport-share]')) {
    const shareButton = makeActionButton('share', 'Share shared trip', shareIcon())
    shareButton.dataset.transportShare = card.getAttribute('href') || ''
    row.appendChild(shareButton)
  }
}

function enhanceCards() {
  document.querySelectorAll<HTMLAnchorElement>('.tp-vehicle-card').forEach(enhanceVehicleCard)
  document.querySelectorAll<HTMLAnchorElement>('.tp-trip-card').forEach(enhanceSharedTripCard)
}

export function TransportCardsEnhancer() {
  useEffect(() => {
    enhanceCards()
    const observer = new MutationObserver(enhanceCards)
    observer.observe(document.body, { childList: true, subtree: true })

    const onClick = async (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null
      const saveButton = target?.closest<HTMLButtonElement>('[data-transport-save]')
      const shareButton = target?.closest<HTMLButtonElement>('[data-transport-share]')

      if (saveButton) {
        event.preventDefault()
        event.stopPropagation()
        const key = `delve:saved-transport:${saveButton.dataset.transportSave || ''}`
        const nextSaved = localStorage.getItem(key) !== 'true'
        localStorage.setItem(key, String(nextSaved))
        saveButton.classList.toggle('transport-card-image-actions__btn--saved', nextSaved)
        saveButton.innerHTML = `${bookmarkIcon(nextSaved)}<span>${nextSaved ? 'Saved' : 'Save shared trip'}</span>`
      }

      if (shareButton) {
        event.preventDefault()
        event.stopPropagation()
        const card = shareButton.closest<HTMLAnchorElement>('.tp-vehicle-card, .tp-trip-card')
        const title = card?.querySelector('.media-card__title, .tp-trip-card__route')?.textContent?.trim() || 'DELVE transport'
        const href = shareButton.dataset.transportShare || card?.getAttribute('href') || ''
        const url = `${window.location.origin}${href}`
        try {
          if (navigator.share) await navigator.share({ title, url })
          else await navigator.clipboard.writeText(url)
        } catch {
          // Share cancelled.
        }
      }
    }

    document.addEventListener('click', onClick, true)
    return () => {
      observer.disconnect()
      document.removeEventListener('click', onClick, true)
    }
  }, [])

  return null
}

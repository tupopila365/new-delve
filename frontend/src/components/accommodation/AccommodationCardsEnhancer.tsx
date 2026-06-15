import { useEffect } from 'react'
import './AccommodationCardsEnhancer.css'

const SAVED_KEY = 'delve:saved-stays'
const FALLBACK_STAY_IMAGE = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80'

function readSaved(): string[] {
  try {
    return JSON.parse(window.localStorage.getItem(SAVED_KEY) || '[]') as string[]
  } catch {
    return []
  }
}

function writeSaved(ids: string[]) {
  window.localStorage.setItem(SAVED_KEY, JSON.stringify(ids))
}

function icon(name: 'save' | 'share') {
  if (name === 'save') {
    return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.35" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>'
  }
  return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.35" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><path d="M8.59 13.51l6.83 3.98"></path><path d="M15.41 6.51L8.59 10.49"></path></svg>'
}

function listingIdFromHref(href: string) {
  const match = href.match(/\/accommodation\/(\d+)/)
  return match?.[1] ?? href
}

function addOverlayActions(card: HTMLAnchorElement) {
  const media = card.querySelector<HTMLElement>('.acc-media-card__img-wrap')
  if (!media || media.querySelector('.stay-card-overlay-actions')) return

  const listingId = listingIdFromHref(card.getAttribute('href') || '')
  const savedIds = readSaved()
  const isSaved = savedIds.includes(listingId)

  const actions = document.createElement('div')
  actions.className = 'stay-card-overlay-actions'
  actions.innerHTML = `
    <button type="button" class="stay-card-overlay-actions__btn${isSaved ? ' is-active' : ''}" data-stay-save="${listingId}" aria-label="${isSaved ? 'Remove saved stay' : 'Save stay'}" title="${isSaved ? 'Saved' : 'Save'}">
      ${icon('save')}<span>${isSaved ? 'Saved' : 'Save'}</span>
    </button>
    <button type="button" class="stay-card-overlay-actions__btn" data-stay-share="${listingId}" aria-label="Share stay" title="Share">
      ${icon('share')}<span>Share</span>
    </button>
  `
  media.appendChild(actions)
}

export function AccommodationCardsEnhancer() {
  useEffect(() => {
    const enhance = () => {
      document.querySelectorAll<HTMLAnchorElement>('.acc-media-card').forEach((card) => {
        const image = card.querySelector<HTMLImageElement>('.acc-media-card__img')
        if (image && image.dataset.fallbackBound !== 'true') {
          image.dataset.fallbackBound = 'true'
          image.addEventListener('error', () => {
            if (image.src !== FALLBACK_STAY_IMAGE) image.src = FALLBACK_STAY_IMAGE
          })
        }

        addOverlayActions(card)
        card.dataset.enhancedStayCard = 'true'
      })
    }

    enhance()
    const observer = new MutationObserver(enhance)
    observer.observe(document.body, { childList: true, subtree: true })

    const onClick = async (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null
      const saveButton = target?.closest<HTMLButtonElement>('[data-stay-save]')
      const shareButton = target?.closest<HTMLButtonElement>('[data-stay-share]')
      if (!saveButton && !shareButton) return

      event.preventDefault()
      event.stopPropagation()

      if (saveButton) {
        const id = saveButton.dataset.staySave || ''
        const current = readSaved()
        const saved = current.includes(id)
        const next = saved ? current.filter((item) => item !== id) : [...current, id]
        writeSaved(next)
        saveButton.classList.toggle('is-active', !saved)
        saveButton.setAttribute('aria-label', saved ? 'Save stay' : 'Remove saved stay')
        saveButton.setAttribute('title', saved ? 'Save' : 'Saved')
        const label = saveButton.querySelector('span')
        if (label) label.textContent = saved ? 'Save' : 'Saved'
        return
      }

      if (shareButton) {
        const card = shareButton.closest<HTMLAnchorElement>('.acc-media-card')
        const href = card?.getAttribute('href') || ''
        const title = card?.querySelector('.acc-media-card__title')?.textContent?.trim() || 'DELVE stay'
        const url = `${window.location.origin}${href}`
        try {
          if (navigator.share) await navigator.share({ title, url })
          else await navigator.clipboard.writeText(url)
        } catch {
          // User cancelled sharing; keep the UI calm.
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

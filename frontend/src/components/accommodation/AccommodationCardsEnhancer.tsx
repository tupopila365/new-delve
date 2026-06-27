import { useEffect } from 'react'
import './AccommodationCardsEnhancer.css'

const FALLBACK_STAY_IMAGE = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80'

function iconShare() {
  return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.35" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><path d="M8.59 13.51l6.83 3.98"></path><path d="M15.41 6.51L8.59 10.49"></path></svg>'
}

function listingIdFromHref(href: string) {
  const match = href.match(/\/accommodation\/(\d+)/)
  return match?.[1] ?? href
}

function numberFromText(text: string | undefined | null) {
  const match = text?.match(/\d+(?:\.\d+)?/)
  return match ? Number.parseFloat(match[0]) : 0
}

function addImageActionRow(card: HTMLAnchorElement) {
  const media = card.querySelector<HTMLElement>('.acc-media-card__img-wrap')
  if (!media) return

  let row = media.querySelector<HTMLDivElement>('.stay-card-image-actions')
  if (!row) {
    row = document.createElement('div')
    row.className = 'stay-card-image-actions'
    media.appendChild(row)
  }

  const likeButton = media.querySelector<HTMLButtonElement>('.acc-media-card__save')
  if (likeButton && likeButton.parentElement !== row) {
    likeButton.classList.add('stay-card-image-actions__like')
    row.appendChild(likeButton)
  }

  const bookmarkButton = media.querySelector<HTMLButtonElement>('.acc-media-card__bookmark')
  if (bookmarkButton && bookmarkButton.parentElement !== row) {
    bookmarkButton.classList.add('stay-card-image-actions__bookmark')
    row.appendChild(bookmarkButton)
  }

  if (row.querySelector('[data-stay-share]')) return

  const listingId = listingIdFromHref(card.getAttribute('href') || '')

  const shareButton = document.createElement('button')
  shareButton.type = 'button'
  shareButton.className = 'stay-card-image-actions__btn'
  shareButton.dataset.stayShare = listingId
  shareButton.setAttribute('aria-label', 'Share stay')
  shareButton.setAttribute('title', 'Share')
  shareButton.innerHTML = `${iconShare()}<span>Share</span>`

  row.appendChild(shareButton)
}

function matchesLocalFilters(card: HTMLAnchorElement, selected: string[]) {
  const rating = numberFromText(card.querySelector('.acc-media-card__rating-row')?.textContent)
  const bedrooms = numberFromText(card.querySelector('.acc-media-card__guests')?.textContent)

  if (selected.includes('rating-5') && rating < 5) return false
  if (selected.includes('rating-4') && rating < 4) return false
  if (selected.includes('bed-1') && bedrooms < 1) return false
  if (selected.includes('bed-2') && bedrooms < 2) return false
  if (selected.includes('bed-3') && bedrooms < 3) return false
  return true
}

function applyLocalFilters(selected: string[]) {
  document.querySelectorAll<HTMLAnchorElement>('.acc-media-card').forEach((card) => {
    card.classList.toggle('acc-media-card--filtered-out', !matchesLocalFilters(card, selected))
  })
}

export function AccommodationCardsEnhancer() {
  useEffect(() => {
    let activeLocalFilters: string[] = []

    const enhance = () => {
      document.querySelectorAll<HTMLAnchorElement>('.acc-media-card').forEach((card) => {
        const image = card.querySelector<HTMLImageElement>('.acc-media-card__img')
        if (image && image.dataset.fallbackBound !== 'true') {
          image.dataset.fallbackBound = 'true'
          image.addEventListener('error', () => {
            if (image.src !== FALLBACK_STAY_IMAGE) image.src = FALLBACK_STAY_IMAGE
          })
        }

        addImageActionRow(card)
        card.dataset.enhancedStayCard = 'true'
      })
      applyLocalFilters(activeLocalFilters)
    }

    enhance()
    const observer = new MutationObserver(enhance)
    observer.observe(document.body, { childList: true, subtree: true })

    const onFilterChange = (event: Event) => {
      const detail = (event as CustomEvent<{ scope?: string; selected?: string[] }>).detail
      if (detail?.scope !== 'stays') return
      activeLocalFilters = detail.selected ?? []
      applyLocalFilters(activeLocalFilters)
    }

    const onClick = async (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null
      const shareButton = target?.closest<HTMLButtonElement>('[data-stay-share]')
      if (!shareButton) return

      event.preventDefault()
      event.stopPropagation()

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

    window.addEventListener('service-provider-filters-change', onFilterChange)
    document.addEventListener('click', onClick, true)
    return () => {
      observer.disconnect()
      window.removeEventListener('service-provider-filters-change', onFilterChange)
      document.removeEventListener('click', onClick, true)
    }
  }, [])

  return null
}

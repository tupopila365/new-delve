import { useEffect } from 'react'
import './FoodCardsEnhancer.css'

/** Keep share polish for legacy featured/card layouts that lack React action rows. */
function shareIcon() {
  return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.35" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><path d="M8.59 13.51l6.83 3.98"></path><path d="M15.41 6.51L8.59 10.49"></path></svg>'
}

function venueIdFromHref(href: string) {
  const match = href.match(/\/food\/(\d+)/)
  return match?.[1] ?? href
}

function addFoodActionRow(card: HTMLAnchorElement) {
  // New React cards already have Delvers-style like/share/save.
  if (card.querySelector('.fd-spot__actions')) return

  const media = card.querySelector<HTMLElement>('.fd-spot__media, .fd-card__img-wrap, .fd-featured__media')
  if (!media) return

  let row = media.querySelector<HTMLDivElement>('.food-card-image-actions')
  if (!row) {
    row = document.createElement('div')
    row.className = 'food-card-image-actions'
    media.appendChild(row)
  }

  const saveButton = media.querySelector<HTMLButtonElement>('.fd-spot__save, .fd-card__save, .fd-featured__save')
  if (saveButton && saveButton.parentElement !== row) {
    saveButton.classList.add('food-card-image-actions__save')
    row.appendChild(saveButton)
  }

  if (row.querySelector('[data-food-share]')) return

  const venueId = venueIdFromHref(card.getAttribute('href') || '')
  const shareButton = document.createElement('button')
  shareButton.type = 'button'
  shareButton.className = 'food-card-image-actions__btn'
  shareButton.dataset.foodShare = venueId
  shareButton.setAttribute('aria-label', 'Share food spot')
  shareButton.setAttribute('title', 'Share')
  shareButton.innerHTML = `${shareIcon()}<span>Share</span>`
  row.appendChild(shareButton)
}

export function FoodCardsEnhancer() {
  useEffect(() => {
    const enhance = () => {
      document.querySelectorAll<HTMLAnchorElement>('.fd-spot, .fd-card, .fd-featured').forEach((card) => {
        addFoodActionRow(card)
        card.dataset.enhancedFoodCard = 'true'
      })
    }

    enhance()
    const observer = new MutationObserver(enhance)
    observer.observe(document.body, { childList: true, subtree: true })

    const onClick = async (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null
      const shareButton = target?.closest<HTMLButtonElement>('[data-food-share]')
      if (!shareButton) return

      event.preventDefault()
      event.stopPropagation()

      const card = shareButton.closest<HTMLAnchorElement>('.fd-spot, .fd-card, .fd-featured')
      const href = card?.getAttribute('href') || ''
      const title =
        card?.querySelector('.fd-spot__title, .fd-card__name, .fd-featured__name')?.textContent?.trim() ||
        'DELVE food spot'
      const url = `${window.location.origin}${href}`

      try {
        if (navigator.share) await navigator.share({ title, url })
        else await navigator.clipboard.writeText(url)
      } catch {
        // Keep cancelled share quiet.
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

import { useEffect } from 'react'
import './GuidesCardsEnhancer.css'

/** Keep share polish for legacy featured/card layouts that lack React action rows. */
function shareIcon() {
  return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.35" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><path d="M8.59 13.51l6.83 3.98"></path><path d="M15.41 6.51L8.59 10.49"></path></svg>'
}

function guideIdFromHref(href: string) {
  const match = href.match(/\/guides\/(\d+)/)
  return match?.[1] ?? href
}

function addGuideActionRow(card: HTMLAnchorElement) {
  // New React cards already have share/save actions.
  if (card.querySelector('.gl-spot__actions')) return

  const media = card.querySelector<HTMLElement>('.gl-spot__media, .gd-card__photo-wrap, .gd-featured__media')
  if (!media) return

  let row = media.querySelector<HTMLDivElement>('.guide-card-image-actions')
  if (!row) {
    row = document.createElement('div')
    row.className = 'guide-card-image-actions'
    media.appendChild(row)
  }

  const saveButton = media.querySelector<HTMLButtonElement>(
    '.gl-spot__act--save, .gd-card__save, .gd-featured__save',
  )
  if (saveButton && saveButton.parentElement !== row) {
    saveButton.classList.add('guide-card-image-actions__save')
    row.appendChild(saveButton)
  }

  if (row.querySelector('[data-guide-share]')) return

  const guideId = guideIdFromHref(card.getAttribute('href') || '')
  const shareButton = document.createElement('button')
  shareButton.type = 'button'
  shareButton.className = 'guide-card-image-actions__btn'
  shareButton.dataset.guideShare = guideId
  shareButton.setAttribute('aria-label', 'Share guide')
  shareButton.setAttribute('title', 'Share')
  shareButton.innerHTML = `${shareIcon()}<span>Share</span>`
  row.appendChild(shareButton)
}

export function GuidesCardsEnhancer() {
  useEffect(() => {
    const enhance = () => {
      document
        .querySelectorAll<HTMLAnchorElement>('.gl-spot, .gd-card, .gd-featured')
        .forEach((card) => {
          addGuideActionRow(card)
          card.dataset.enhancedGuideCard = 'true'
        })
    }

    enhance()
    const observer = new MutationObserver(enhance)
    observer.observe(document.body, { childList: true, subtree: true })

    const onClick = async (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null
      const shareButton = target?.closest<HTMLButtonElement>('[data-guide-share]')
      if (!shareButton) return

      event.preventDefault()
      event.stopPropagation()

      const card = shareButton.closest<HTMLAnchorElement>('.gl-spot, .gd-card, .gd-featured')
      const href = card?.getAttribute('href') || ''
      const title =
        card?.querySelector('.gl-spot__title, .gd-card__headline, .gd-featured__name')?.textContent?.trim() ||
        'DELVE guide'
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

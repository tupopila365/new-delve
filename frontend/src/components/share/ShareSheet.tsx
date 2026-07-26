import { useEffect, useId, useState } from 'react'
import { Check, Copy, Link2, Share2, X } from 'lucide-react'
import { mediaUrl } from '../../api/client'
import { buildPublicShareUrl, type SharePayload } from '../../lib/shareUrl'
import { isVideoUrl } from '../listing/photos/listingGalleryMedia'
import './share-sheet.css'

type Props = {
  open: boolean
  onClose: () => void
  share: SharePayload
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.setAttribute('readonly', '')
      ta.style.position = 'fixed'
      ta.style.left = '-9999px'
      document.body.appendChild(ta)
      ta.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(ta)
      return ok
    } catch {
      return false
    }
  }
}

export function ShareSheet({ open, onClose, share }: Props) {
  const titleId = useId()
  const [copied, setCopied] = useState(false)
  const [status, setStatus] = useState('')
  const url = buildPublicShareUrl(share.path)
  const preview = mediaUrl(share.previewImage) || ''
  const previewIsVideo = Boolean(preview && isVideoUrl(preview))
  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  useEffect(() => {
    if (!open) {
      setCopied(false)
      setStatus('')
      return
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null

  const shareText = (share.text || share.title || 'Shared from DELVE').trim()

  const onNativeShare = async () => {
    try {
      await navigator.share({
        title: share.title,
        text: shareText,
        url,
      })
      onClose()
    } catch (err) {
      // User cancel — quiet. Other errors — surface briefly.
      if (err instanceof DOMException && err.name === 'AbortError') return
      setStatus('Could not open the system share sheet.')
    }
  }

  const onCopy = async () => {
    const ok = await copyText(url)
    setCopied(ok)
    setStatus(ok ? 'Link copied' : 'Could not copy link')
    if (ok) window.setTimeout(() => setCopied(false), 1800)
  }

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(`${shareText}\n${url}`)}`

  return (
    <div className="delve-share" role="presentation">
      <button type="button" className="delve-share__backdrop" aria-label="Close share" onClick={onClose} />
      <div
        className="delve-share__sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="delve-share__head">
          <div>
            <h2 id={titleId}>Share</h2>
            <p className="delve-share__sub">Send a clean DELVE link</p>
          </div>
          <button type="button" className="delve-share__close" onClick={onClose} aria-label="Close">
            <X size={18} strokeWidth={2.25} aria-hidden />
          </button>
        </header>

        <div className="delve-share__preview">
          <div className="delve-share__media" aria-hidden>
            {preview ? (
              previewIsVideo ? (
                <video src={`${preview}#t=0.1`} muted playsInline preload="metadata" />
              ) : (
                <img src={preview} alt="" />
              )
            ) : (
              <span className="delve-share__media-fallback">
                <Share2 size={28} strokeWidth={1.75} />
              </span>
            )}
          </div>
          <div className="delve-share__meta">
            {share.previewLabel ? <span className="delve-share__eyebrow">{share.previewLabel}</span> : null}
            <strong>{share.title}</strong>
            <p className="delve-share__url" title={url}>
              <Link2 size={14} strokeWidth={2.25} aria-hidden />
              <span>{url.replace(/^https?:\/\//i, '')}</span>
            </p>
          </div>
        </div>

        <div className="delve-share__actions">
          {canNativeShare ? (
            <button type="button" className="delve-share__action delve-share__action--primary" onClick={() => void onNativeShare()}>
              <Share2 size={18} strokeWidth={2.25} aria-hidden />
              Share via device
            </button>
          ) : null}
          <button type="button" className="delve-share__action" onClick={() => void onCopy()}>
            {copied ? <Check size={18} strokeWidth={2.25} aria-hidden /> : <Copy size={18} strokeWidth={2.25} aria-hidden />}
            {copied ? 'Copied' : 'Copy link'}
          </button>
          <a
            className="delve-share__action"
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
          >
            WhatsApp
          </a>
        </div>

        {status ? (
          <p className="delve-share__status" role="status">
            {status}
          </p>
        ) : null}
      </div>
    </div>
  )
}

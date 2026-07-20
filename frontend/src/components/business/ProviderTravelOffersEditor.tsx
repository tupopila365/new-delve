import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ExternalLink, ImagePlus, Plus, Trash2, X } from 'lucide-react'
import { apiFetch, mediaUrl } from '../../api/client'
import { friendlyApiMessage } from '../../utils/friendlyError'
import { uploadHighlightMedia } from '../highlights/highlightMediaApi'
import {
  OFFER_CATEGORY_OPTIONS,
  OFFER_ELIGIBILITY_OPTIONS,
  OFFER_KIND_OPTIONS,
  type TravelOffer,
  type TravelOfferEligibility,
  type TravelOfferKind,
  type TravelOfferMedia,
} from './travelOffers'

type Draft = {
  title: string
  summary: string
  offer_kind: TravelOfferKind
  eligibility: TravelOfferEligibility
  eligibility_label: string
  price_label: string
  categories: string[]
  details: string
  how_to_claim: string
  proof_required: string
  terms_note: string
  cover_image: string
  gallery_images: TravelOfferMedia[]
  is_active: boolean
}

const EMPTY: Draft = {
  title: '',
  summary: '',
  offer_kind: 'discount',
  eligibility: 'everyone',
  eligibility_label: '',
  price_label: '',
  categories: [],
  details: '',
  how_to_claim: '',
  proof_required: '',
  terms_note: '',
  cover_image: '',
  gallery_images: [],
  is_active: true,
}

type Props = {
  businessId: number
  canEdit: boolean
}

export function ProviderTravelOffersEditor({ businessId, canEdit }: Props) {
  const qc = useQueryClient()
  const coverInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState<'cover' | 'gallery' | null>(null)

  const { data: offers = [], isLoading } = useQuery({
    queryKey: ['business-offers', businessId],
    queryFn: () => apiFetch<TravelOffer[]>(`/api/accounts/me/businesses/${businessId}/offers/`),
    enabled: Boolean(businessId),
  })

  const createMut = useMutation({
    mutationFn: () =>
      apiFetch<TravelOffer>(`/api/accounts/me/businesses/${businessId}/offers/`, {
        method: 'POST',
        body: JSON.stringify(draft),
      }),
    onSuccess: async () => {
      setDraft(EMPTY)
      setError('')
      await qc.invalidateQueries({ queryKey: ['business-offers', businessId] })
      await qc.invalidateQueries({ queryKey: ['my-businesses'] })
      await qc.invalidateQueries({ queryKey: ['business-profile'] })
    },
    onError: (e) => setError(friendlyApiMessage(e, 'Could not add offer.')),
  })

  const deleteMut = useMutation({
    mutationFn: (offerId: number) =>
      apiFetch(`/api/accounts/me/businesses/${businessId}/offers/${offerId}/`, { method: 'DELETE' }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['business-offers', businessId] })
      await qc.invalidateQueries({ queryKey: ['my-businesses'] })
      await qc.invalidateQueries({ queryKey: ['business-profile'] })
    },
    onError: (e) => setError(friendlyApiMessage(e, 'Could not remove offer.')),
  })

  const toggleCategory = (value: string) => {
    setDraft((d) => ({
      ...d,
      categories: d.categories.includes(value)
        ? d.categories.filter((c) => c !== value)
        : [...d.categories, value],
    }))
  }

  const uploadFiles = async (files: FileList | null, target: 'cover' | 'gallery') => {
    if (!files?.length) return
    setUploading(target)
    setError('')
    try {
      if (target === 'cover') {
        const file = files[0]
        const kind = file.type.startsWith('video/') ? 'video' : 'image'
        const uploaded = await uploadHighlightMedia(file, kind)
        setDraft((d) => ({ ...d, cover_image: uploaded.url }))
      } else {
        const next: TravelOfferMedia[] = []
        for (const file of Array.from(files).slice(0, 8)) {
          const kind = file.type.startsWith('video/') ? 'video' : 'image'
          const uploaded = await uploadHighlightMedia(file, kind)
          next.push({ src: uploaded.url, kind })
        }
        setDraft((d) => ({
          ...d,
          gallery_images: [...d.gallery_images, ...next].slice(0, 12),
        }))
      }
    } catch (e) {
      setError(friendlyApiMessage(e, 'Could not upload media.'))
    } finally {
      setUploading(null)
      if (coverInputRef.current) coverInputRef.current.value = ''
      if (galleryInputRef.current) galleryInputRef.current.value = ''
    }
  }

  const coverPreview = draft.cover_image ? mediaUrl(draft.cover_image) || draft.cover_image : ''

  return (
    <div className="prov-settings__offers">
      <h3 className="prov-settings__subhead">Accessible travel offers</h3>
      <p className="prov-settings__panel-sub">
        Publish SADC rates, student packages, and discounts with photos that show the experience —
        so travellers feel compelled to sign up.
      </p>

      {isLoading ? <p className="prov-settings__panel-sub">Loading offers…</p> : null}

      {offers.length > 0 ? (
        <ul className="prov-settings__offer-list">
          {offers.map((offer) => {
            const thumb = offer.cover_image
              ? mediaUrl(offer.cover_image) || offer.cover_image
              : null
            return (
              <li key={offer.id} className="prov-settings__offer-row">
                {thumb ? (
                  <img src={thumb} alt="" className="prov-settings__offer-thumb" />
                ) : (
                  <span className="prov-settings__offer-thumb prov-settings__offer-thumb--ph" aria-hidden>
                    <ImagePlus size={16} strokeWidth={2} />
                  </span>
                )}
                <div className="prov-settings__offer-copy">
                  <strong>{offer.title}</strong>
                  <span>
                    {offer.price_label || 'Deal'} · {offer.eligibility_display || offer.eligibility}
                    {offer.is_active === false ? ' · Hidden' : ''}
                    {(offer.gallery_images?.length ?? 0) > 0
                      ? ` · ${offer.gallery_images!.length} gallery`
                      : ''}
                  </span>
                </div>
                <div className="prov-settings__offer-actions">
                  <Link
                    to={`/business/${businessId}/offers/${offer.id}`}
                    className="prov-ui__btn prov-ui__btn--ghost"
                    aria-label={`Preview ${offer.title}`}
                  >
                    <ExternalLink size={14} strokeWidth={2.25} aria-hidden />
                  </Link>
                  {canEdit ? (
                    <button
                      type="button"
                      className="prov-ui__btn prov-ui__btn--ghost"
                      disabled={deleteMut.isPending}
                      onClick={() => deleteMut.mutate(offer.id)}
                      aria-label={`Remove ${offer.title}`}
                    >
                      <Trash2 size={14} strokeWidth={2.25} aria-hidden />
                    </button>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="prov-settings__panel-sub">No offers yet — add a resident rate or package below.</p>
      )}

      {canEdit ? (
        <div className="prov-settings__offer-form">
          <label className="prov-settings__field">
            Offer title
            <input
              value={draft.title}
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              placeholder="e.g. SADC resident rate"
              maxLength={160}
            />
          </label>
          <label className="prov-settings__field">
            Short summary
            <textarea
              value={draft.summary}
              onChange={(e) => setDraft((d) => ({ ...d, summary: e.target.value }))}
              placeholder="Who it’s for and what’s included"
              rows={2}
              maxLength={500}
            />
          </label>

          <div className="prov-settings__media">
            <div className="prov-settings__media-head">
              <strong>Offer media</strong>
              <span>Cover photo/video plus gallery — travellers see these before they message you.</span>
            </div>
            <div className="prov-settings__media-cover">
              {coverPreview ? (
                <div className="prov-settings__media-preview">
                  {draft.cover_image.match(/\.(mp4|webm|mov)(\?|$)/i) ? (
                    <video src={coverPreview} muted playsInline />
                  ) : (
                    <img src={coverPreview} alt="" />
                  )}
                  <button
                    type="button"
                    className="prov-settings__media-remove"
                    onClick={() => setDraft((d) => ({ ...d, cover_image: '' }))}
                    aria-label="Remove cover"
                  >
                    <X size={14} strokeWidth={2.5} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="prov-settings__media-add"
                  disabled={uploading !== null}
                  onClick={() => coverInputRef.current?.click()}
                >
                  <ImagePlus size={18} strokeWidth={2} aria-hidden />
                  {uploading === 'cover' ? 'Uploading…' : 'Add cover photo'}
                </button>
              )}
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*,video/*"
                hidden
                onChange={(e) => void uploadFiles(e.target.files, 'cover')}
              />
            </div>
            <div className="prov-settings__media-gallery">
              {draft.gallery_images.map((item, idx) => {
                const src = mediaUrl(item.src) || item.src
                return (
                  <div key={`${item.src}-${idx}`} className="prov-settings__media-preview">
                    {item.kind === 'video' ? (
                      <video src={src} muted playsInline />
                    ) : (
                      <img src={src} alt="" />
                    )}
                    <button
                      type="button"
                      className="prov-settings__media-remove"
                      onClick={() =>
                        setDraft((d) => ({
                          ...d,
                          gallery_images: d.gallery_images.filter((_, i) => i !== idx),
                        }))
                      }
                      aria-label="Remove gallery item"
                    >
                      <X size={14} strokeWidth={2.5} />
                    </button>
                  </div>
                )
              })}
              <button
                type="button"
                className="prov-settings__media-add prov-settings__media-add--sm"
                disabled={uploading !== null || draft.gallery_images.length >= 12}
                onClick={() => galleryInputRef.current?.click()}
              >
                <ImagePlus size={16} strokeWidth={2} aria-hidden />
                {uploading === 'gallery' ? 'Uploading…' : 'Add gallery'}
              </button>
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                hidden
                onChange={(e) => void uploadFiles(e.target.files, 'gallery')}
              />
            </div>
          </div>

          <label className="prov-settings__field">
            Full details
            <textarea
              value={draft.details}
              onChange={(e) => setDraft((d) => ({ ...d, details: e.target.value }))}
              placeholder="What the offer includes, where it applies, what’s not included"
              rows={3}
              maxLength={2000}
            />
          </label>
          <div className="prov-settings__row">
            <label className="prov-settings__field">
              Type
              <select
                value={draft.offer_kind}
                onChange={(e) => setDraft((d) => ({ ...d, offer_kind: e.target.value as TravelOfferKind }))}
              >
                {OFFER_KIND_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="prov-settings__field">
              Who qualifies
              <select
                value={draft.eligibility}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, eligibility: e.target.value as TravelOfferEligibility }))
                }
              >
                {OFFER_ELIGIBILITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="prov-settings__field">
            Custom eligibility label (optional)
            <input
              value={draft.eligibility_label}
              onChange={(e) => setDraft((d) => ({ ...d, eligibility_label: e.target.value }))}
              placeholder="e.g. SADC passport holders"
              maxLength={120}
            />
          </label>
          <label className="prov-settings__field">
            Proof required
            <input
              value={draft.proof_required}
              onChange={(e) => setDraft((d) => ({ ...d, proof_required: e.target.value }))}
              placeholder="e.g. Valid SADC passport at check-in"
              maxLength={240}
            />
          </label>
          <label className="prov-settings__field">
            How to sign up / claim
            <textarea
              value={draft.how_to_claim}
              onChange={(e) => setDraft((d) => ({ ...d, how_to_claim: e.target.value }))}
              placeholder="Step-by-step: message us, confirm dates, show proof, book…"
              rows={4}
              maxLength={2000}
            />
          </label>
          <label className="prov-settings__field">
            Terms / fine print (optional)
            <textarea
              value={draft.terms_note}
              onChange={(e) => setDraft((d) => ({ ...d, terms_note: e.target.value }))}
              placeholder="Blackout dates, exclusions, deposit rules…"
              rows={2}
              maxLength={1000}
            />
          </label>
          <label className="prov-settings__field">
            Price / deal label
            <input
              value={draft.price_label}
              onChange={(e) => setDraft((d) => ({ ...d, price_label: e.target.value }))}
              placeholder="e.g. 50% off · From N$1,200"
              maxLength={80}
            />
          </label>
          <fieldset className="prov-settings__cats">
            <legend>Applies to</legend>
            <div className="prov-settings__cat-row">
              {OFFER_CATEGORY_OPTIONS.map((c) => (
                <label key={c.value} className="prov-settings__cat">
                  <input
                    type="checkbox"
                    checked={draft.categories.includes(c.value)}
                    onChange={() => toggleCategory(c.value)}
                  />
                  {c.label}
                </label>
              ))}
            </div>
          </fieldset>
          {error ? (
            <p className="prov-settings__banner prov-settings__banner--err" role="alert">
              {error}
            </p>
          ) : null}
          <button
            type="button"
            className="prov-ui__btn prov-ui__btn--primary"
            disabled={createMut.isPending || uploading !== null || !draft.title.trim()}
            onClick={() => createMut.mutate()}
          >
            <Plus size={15} strokeWidth={2.25} aria-hidden />
            {createMut.isPending ? 'Adding…' : 'Add offer'}
          </button>
        </div>
      ) : null}
    </div>
  )
}

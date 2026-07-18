import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { apiFetch, ApiError } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { useBusinessAccess } from '../hooks/useBusinessAccess'
import { ProviderAccessGate } from '../components/provider'
import { ProviderUiHeader, ProviderUiPage } from '../components/provider/ui'
import { ListingPhotoManager, type ListingPhotoDraft } from '../components/listing/photos'
import {
  photosFromListingGallery,
  resolveListingGalleryMedia,
  serializeGalleryForApi,
} from '../components/listing/photos/listingPhotoUtils'
import type { ListingGalleryMediaItem } from '../components/listing/photos/listingGalleryMedia'
import { SHOP_CATEGORIES } from '../utils/shopDisplay'
import type { ShopMediaRaw, ShopProductListing } from '../utils/shopListing'

type VariantDraft = { label: string; price_override: string; stock_quantity: string }

const emptyForm = (region = '') => ({
  name: '',
  tagline: '',
  description: '',
  category: 'souvenirs',
  region,
  city: '',
  pickup_address: '',
  price: '',
  price_note: '',
  sku: '',
  stock_quantity: '1',
  phone: '',
  artisan_name: '',
  in_stock: true,
  is_featured: false,
  pickup_available: true,
  lodge_delivery: false,
  shipping_available: false,
  shipping_fee: '',
  made_in_namibia: true,
  is_active: false,
})

export function ShopProductForm() {
  const { productId } = useParams()
  const isEdit = Boolean(productId && productId !== 'new')
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { profile } = useAuth()
  const { canAccessProvider, canManageListings, isViewerOnly, activeBusiness } = useBusinessAccess()
  const [form, setForm] = useState(emptyForm(profile?.region ?? ''))
  const [variants, setVariants] = useState<VariantDraft[]>([])
  const [photos, setPhotos] = useState<ListingPhotoDraft[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const { data: existing, isLoading } = useQuery({
    queryKey: ['provider-shop-product', productId],
    queryFn: () => apiFetch<ShopProductListing>(`/api/shop/provider-products/${productId}/`),
    enabled: isEdit,
  })

  useEffect(() => {
    if (!existing) return
    setForm({
      name: existing.name,
      tagline: existing.tagline ?? '',
      description: existing.description ?? '',
      category: existing.category,
      region: existing.region ?? '',
      city: existing.city ?? '',
      pickup_address: existing.pickup_address ?? '',
      price: String(existing.price ?? ''),
      price_note: existing.price_note ?? '',
      sku: existing.sku ?? '',
      stock_quantity: String(existing.stock_quantity ?? 0),
      phone: existing.phone ?? '',
      artisan_name: existing.artisan_name ?? '',
      in_stock: existing.in_stock,
      is_featured: Boolean(existing.is_featured),
      pickup_available: existing.pickup_available,
      lodge_delivery: existing.lodge_delivery,
      shipping_available: Boolean(existing.shipping_available),
      shipping_fee: String(existing.shipping_fee ?? ''),
      made_in_namibia: existing.made_in_namibia,
      is_active: Boolean(existing.is_active),
    })
    setVariants(
      (existing.variants ?? []).map((v) => ({
        label: v.label,
        price_override: v.price_override != null ? String(v.price_override) : '',
        stock_quantity: String(v.stock_quantity ?? 0),
      })),
    )
    const normalized = ((existing.photos ?? []) as ShopMediaRaw[]).map((p) =>
      typeof p === 'string' ? p : { url: p.url ?? p.image ?? '', kind: p.kind },
    )
    setPhotos(photosFromListingGallery(existing.cover_image, normalized))
  }, [existing])

  if (!profile) return <Navigate to="/login" replace />
  if (!canAccessProvider) {
    return (
      <ProviderUiPage>
        <ProviderAccessGate />
      </ProviderUiPage>
    )
  }
  if (!canManageListings || isViewerOnly) return <Navigate to="/provider/shop" replace />
  if (isEdit && isLoading) {
    return (
      <ProviderUiPage>
        <p role="status">Loading…</p>
      </ProviderUiPage>
    )
  }

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function updateVariant(index: number, key: keyof VariantDraft, value: string) {
    setVariants((prev) => prev.map((v, i) => (i === index ? { ...v, [key]: value } : v)))
  }

  function addVariant() {
    setVariants((prev) => [...prev, { label: '', price_override: '', stock_quantity: '0' }])
  }

  function removeVariant(index: number) {
    setVariants((prev) => prev.filter((_, i) => i !== index))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) {
      setErr('Product name is required.')
      return
    }
    setBusy(true)
    setErr(null)
    try {
      const body = new FormData()
      body.append('name', form.name.trim())
      body.append('tagline', form.tagline.trim())
      body.append('description', form.description.trim())
      body.append('category', form.category)
      body.append('region', form.region.trim() || activeBusiness?.region || profile?.region || '')
      body.append('city', form.city.trim())
      body.append('pickup_address', form.pickup_address.trim())
      body.append('price', form.price || '0')
      body.append('price_note', form.price_note.trim())
      body.append('sku', form.sku.trim())
      body.append('stock_quantity', form.stock_quantity || '0')
      body.append('phone', form.phone.trim())
      body.append('artisan_name', form.artisan_name.trim())
      body.append('in_stock', String(form.in_stock))
      body.append('is_featured', String(form.is_featured))
      body.append('pickup_available', String(form.pickup_available))
      body.append('lodge_delivery', String(form.lodge_delivery))
      body.append('shipping_available', String(form.shipping_available))
      body.append('shipping_fee', form.shipping_fee || '0')
      body.append('made_in_namibia', String(form.made_in_namibia))
      body.append('is_active', String(form.is_active))
      const cleanVariants = variants
        .filter((v) => v.label.trim())
        .map((v) => ({
          label: v.label.trim(),
          price_override: v.price_override.trim() === '' ? null : v.price_override.trim(),
          stock_quantity: Number(v.stock_quantity) || 0,
        }))
      body.append('variants_input', JSON.stringify(cleanVariants))

      const resolved = await resolveListingGalleryMedia(photos, { allowVideoCover: true })
      const fullMedia: ListingGalleryMediaItem[] = [...resolved.gallery]
      if (resolved.cover && !fullMedia.some((m) => m.url === resolved.cover)) {
        fullMedia.unshift({ url: resolved.cover, kind: resolved.coverKind })
      }
      const thumb = fullMedia.find((m) => m.kind === 'image')?.url ?? ''
      body.append('photos', JSON.stringify(serializeGalleryForApi(fullMedia)))
      body.append('cover_image_url', thumb)

      const url = isEdit ? `/api/shop/provider-products/${productId}/` : '/api/shop/provider-products/'
      const saved = await apiFetch<ShopProductListing>(url, {
        method: isEdit ? 'PATCH' : 'POST',
        body,
      })
      await qc.invalidateQueries({ queryKey: ['provider-shop-products'] })
      await qc.invalidateQueries({ queryKey: ['shop-products'] })
      navigate(`/shop/${saved.id}`)
    } catch (error) {
      setErr(error instanceof ApiError ? String(error.message) : 'Could not save product.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <ProviderUiPage>
      <ProviderUiHeader
        title={isEdit ? 'Edit product' : 'Add product'}
        subtitle="List a product buyers can add to their cart and purchase."
        actions={
          <Link to="/provider/shop" className="btn btn-secondary btn-sm">
            Back to shop
          </Link>
        }
      />

      <form className="prov-onboard__form" onSubmit={onSubmit}>
        <label className="prov-onboard__field">
          <span>Product name</span>
          <input value={form.name} onChange={(e) => update('name', e.target.value)} required />
        </label>

        <label className="prov-form__field">
          <span>Short line</span>
          <input value={form.tagline} onChange={(e) => update('tagline', e.target.value)} placeholder="Hand-carved wooden bowl" />
        </label>

        <label className="prov-form__field">
          <span>Category</span>
          <select value={form.category} onChange={(e) => update('category', e.target.value)}>
            {SHOP_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>

        <label className="prov-form__field">
          <span>Description</span>
          <textarea value={form.description} onChange={(e) => update('description', e.target.value)} rows={4} />
        </label>

        <div className="prov-onboard__form" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <label className="prov-form__field">
            <span>Price (NAD)</span>
            <input value={form.price} onChange={(e) => update('price', e.target.value)} inputMode="decimal" />
          </label>
          <label className="prov-form__field">
            <span>Price note</span>
            <input value={form.price_note} onChange={(e) => update('price_note', e.target.value)} placeholder="per item" />
          </label>
        </div>

        <div className="prov-onboard__form" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <label className="prov-form__field">
            <span>Stock quantity</span>
            <input
              value={form.stock_quantity}
              onChange={(e) => update('stock_quantity', e.target.value)}
              inputMode="numeric"
            />
          </label>
          <label className="prov-form__field">
            <span>SKU (optional)</span>
            <input value={form.sku} onChange={(e) => update('sku', e.target.value)} />
          </label>
        </div>

        <div className="prov-onboard__form" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <label className="prov-form__field">
            <span>Region</span>
            <input value={form.region} onChange={(e) => update('region', e.target.value)} />
          </label>
          <label className="prov-form__field">
            <span>City / town</span>
            <input value={form.city} onChange={(e) => update('city', e.target.value)} />
          </label>
        </div>

        <label className="prov-form__field">
          <span>Pickup location</span>
          <input
            value={form.pickup_address}
            onChange={(e) => update('pickup_address', e.target.value)}
            placeholder="Market stall, shop address, or meet-up point"
          />
        </label>

        <fieldset className="prov-form__field" style={{ border: 0, padding: 0, margin: 0 }}>
          <span style={{ display: 'block', marginBottom: 8, fontWeight: 700 }}>Options / variants (optional)</span>
          {variants.map((variant, index) => (
            <div
              key={index}
              style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 8, marginBottom: 8 }}
            >
              <input
                placeholder="Label (e.g. Large / Red)"
                value={variant.label}
                onChange={(e) => updateVariant(index, 'label', e.target.value)}
              />
              <input
                placeholder="Price"
                value={variant.price_override}
                onChange={(e) => updateVariant(index, 'price_override', e.target.value)}
                inputMode="decimal"
              />
              <input
                placeholder="Stock"
                value={variant.stock_quantity}
                onChange={(e) => updateVariant(index, 'stock_quantity', e.target.value)}
                inputMode="numeric"
              />
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => removeVariant(index)} aria-label="Remove variant">
                <Trash2 size={14} strokeWidth={2.25} aria-hidden />
              </button>
            </div>
          ))}
          <button type="button" className="btn btn-secondary btn-sm" onClick={addVariant}>
            <Plus size={14} strokeWidth={2.25} aria-hidden />
            Add option
          </button>
        </fieldset>

        <label className="prov-form__field">
          <span>Maker / artisan name</span>
          <input value={form.artisan_name} onChange={(e) => update('artisan_name', e.target.value)} />
        </label>

        <label className="prov-form__field">
          <span>Phone (optional)</span>
          <input value={form.phone} onChange={(e) => update('phone', e.target.value)} />
        </label>

        <div className="prov-form__field">
          <span>Photos &amp; videos</span>
          <ListingPhotoManager
            photos={photos}
            onChange={setPhotos}
            allowVideoCover
            hint="First item is the cover. Add multiple photos or short clips — buyers can open them full screen."
          />
        </div>

        {form.shipping_available ? (
          <label className="prov-form__field">
            <span>Shipping fee (NAD)</span>
            <input value={form.shipping_fee} onChange={(e) => update('shipping_fee', e.target.value)} inputMode="decimal" />
          </label>
        ) : null}

        <div className="prov-onboard__checks">
          <label>
            <input type="checkbox" checked={form.in_stock} onChange={(e) => update('in_stock', e.target.checked)} />
            In stock
          </label>
          <label>
            <input type="checkbox" checked={form.pickup_available} onChange={(e) => update('pickup_available', e.target.checked)} />
            Pickup available
          </label>
          <label>
            <input type="checkbox" checked={form.lodge_delivery} onChange={(e) => update('lodge_delivery', e.target.checked)} />
            Can deliver to lodge / hotel
          </label>
          <label>
            <input type="checkbox" checked={form.shipping_available} onChange={(e) => update('shipping_available', e.target.checked)} />
            Offer shipping
          </label>
          <label>
            <input type="checkbox" checked={form.made_in_namibia} onChange={(e) => update('made_in_namibia', e.target.checked)} />
            Made in Namibia
          </label>
          <label>
            <input type="checkbox" checked={form.is_featured} onChange={(e) => update('is_featured', e.target.checked)} />
            Feature in my shop
          </label>
          <label>
            <input type="checkbox" checked={form.is_active} onChange={(e) => update('is_active', e.target.checked)} />
            Publish on Shops
          </label>
        </div>

        {err ? <p className="prov-onboard__error">{err}</p> : null}

        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Saving…' : isEdit ? 'Save changes' : 'Create product'}
        </button>
      </form>
    </ProviderUiPage>
  )
}

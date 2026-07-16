import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch, ApiError } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { useBusinessAccess } from '../hooks/useBusinessAccess'
import { ProviderAccessGate } from '../components/provider'
import { ProviderUiHeader, ProviderUiPage } from '../components/provider/ui'
import { SHOP_CATEGORIES } from '../utils/shopDisplay'
import type { ShopProductListing } from '../utils/shopListing'

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
  phone: '',
  artisan_name: '',
  in_stock: true,
  pickup_available: true,
  lodge_delivery: false,
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
  const [coverFile, setCoverFile] = useState<File | null>(null)
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
      phone: existing.phone ?? '',
      artisan_name: existing.artisan_name ?? '',
      in_stock: existing.in_stock,
      pickup_available: existing.pickup_available,
      lodge_delivery: existing.lodge_delivery,
      made_in_namibia: existing.made_in_namibia,
      is_active: Boolean(existing.is_active),
    })
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
      body.append('phone', form.phone.trim())
      body.append('artisan_name', form.artisan_name.trim())
      body.append('in_stock', String(form.in_stock))
      body.append('pickup_available', String(form.pickup_available))
      body.append('lodge_delivery', String(form.lodge_delivery))
      body.append('made_in_namibia', String(form.made_in_namibia))
      body.append('is_active', String(form.is_active))
      if (coverFile) body.append('cover_image_upload', coverFile)

      const url = isEdit
        ? `/api/shop/provider-products/${productId}/`
        : '/api/shop/provider-products/'
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
        subtitle="Pickup-first listings — travellers message you to arrange collection."
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

        <label className="prov-form__field">
          <span>Maker / artisan name</span>
          <input value={form.artisan_name} onChange={(e) => update('artisan_name', e.target.value)} />
        </label>

        <label className="prov-form__field">
          <span>Phone (optional)</span>
          <input value={form.phone} onChange={(e) => update('phone', e.target.value)} />
        </label>

        <label className="prov-form__field">
          <span>Cover photo</span>
          <input type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)} />
        </label>

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
            <input type="checkbox" checked={form.made_in_namibia} onChange={(e) => update('made_in_namibia', e.target.checked)} />
            Made in Namibia
          </label>
          <label>
            <input type="checkbox" checked={form.is_active} onChange={(e) => update('is_active', e.target.checked)} />
            Publish on Local shops
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

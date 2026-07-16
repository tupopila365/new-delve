import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ShoppingBag } from 'lucide-react'
import { apiFetch } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { useBusinessAccess } from '../hooks/useBusinessAccess'
import { ShopDetailView } from '../components/shop/ShopDetailView'
import { EmptyState } from '../components/ui'
import type { ShopProductListing } from '../utils/shopListing'

export function ShopDetail() {
  const { id } = useParams()
  const { profile } = useAuth()
  const { canManageListings } = useBusinessAccess()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['shop-product', id],
    enabled: Boolean(id),
    queryFn: async (): Promise<ShopProductListing | null> => {
      const raw = await apiFetch<unknown>(`/api/shop/products/${id}/`, { auth: false })
      if (raw && typeof raw === 'object' && 'id' in raw) {
        const candidate = raw as { id?: unknown }
        if (candidate.id !== undefined) return raw as ShopProductListing
      }
      return null
    },
  })

  const { data: relatedProducts = [] } = useQuery({
    queryKey: ['shop-products-by-owner', data?.owner_username, id],
    enabled: Boolean(data?.owner_username),
    queryFn: async (): Promise<ShopProductListing[]> => {
      const params = new URLSearchParams({ owner_username: data!.owner_username })
      const raw = await apiFetch<unknown>(`/api/shop/products/?${params.toString()}`, { auth: false })
      const rows = Array.isArray(raw)
        ? (raw as ShopProductListing[])
        : raw && typeof raw === 'object' && Array.isArray((raw as { results?: unknown[] }).results)
          ? ((raw as { results: ShopProductListing[] }).results ?? [])
          : []
      return rows.filter((row) => String(row.id) !== String(id)).slice(0, 6)
    },
  })

  const isOwner = useMemo(() => {
    if (!profile || !data) return false
    return data.owner_username === profile.username
  }, [profile, data])

  if (isLoading) {
    return (
      <main className="shop-detail">
        <p role="status">Loading…</p>
      </main>
    )
  }

  if (isError || !data) {
    return (
      <main className="shop-detail">
        <EmptyState
          iconElement={<ShoppingBag size={28} strokeWidth={2} aria-hidden />}
          title="Product not found"
          sub="It may have been removed or is not published yet."
          cta={{ label: 'Browse shops', to: '/shop' }}
        />
      </main>
    )
  }

  const messageHref = `/messages/u/${encodeURIComponent(data.owner_username)}`

  return (
    <ShopDetailView
      product={data}
      relatedProducts={relatedProducts}
      messageHref={messageHref}
      editHref={isOwner && canManageListings ? `/provider/shop/${data.id}/edit` : undefined}
    />
  )
}

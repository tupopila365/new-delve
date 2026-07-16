import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '../api/client'
import { useExploreRegion } from '../hooks/useExploreRegion'
import { ShopListingCard } from '../components/shop/ShopListingCard'
import { SHOP_CATEGORIES } from '../utils/shopDisplay'
import type { ShopProductListing } from '../utils/shopListing'
import { EmptyState, ListSkeleton } from '../components/ui'
import { MapPin, Search, ShoppingBag, X } from 'lucide-react'
import '../components/shop/shop-list.css'

export function ShopList() {
  const { region } = useExploreRegion()
  const [category, setCategory] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [inStockOnly, setInStockOnly] = useState(false)
  const [madeInNamibiaOnly, setMadeInNamibiaOnly] = useState(false)
  const activeCategoryLabel = SHOP_CATEGORIES.find((c) => c.value === category)?.label ?? ''

  useEffect(() => {
    const t = window.setTimeout(() => setSearch(searchInput.trim()), 350)
    return () => window.clearTimeout(t)
  }, [searchInput])

  const query = useMemo(() => {
    const params = new URLSearchParams()
    if (region) params.set('region', region)
    if (category) params.set('category', category)
    if (search) params.set('search', search)
    if (inStockOnly) params.set('in_stock', 'true')
    if (madeInNamibiaOnly) params.set('made_in_namibia', 'true')
    const qs = params.toString()
    return qs ? `?${qs}` : ''
  }, [region, category, search, inStockOnly, madeInNamibiaOnly])

  const { data: products = [], isLoading, isError } = useQuery({
    queryKey: ['shop-products', region, category, search, inStockOnly, madeInNamibiaOnly],
    queryFn: async (): Promise<ShopProductListing[]> => {
      const raw = await apiFetch<unknown>(`/api/shop/products/${query}`, { auth: false })
      // DRF can return either a plain list or a paginated `{ results: [...] }`.
      if (Array.isArray(raw)) return raw as ShopProductListing[]
      if (raw && typeof raw === 'object' && Array.isArray((raw as { results?: unknown }).results)) {
        return (raw as { results: ShopProductListing[] }).results
      }
      // In mock mode, unhandled endpoints often return `{ detail: "Mock: unhandled ..." }`.
      return []
    },
  })

  const sortedProducts = useMemo(() => {
    const list = [...products]
    // "Focus" signals for social discovery: in-stock, made-in-Namibia, and recent.
    const score = (p: ShopProductListing) => {
      const created = p.created_at ? Number(new Date(p.created_at).getTime()) : 0
      const recencyBoost = created ? Math.max(0, 1_000_000_000 - created / 1_000_000_000) : 0
      return (
        (p.in_stock ? 4 : 0) +
        (p.made_in_namibia ? 3 : 0) +
        (p.pickup_available ? 1 : 0) +
        Math.min(2, recencyBoost)
      )
    }
    list.sort((a, b) => score(b) - score(a))
    return list
  }, [products])

  const focusedIds = useMemo(() => {
    return new Set(sortedProducts.slice(0, 4).map((p) => p.id))
  }, [sortedProducts])

  const activeFilters = useMemo(() => {
    const chips: Array<{ key: string; label: string; onClear: () => void }> = []
    if (category) {
      chips.push({
        key: 'category',
        label: activeCategoryLabel,
        onClear: () => setCategory(''),
      })
    }
    if (search) {
      chips.push({
        key: 'search',
        label: `“${search}”`,
        onClear: () => {
          setSearchInput('')
          setSearch('')
        },
      })
    }
    if (inStockOnly) chips.push({ key: 'in_stock', label: 'In stock', onClear: () => setInStockOnly(false) })
    if (madeInNamibiaOnly)
      chips.push({ key: 'made_in_namibia', label: 'Made in Namibia', onClear: () => setMadeInNamibiaOnly(false) })
    return chips
  }, [activeCategoryLabel, category, inStockOnly, madeInNamibiaOnly, search])

  return (
    <main className="shop-market">
      <header className="shop-market__hero">
        <p className="shop-market__kicker">Retail marketplace</p>
        <h1 className="shop-market__title">Local shops</h1>
        <p className="shop-market__lead">
          Crafts, souvenirs, and travel goods from local makers and small retailers.
        </p>
        {region ? (
          <p className="shop-market__region">
            <MapPin size={14} strokeWidth={2.25} aria-hidden />
            Showing items near {region}
          </p>
        ) : null}

        <div className="shop-market__find">
          <label className="shop-market__search" htmlFor="shop-search">
            <Search size={18} strokeWidth={2.25} aria-hidden />
            <input
              id="shop-search"
              type="search"
              placeholder="What are you looking for? e.g. crafts, spice set…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              aria-label="Search shop products"
            />
            {searchInput ? (
              <button
                type="button"
                className="shop-market__search-clear"
                onClick={() => {
                  setSearchInput('')
                  setSearch('')
                }}
                aria-label="Clear search"
              >
                <X size={14} strokeWidth={2.5} aria-hidden />
              </button>
            ) : null}
          </label>
        </div>
      </header>

      <section className="shop-market__section">
        <div className="shop-market__section-head">
          <div>
            <h2 className="shop-market__section-title">Browse by category</h2>
            <p className="shop-market__section-sub">Pickup-first products you can message sellers about.</p>
          </div>
        </div>
        <div className="shop-market__filters" role="toolbar" aria-label="Shop categories">
          <button
            type="button"
            className={`shop-market__chip${category === '' ? ' is-active' : ''}`}
            onClick={() => setCategory('')}
          >
            All products
          </button>
          {SHOP_CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              className={`shop-market__chip${category === c.value ? ' is-active' : ''}`}
              onClick={() => setCategory(c.value)}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="shop-market__filters shop-market__filters--sub" role="toolbar" aria-label="Shop focus filters">
          <button
            type="button"
            className={`shop-market__chip${inStockOnly ? ' is-active' : ''}`}
            onClick={() => setInStockOnly((v) => !v)}
          >
            In stock
          </button>
          <button
            type="button"
            className={`shop-market__chip${madeInNamibiaOnly ? ' is-active' : ''}`}
            onClick={() => setMadeInNamibiaOnly((v) => !v)}
          >
            Made in Namibia
          </button>
        </div>
      </section>

      {activeFilters.length > 0 ? (
        <div className="shop-market__active">
          {activeFilters.map((f) => (
            <button key={f.key} type="button" className="shop-market__active-pill" onClick={f.onClear}>
              {f.label}
              <X size={13} strokeWidth={2.5} aria-hidden />
            </button>
          ))}
          <button
            type="button"
            className="shop-market__clear"
            onClick={() => {
              setCategory('')
              setSearchInput('')
              setSearch('')
              setInStockOnly(false)
              setMadeInNamibiaOnly(false)
            }}
          >
            Clear all
          </button>
        </div>
      ) : null}

      {isLoading ? (
        <ListSkeleton count={6} variant="card" />
      ) : isError ? (
        <EmptyState
          iconElement={<ShoppingBag size={28} strokeWidth={2} aria-hidden />}
          title="Could not load shops"
          sub="Check your connection and try again."
        />
      ) : products.length === 0 ? (
        <EmptyState
          iconElement={<ShoppingBag size={28} strokeWidth={2} aria-hidden />}
          title="No products yet"
          sub={region ? `Nothing listed in ${region} right now. Try another region or check back soon.` : 'Makers and shops can list here soon.'}
        />
      ) : (
        <>
          <div className="shop-market__results-bar">
            <p className="shop-market__count">
              <strong>{sortedProducts.length}</strong> product{sortedProducts.length === 1 ? '' : 's'} found
            </p>
          </div>
          <div className="shop-grid">
            {sortedProducts.map((product) => (
              <ShopListingCard key={product.id} product={product} focused={focusedIds.has(product.id)} />
            ))}
          </div>
        </>
      )}
    </main>
  )
}

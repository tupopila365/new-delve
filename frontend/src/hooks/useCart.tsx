import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import type { Cart, ShopProductListing } from '../utils/shopListing'
import {
  clearGuestCart,
  guestCartToCart,
  mergePayloadFromGuest,
  readGuestCartLines,
  upsertGuestLine,
  writeGuestCartLines,
  type GuestCartLine,
} from '../utils/guestCart'

type AddOptions = {
  variant?: number | null
  quantity?: number
  /** Needed so guest carts can render before login merges to the API. */
  listing?: ShopProductListing
}

type CartState = {
  cart: Cart | null
  itemCount: number
  isLoading: boolean
  requiresAuth: boolean
  isGuest: boolean
  addItem: (productId: number, opts?: AddOptions) => Promise<void>
  setQuantity: (itemId: number, quantity: number) => void
  removeItem: (itemId: number) => void
  refetch: () => void
}

const CartContext = createContext<CartState | null>(null)

const CART_KEY = ['shop-cart'] as const

export function CartProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const enabled = Boolean(profile)
  const [guestLines, setGuestLines] = useState<GuestCartLine[]>(() => readGuestCartLines())
  const [mergedForUser, setMergedForUser] = useState<string | null>(null)

  const { data, isLoading, refetch } = useQuery({
    queryKey: [...CART_KEY, profile?.username ?? ''],
    enabled,
    queryFn: () => apiFetch<Cart>('/api/shop/cart/'),
  })

  const invalidate = useCallback(() => {
    void qc.invalidateQueries({ queryKey: CART_KEY })
  }, [qc])

  // Push guest lines into the authenticated cart once after login.
  useEffect(() => {
    if (!profile) {
      setMergedForUser(null)
      return
    }
    if (mergedForUser === profile.username) return
    const lines = readGuestCartLines()
    if (lines.length === 0) {
      setMergedForUser(profile.username)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const fresh = await apiFetch<Cart>('/api/shop/cart/merge/', {
          method: 'POST',
          body: JSON.stringify(mergePayloadFromGuest(lines)),
        })
        if (cancelled) return
        clearGuestCart()
        setGuestLines([])
        qc.setQueryData([...CART_KEY, profile.username], fresh)
        invalidate()
      } catch {
        // Keep guest lines; user can still browse and retry after a refresh.
      } finally {
        if (!cancelled) setMergedForUser(profile.username)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [profile, mergedForUser, qc, invalidate])

  const addMut = useMutation({
    mutationFn: ({ productId, opts }: { productId: number; opts?: AddOptions }) =>
      apiFetch<Cart>('/api/shop/cart/', {
        method: 'POST',
        body: JSON.stringify({
          product: productId,
          variant: opts?.variant ?? null,
          quantity: opts?.quantity ?? 1,
        }),
      }),
    onSuccess: (fresh) => {
      qc.setQueryData([...CART_KEY, profile?.username ?? ''], fresh)
      invalidate()
    },
  })

  const patchMut = useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: number; quantity: number }) =>
      apiFetch<Cart>(`/api/shop/cart/items/${itemId}/`, {
        method: 'PATCH',
        body: JSON.stringify({ quantity }),
      }),
    onSuccess: (fresh) => {
      qc.setQueryData([...CART_KEY, profile?.username ?? ''], fresh)
      invalidate()
    },
  })

  const removeMut = useMutation({
    mutationFn: (itemId: number) =>
      apiFetch<Cart>(`/api/shop/cart/items/${itemId}/`, { method: 'DELETE' }),
    onSuccess: (fresh) => {
      qc.setQueryData([...CART_KEY, profile?.username ?? ''], fresh)
      invalidate()
    },
  })

  const addItem = useCallback(
    async (productId: number, opts?: AddOptions) => {
      if (!profile) {
        if (!opts?.listing) {
          navigate('/login')
          return
        }
        const next = upsertGuestLine(guestLines, opts.listing, {
          variant: opts.variant,
          quantity: opts.quantity,
        })
        writeGuestCartLines(next)
        setGuestLines(next)
        return
      }
      await addMut.mutateAsync({ productId, opts })
    },
    [addMut, guestLines, navigate, profile],
  )

  const setQuantity = useCallback(
    (itemId: number, quantity: number) => {
      if (!profile) {
        const next = guestLines
          .map((line, index) => {
            if (-(index + 1) !== itemId) return line
            return { ...line, quantity: Math.max(0, Math.min(99, quantity)) }
          })
          .filter((line) => line.quantity > 0)
        writeGuestCartLines(next)
        setGuestLines(next)
        return
      }
      patchMut.mutate({ itemId, quantity })
    },
    [guestLines, patchMut, profile],
  )

  const removeItem = useCallback(
    (itemId: number) => {
      if (!profile) {
        const next = guestLines.filter((_, index) => -(index + 1) !== itemId)
        writeGuestCartLines(next)
        setGuestLines(next)
        return
      }
      removeMut.mutate(itemId)
    },
    [guestLines, profile, removeMut],
  )

  const guestCart = useMemo(() => guestCartToCart(guestLines), [guestLines])
  const cart = profile ? (data ?? null) : guestCart
  const itemCount = cart?.item_count ?? 0

  const value = useMemo<CartState>(
    () => ({
      cart,
      itemCount,
      isLoading: enabled ? isLoading : false,
      requiresAuth: false,
      isGuest: !profile,
      addItem,
      setQuantity,
      removeItem,
      refetch: () => void refetch(),
    }),
    [addItem, cart, enabled, isLoading, itemCount, profile, refetch, removeItem, setQuantity],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart outside CartProvider')
  return ctx
}

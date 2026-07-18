import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import type { Cart } from '../utils/shopListing'

type AddOptions = { variant?: number | null; quantity?: number }

type CartState = {
  cart: Cart | null
  itemCount: number
  isLoading: boolean
  requiresAuth: boolean
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

  const { data, isLoading, refetch } = useQuery({
    queryKey: [...CART_KEY, profile?.username ?? ''],
    enabled,
    queryFn: () => apiFetch<Cart>('/api/shop/cart/'),
  })

  const invalidate = useCallback(() => {
    void qc.invalidateQueries({ queryKey: CART_KEY })
  }, [qc])

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
        navigate('/login')
        return
      }
      await addMut.mutateAsync({ productId, opts })
    },
    [addMut, navigate, profile],
  )

  const setQuantity = useCallback(
    (itemId: number, quantity: number) => {
      patchMut.mutate({ itemId, quantity })
    },
    [patchMut],
  )

  const removeItem = useCallback(
    (itemId: number) => {
      removeMut.mutate(itemId)
    },
    [removeMut],
  )

  const value = useMemo<CartState>(
    () => ({
      cart: data ?? null,
      itemCount: data?.item_count ?? 0,
      isLoading,
      requiresAuth: !profile,
      addItem,
      setQuantity,
      removeItem,
      refetch: () => void refetch(),
    }),
    [addItem, data, isLoading, profile, refetch, removeItem, setQuantity],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart outside CartProvider')
  return ctx
}

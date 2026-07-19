/**
 * Shop manage shell — ink/cream neutrals only (no purple / terracotta / status greens).
 * `.shop-manage--light` = standalone /shop/manage
 * `.shop-manage--dark`  = embedded in provider dashboard (still neutral)
 *
 * Tokens: `styles/manage-tokens.css` via `.manage-theme`.
 */
import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import '../provider/ui/provider-ui.css'
import './shop-manage.css'

type Props = {
  children: ReactNode
}

export function ShopManageShell({ children }: Props) {
  const { pathname } = useLocation()
  const light = pathname.startsWith('/shop/manage') || pathname.startsWith('/provider/shop')

  return (
    <div
      className={`manage-theme shop-manage${light ? ' shop-manage--light manage-theme--light' : ' shop-manage--dark'}`}
    >
      <div className="shop-manage__inner prov-ui">{children}</div>
    </div>
  )
}

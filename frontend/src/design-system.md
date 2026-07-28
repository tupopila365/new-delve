# DELVE Design System

Premium travel-social marketplace UI. Warm ivory backgrounds, soft cards, violet CTAs.

## Surfaces

The app renders on one of two surfaces, set by `AppLayout` on `<html data-surface>`
and defined in [`styles/surface.css`](styles/surface.css). Both drive the same
`--home-*` token names, so components never need to know which one they're on.

| Surface | Where | Canvas |
|---------|-------|--------|
| `light` | Home (more transactional routes to follow) | ivory `#f4eee4` |
| `dark` | Everything else — permanently the Delvers feed, stories and the create studio | `#12100e` |

## Packages

- **Detail pages** — [`components/detail/`](components/detail/README.md)
- **List / dashboard UI** — [`components/ui/`](components/ui/)
- **Marketplace / discovery** — [`components/marketplace/`](components/marketplace/)

## Tokens (`index.css` `:root`)

| Token | Purpose |
|-------|---------|
| `--bg`, `--bg-elevated` | Page and card backgrounds |
| `--text`, `--text-secondary`, `--text-tertiary` | Typography |
| `--accent`, `--accent-hover` | Primary CTAs |
| `--nature` | Success / confirmed states |
| `--radius-sm/md/lg` | Border radius scale |
| `--shadow-sm/md` | Elevation |
| `--detail-max-width` | Detail page max width (1180px) |
| `--detail-sidebar-width` | Sticky action card column (360px) |
| `--detail-section-radius` | Section cards (30px) |
| `--mobile-cta-offset` | Bottom padding when sticky CTA visible |
| `--home-ink`, `--home-ink-rgb`, `--home-on-ink` | Surface-aware foreground |
| `--home-canvas`, `--home-surface`, `--home-surface-raised` | Surface-aware backgrounds |
| `--home-title-hero/section/rail` | Three-level home type scale |

## Buttons

Use `.btn` + `.btn-primary` / `.btn-ghost` / `.btn-block` for all primary actions.

## Empty & loading

- `EmptyState` — icon, title, subtitle, optional CTA
- `ListSkeleton` — horizontal rail of placeholder cards
- `DetailSkeleton` — detail page hero placeholder

## Visual language

- Cards: white/ivory, `1px solid rgba(28,20,16,0.06)`, radius 28–34px, soft shadow
- Sections: padding 24px, calm spacing between blocks
- Public pages: visual, social, discovery-focused
- Provider/admin: operational; reuse tokens, not detail layouts

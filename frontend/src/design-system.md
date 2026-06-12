# DELVE Design System

Premium travel-social marketplace UI. Warm ivory backgrounds, soft cards, coral CTAs.

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

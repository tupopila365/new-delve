# DELVE Detail Components

Premium detail-page building blocks. **FoodDetail** is the reference implementation.

## Page rhythm

```
DetailPage
  DetailHeroWrap (gallery + back + save/share)
  Identity card (page-specific — title, meta, rating)
  TrustBadgeRow (optional)
  SocialActionRow
  DetailLayout
    main: DetailSection blocks, DelversMoments, CommentBox
    sidebar: DetailActionCard (booking / reserve / tickets)
  MobileStickyCTA
```

## Components

| Component | Use when |
|-----------|----------|
| `DetailPage` | Root wrapper; pass `prefix` (`fd-detail`, `acc-detail`, etc.) and optional `toast` |
| `DetailSkeleton` | Loading placeholder |
| `DetailHeroWrap` | Gallery hero with back link and save/share actions |
| `DetailLayout` | Two-column main + sticky sidebar; collapses on mobile |
| `DetailSection` | Titled content block inside a premium card |
| `DetailSectionHead` | Section title + subtitle + optional link action |
| `DetailActionCard` | Sticky sidebar CTA card (book, reserve, tickets) |
| `SocialActionRow` | Save, share, and custom actions (message, ask) |
| `TrustBadgeRow` | Verified, open now, licensed, seats left, etc. |
| `DelversMoments` | Social proof grid from traveller posts |
| `CommentBox` | Questions, tips, local discussion |
| `MobileStickyCTA` | Fixed bottom bar on viewports ≤900px |

## Mobile rules

- Sidebars hide below 900px; `MobileStickyCTA` shows instead.
- Pages with a mobile CTA need `padding-bottom: var(--mobile-cta-offset)` (applied via `.dl-detail` aliases).
- Hero galleries should not exceed ~60vh on small screens (page-specific CSS).

## CTA labels

| Vertical | Sidebar | Mobile |
|----------|---------|--------|
| Food | Reserve table / Get directions | Directions |
| Stays | Reserve stay | Reserve |
| Events | Get tickets | Tickets |
| Guides | Request booking | Request |
| Transport (vehicle) | Reserve vehicle | Reserve |
| Transport (bus) | Book seat | Book seat |
| Journeys | Start planning | Save route |

## CSS

Shared styles live under `.dl-detail__*` in `index.css`. Page prefixes (`fd-`, `acc-`, `evd-`, `tp-`, `gd-`, `td-`) alias to the same rules.

Design tokens: `--detail-max-width`, `--detail-sidebar-width`, `--detail-section-radius`, `--mobile-cta-offset`.

## Provider / admin

Do **not** use the full detail rhythm on provider or admin pages. Reuse tokens and `.btn` only.

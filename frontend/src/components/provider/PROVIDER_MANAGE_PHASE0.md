# Provider Manage UI — Phase 0 design contract

Locked choices for the service-provider admin redesign to match Shop manage styling.

## Goals

- One visual language for `/provider/*` and Shop manage (`ShopManageShell`).
- Light cream surface everywhere in provider (not the current dark purple shell).
- Lucide icons only — never emoji in chrome, shortcuts, or category strips.
- Phased rollout: shell → core pages → vertical modules → forms → QA.

## Source of truth

| Asset | Path |
| --- | --- |
| Tokens | `frontend/src/styles/manage-tokens.css` (`.manage-theme`) |
| Icon map | `frontend/src/components/provider/manageIcons.ts` |
| Shop reference | `frontend/src/components/shop/shop-manage.css` + `ShopManageShell.tsx` |

Shop keep using `--sm-*` aliases (same values as `--manage-*`). Provider Phase 1+ should set `manage-theme manage-theme--light` on the shell.

## Tokens (do not fork)

| Token | Value | Use |
| --- | --- | --- |
| `--manage-ink` | `#1a1814` | Text, primary buttons |
| `--manage-ink-soft` | `#3d3933` | Secondary text |
| `--manage-muted` | `#6f695f` | Meta / hints |
| `--manage-line` | `#ddd6ca` | Borders |
| `--manage-line-soft` | `#ebe6dc` | Dividers |
| `--manage-cream` | `#f4f1ea` | Page background |
| `--manage-paper` | `#faf8f4` | Soft panels / accent stats |
| `--manage-card` | `#ffffff` | Cards |
| `--manage-chip` | `#efeae1` | Chips / pills |
| `--manage-shadow` | hairline ink shadow | Card lift |
| `--manage-radius` | `14px` | Cards |
| `--manage-radius-sm` | `10px` | Buttons, inputs, media |

### Forbidden accents

- No purple (`#a78bfa` and variants)
- No terracotta / warm-orange status accents as “brand”
- No emoji
- No multi-layer neon glow

Status meaning (ok / warn / bad) may use restrained ink scales or soft chip contrast — prefer solid ink for the “active / done” chip (as Shop fulfilled status), not rainbow greens/purples.

## Layout

| Region | Max width | Token / class |
| --- | --- | --- |
| Provider content (lists, bookings, reviews, analytics) | **920px** | `--manage-content-max` / `.manage-theme__content` |
| Long forms / multi-step editors | **720px** | `--manage-form-max` / `.manage-theme__form` |
| Shop manage column (standalone) | 720px (unchanged for now) | `.shop-manage__inner` |

Page vertical rhythm: `--manage-page-gap` (~22px). Section gap: `--manage-section-gap` (~20px).

Sidebar can stay full-height beside content; only the main column uses the max-widths above.

## Component patterns

### 1. Page header

- Title: `--manage-title-size`, weight ~800–850, tracking `--manage-title-tracking`
- One short subtitle in `--manage-muted`
- Primary + ghost actions on the right (or under title on mobile)
- Map to: `ProviderUiHeader` restyled in Phase 1

### 2. Stats

- 2-col mobile, up to 4-col desktop
- White card, 1px `--manage-line`, `--manage-shadow`
- Accent stat uses `--manage-paper` background (not purple)
- Strong number in ink; label muted

### 3. Filter chips

- Pill shape, chip background + soft border
- Active: solid ink fill, paper text (same as Shop order filters)

### 4. Cards / list rows

- White card, `--manage-radius`, hairline border
- Optional media thumb with `--manage-radius-sm` and chip fill placeholder
- Title ink; meta muted; actions row of primary/ghost buttons

### 5. Empty states

- Centered card, short title + one sentence + optional CTA
- Optional Lucide icon at `MANAGE_ICON_SIZE.empty` in ink-soft — no emoji

### 6. Forms

- Constrained to `--manage-form-max`
- Inputs: paper fill, line border, 10px radius
- Labels muted/meta size
- Primary submit = ink fill

### 7. Tables / dense lists (bookings)

- Prefer card rows on mobile; on wider screens may use tighter rows inside 920px
- Same borders/typography as cards — do not introduce a second grid system

## Icon map (Lucide)

From `manageIcons.ts`:

| Module | Icon |
| --- | --- |
| Stays | `Hotel` |
| Guides | `Compass` |
| Transport | `Car` (+ `Bus` where trip-specific) |
| Food & drink | `Utensils` |
| Shop | `ShoppingBag` |
| Events | `Ticket` |

| Nav | Icon |
| --- | --- |
| Overview | `LayoutDashboard` |
| Listings | `ClipboardList` |
| Promotions | `TrendingUp` |
| Bookings | `CalendarDays` |
| Questions | `Inbox` |
| Messages | `MessageSquare` |
| Reviews | `Star` |
| Analytics | `TrendingUp` |
| Settings | `Settings` |

Default stroke: `2.25`. Nav/module size: `18`.

## Visual checklist (acceptance)

Use this before merging any Provider UI PR:

- [x] Shell uses cream background (`manage-theme--light`)
- [x] Primary buttons are ink, not purple/gradient
- [x] No emoji in nav, shortcuts, empty states, or section titles
- [x] Icons come from `manageIcons.ts` (or Lucide matching that map)
- [x] Content column ≤ 920px; forms ≤ 720px where applicable
- [x] Cards/chips/borders use manage tokens only
- [ ] Shop manage still looks unchanged aside from shared token wiring *(spot-check)*
- [ ] Side-by-side with `/provider/shop` or Shop manage: same neutrals *(needs logged-in click-through)*

## Phase map

| Phase | Scope |
| --- | --- |
| **0** | This contract + tokens + icon map *(done)* |
| **1** | `ProviderLayout` + shared `prov-ui` restyle to manage-theme; purge emoji helpers *(done)* |
| **2** | Core pages: dashboard, listings, bookings, messages, reviews, questions, analytics, promotions, settings *(done)* |
| **3** | Verticals: stays → guides → transport → food → events → shop polish *(CSS retoken done)* |
| **4** | Forms, publish bars, onboarding *(onboarding cream shell done; forms share retokened listing CSS)* |
| **5** | Mobile QA + emoji/★ sweep *(code sweep done; browser QA blocked on login)* |

## Explicitly out of Phase 0

- Restyling ProviderLayout or module pages (Phase 1+)
- Changing backend APIs
- Redesigning traveler-facing listing detail pages

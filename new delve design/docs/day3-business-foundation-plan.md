# Day 3 — Business / Provider Foundation Plan

## Inspection summary

| Item | Finding |
|------|---------|
| User | Exists (`User`); platform `UserRole`: `traveler` \| `admin` only |
| TravelerProfile | Exists; not a business profile |
| Business / BusinessMember | **Do not exist** |
| Auth | JWT Bearer → `requireAuth` → `req.userId` (`sub`) |
| API | `/api/v2` modules: auth, users, media, social, admin |
| Media | `businessId` columns reserved; `business_profile` purpose blocked (`notYetAvailable`) |
| Frontend | Mock `BusinessAdminPage` overlay; marketing `/become-a-provider`; no business API client |

## A. Reuse

- Same `User` identity (no provider login)
- Keep `UserRole` as traveler/admin; access via `BusinessMember`
- `authorizedJson` / Cloudinary media pipeline
- Module pattern: routes → controller → service → Prisma
- Contracts Zod + Vitest mocks

## B. Migration

Add enums `BusinessStatus`, `BusinessMemberRole`.
Add models `Business`, `BusinessMember` (`@@unique([userId, businessId])`).
Optional FK: `MediaAsset.businessId` → `Business`.
New business `status = DRAFT` (never auto-VERIFIED).

## C. API

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| POST | `/api/v2/businesses` | requireAuth | Create + OWNER membership; ignore owner/role/status from body |
| GET | `/api/v2/businesses/me` | requireAuth | Memberships + businesses |
| GET | `/api/v2/businesses/:id` | requireAuth (dashboard) | Member can read; public later |
| PATCH | `/api/v2/businesses/:id` | requireAuth | OWNER \| MANAGER only; no status/role escalation |

## D. Frontend

- `src/api/businessClient.ts`
- `src/pages/ProviderBusinessPage.tsx` (create / view / edit)
- Wire `/provider` in `navigation.ts` + `App.tsx`
- Account “Business dashboard” → `/provider`
- Leave mock admin for later features

## E. Authorization

- Membership lookup; role allow-lists in service
- Create: any verified authenticated user
- Edit: OWNER, MANAGER
- CONTENT_EDITOR: membership only (no profile edit yet)
- Media `business_profile`: require `businessId` + OWNER\|MANAGER
- Schemas `.strict()` — no `role`, `ownerUserId`, `status` on create/update

## F. Steps

1. Prisma schema + migrate
2. Contracts `business.ts`
3. API module + mount
4. Unlock `business_profile` media with membership check
5. Vitest authorization tests
6. Frontend client + Provider page + nav wiring

Out of scope: listings, deals, invites, admin verification UI, payouts, analytics.

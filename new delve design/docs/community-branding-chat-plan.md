# Community branding, members, and group chat — implementation plan

Scope: four community features in the Delve traveler app.

1. Community banner/cover image upload
2. Community avatar/profile image upload
3. Community group chat for members
4. Better member visibility (Members already exists; enhance)

Ship order is Phase 1 → 4. Phases 1 and 2 are frontend-only and unblock design/QA immediately. Phases 3 and 4 are the group chat vertical slice and must ship together (backend then frontend, one migration).

---

## Decisions made up front (do not re-litigate)

- **Branding needs no schema or API work.** `Community.avatarUrl` / `Community.coverUrl` exist and `PATCH /communities/:communityId` already accepts both (`updateCommunityBodySchema` is `createCommunityBodySchema.partial().omit({ slug: true })`, and both fields are `.url().optional().nullable()`).
- **Upload path is Media Studio with `initialContext="community"`.** `purposeForStudioContext('community')` returns `'post'` (`src/media-studio/publishPostMedia.ts`). Do **not** use media purposes `avatar` or `cover`: `ensureProfileAndLinkMedia` in `apps/api/src/modules/media/media.service.ts` writes those straight onto the uploader's `TravelerProfile`, so a community banner would silently replace the owner's personal cover.
- **Group chat clones the journey conversation path**, including lazy participant join on open. Do not backfill all existing members as participants.
- **Chat requires an active `JOINED` membership**, which is stricter than the view permission used by `getCommunityDetail`.
- **Branding editing requires ADMIN+**, matching `canManageCommunity` (= `isAdminPlus`) which the existing PATCH endpoint already enforces. Moderators get moderation tools, not branding.

---

## Phase 1 — Community avatar + cover upload

Frontend only. No migration, no API change.

### Files to touch

| File | Change |
| --- | --- |
| `src/components/communities/CommunityBrandingEditor.tsx` | **New.** Avatar + cover upload panel. |
| `src/pages/CommunityDetailPage.tsx` | Render the editor at the top of the Manage tab; refresh `community` state on save. |
| `src/components/communities/CreateCommunitySheet.tsx` | Optional branding step before create. |

### `CommunityBrandingEditor.tsx`

Props: `community: CommunityDetail`, `onUpdated: (next: CommunityDetail) => void`.

Two independent rows, each with its own `open` state and its own `MediaStudio` instance (Media Studio resets all internal state on `open`, so one shared instance cannot serve both slots):

```tsx
<MediaStudio
  open={avatarStudioOpen}
  onClose={() => setAvatarStudioOpen(false)}
  initialContext="community"
  lockContext
  onMediaReady={(assets: MediaAssetDto[]) => {
    const url = assets[0]?.delivery?.url
    setAvatarStudioOpen(false)
    if (url) void save({ avatarUrl: url })
  }}
/>
```

`save` calls `updateCommunity(community.id, patch)` from `src/api/communityClient.ts`, which returns the full `CommunityDetail`; pass it to `onUpdated`. Follow the `JourneyEditorSheet` cover pattern (`src/components/journeys/JourneyEditorSheet.tsx`, lines ~400–430 and ~719–732) for button copy and the replace/remove pair.

Behaviour:

- Avatar preview: 64×64 rounded square, matching the header treatment. Cover preview: full-width 16:9.
- Each row has `Upload` / `Replace` and, when a URL is set, `Remove` (PATCH with `null` — the contract allows it).
- One `busy` flag per slot, inline error text on failure, no optimistic mutation of the parent (wait for the PATCH result so the URL is always the persisted one).
- Only reject at the UI level for obviously wrong things; Media Studio + `validateLocalFile` already enforce type and size for `purpose: 'post'`.

### Manage tab placement

In `CommunityDetailPage.tsx`, inside the existing `{tab === 'manage' && canModerate && (...)}` block, add the editor **above** `CommunityRulesEditor`, gated on `community.canManage` (not `canModerate`):

```tsx
{community.canManage && (
  <CommunityBrandingEditor community={community} onUpdated={setCommunity} />
)}
```

### Create flow

In `CreateCommunitySheet.tsx`, add a collapsed "Branding (optional)" section holding the same two Media Studio slots, storing `avatarUrl` / `coverUrl` in local state and passing them into the existing `CreateCommunityBody` (both fields are already accepted by `createCommunity`). If the user skips it, nothing changes. After a successful create, the sheet already calls `onCreated(id)`; no extra nudge UI needed since the new owner lands on the detail page with a Manage tab.

---

## Phase 2 — Member visibility

Frontend only. The API is complete: `GET /communities/:communityId/members`, `PATCH /communities/:communityId/members/:userId/role`, `POST /communities/:communityId/members/:userId/ban`. The last two have **no client functions yet**.

### Files to touch

| File | Change |
| --- | --- |
| `src/api/communityClient.ts` | Add `updateCommunityMemberRole(communityId, userId, role)` and `banCommunityMember(communityId, userId, reason?)`. |
| `src/pages/CommunityDetailPage.tsx` | Header member summary; richer Members tab; new `onOpenDirectMessage` prop. |
| `src/App.tsx` | Wire `onOpenDirectMessage` to `setMessagesTargetUserId` + `setActiveNav('Messages')`. |

### Header summary

Add an avatar stack (first 5 members) plus `{memberCount} members` as a button that runs `setTab('members')`, replacing the current static `Users` icon row.

Load members once when the community loads instead of only on tab activation, but **only when the list is actually readable**: `listCommunityMembers` throws 403 for `PRIVATE` communities unless the viewer is `JOINED`/`MODERATOR`/`REQUESTED`. Guard with `community.privacy === 'PUBLIC' || joined || pending` and `.catch(() => setMembers([]))` so a gated private community degrades to the plain count. Keep the existing tab-activation fetch as a refresh.

### Members tab

- Client-side search box filtering on `displayName` and `username`.
- Group into `Owner`, `Admins`, `Moderators`, `Members` (the API already sorts by role then join date).
- Each row: avatar, display name, `@username`, role chip. Tap opens the profile (existing `onOpenProfile`).
- Row overflow menu, shown only when `community.canManage`: `Make moderator` / `Make admin` / `Make member` (via `updateCommunityMemberRole`) and `Ban from community` with a confirm step (via `banCommunityMember`). Refresh the list after each action. Never show these controls for the row whose `role === 'owner'` — the API rejects it anyway.
- `Message` action per row when signed in and the row is not the viewer → `onOpenDirectMessage(member.userId)`.
- Private communities keep their gate: if the members fetch failed, render "Join this community to see members" instead of an empty list.

Online presence is explicitly not included.

---

## Phase 3 — Community group chat (backend)

Mirror `getOrCreateJourneyConversation` in `apps/api/src/modules/message/message.service.ts`.

### Prisma (`packages/database/prisma/schema.prisma`)

```prisma
enum ConversationType {
  DIRECT
  JOURNEY
  COMMUNITY
}

model Conversation {
  // ...
  communityId String?    @unique
  community   Community? @relation(fields: [communityId], references: [id], onDelete: Cascade)
}

model Community {
  // ...
  conversation Conversation?
}
```

The existing `@@index([type, lastMessageAt])` covers inbox queries; no new index needed beyond the unique constraint.

### Migration

Directory: `packages/database/prisma/migrations/20260824000000_community_group_chat/migration.sql`

```sql
-- Communities Phase 7: community group chat

ALTER TYPE "ConversationType" ADD VALUE 'COMMUNITY';

ALTER TABLE "Conversation" ADD COLUMN "communityId" TEXT;

CREATE UNIQUE INDEX "Conversation_communityId_key" ON "Conversation"("communityId");

ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_communityId_fkey"
  FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

This matches `20260823020000_message_context_threads/migration.sql`, which added the `JOURNEY` value the same way. Note that Postgres cannot use a newly added enum value in the same transaction that adds it — since this migration only adds the column and never writes the value, that is fine, but do not add a data backfill to this file.

### Contracts (`packages/contracts/src/message.ts`)

```ts
export const communityChatContextSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  avatarUrl: z.string().nullable(),
  coverUrl: z.string().nullable(),
  privacy: z.enum(['PUBLIC', 'PRIVATE']),
  memberCount: z.number().int().nonnegative(),
})

export const communityConversationSummarySchema = conversationBaseSchema.extend({
  type: z.literal('COMMUNITY'),
  community: communityChatContextSchema,
  participantCount: z.number().int().nonnegative(),
  requestStatus: z.literal('ACCEPTED'),
  isInitiator: z.literal(false),
  canReply: z.literal(true),
})
```

Add it to the `conversationSummarySchema` discriminated union. Extend `createConversationBodySchema` with `communityId: z.string().min(1).optional()` and replace the current two-way `.refine` with an exactly-one-of-three check:

```ts
.refine(
  data =>
    [data.participantUserId, data.journeyId, data.communityId].filter(Boolean).length === 1,
  { message: 'Provide exactly one of participantUserId, journeyId, or communityId.' },
)
```

`packages/contracts/src/index.ts` already re-exports `./message.js`; nothing to add there.

### `message.service.ts`

1. Add to `conversationInclude`:

```ts
community: {
  select: { id: true, slug: true, name: true, avatarUrl: true, coverUrl: true, privacy: true, memberCount: true, deletedAt: true },
},
```

2. `toCommunitySummary(participant, viewerId)` — copy `toJourneySummary`, return `null` when the community is missing or `deletedAt` is set.

3. `getOrCreateCommunityConversation(userId, communityId)`:

```ts
const community = await prisma.community.findFirst({ where: { id: communityId, deletedAt: null } })
if (!community) throw new AppError(404, 'NOT_FOUND', 'Community not found.')

const membership = await prisma.communityMembership.findUnique({
  where: { communityId_userId: { communityId, userId } },
})
if (!isActiveMember(membership && { status: membership.status, role: membership.role, mutedUntil: membership.mutedUntil })) {
  throw new AppError(403, 'FORBIDDEN', 'Join this community to use the group chat.')
}
```

Reuse `isActiveMember` from `apps/api/src/modules/community/community-permissions.ts` — it already rejects `BANNED` and `REQUESTED`, which is exactly the rule we want (view access is not enough). Then: find the conversation by `{ type: 'COMMUNITY', communityId }`; create it with no participants if absent; lazily `create` the caller's `ConversationParticipant` if missing; return `toCommunitySummary`.

Unlike the journey path there is no author to seed, so a brand-new conversation starts with one participant (the opener).

4. `listConversations` — add a `row.conversation.type === 'COMMUNITY'` branch calling `toCommunitySummary`.

5. `notifyMessageRecipients` — widen the `conversation.type` parameter to `'DIRECT' | 'JOURNEY' | 'COMMUNITY'` and title community messages `'New community message'`. It already honours `NotificationPreference.providerMessages`, and `MESSAGE_RECEIVED` is an existing notification type, so no enum change.

6. Export `removeCommunityChatParticipant(communityId, userId)`:

```ts
const conversation = await prisma.conversation.findFirst({ where: { type: 'COMMUNITY', communityId }, select: { id: true } })
if (!conversation) return
await prisma.conversationParticipant.deleteMany({ where: { conversationId: conversation.id, userId } })
```

Rate limiting, typing indicators, SSE fan-out, media attachments, and read state all flow through the shared conversation code and need no changes.

### Membership side effects

- `apps/api/src/modules/community/community.service.ts` → `leaveCommunity`: call `removeCommunityChatParticipant` after deleting the membership.
- `apps/api/src/modules/community/community-manage.service.ts` → `banMember`: same call after the status update.

Import direction is safe (`message.service` does not import community modules), so no shared helper module is needed.

### Routes and controller

`apps/api/src/modules/message/message.routes.ts` — keep conversation endpoints together, mirroring the journey line:

```ts
router.post('/communities/:communityId/conversation', auth, (req, res, next) =>
  void c.communityConversation(req, res, next),
)
```

`apps/api/src/modules/message/message.controller.ts` — add `communityConversation` (copy `journeyConversation`, respond `201`) and add the `body.communityId` branch to `create`.

Do **not** add this route to `community.routes.ts`; ownership of conversation creation stays in the message module, matching journeys.

---

## Phase 4 — Community group chat (frontend)

| File | Change |
| --- | --- |
| `src/api/messageClient.ts` | `openCommunityConversation(communityId)` → `POST /communities/:id/conversation`. |
| `src/pages/messages/types.ts` | `Conversation` gains `communityId?: string` and `communitySlug?: string`. |
| `src/pages/messages/useLiveMessages.ts` | `summaryToConversation` COMMUNITY branch; `openCommunityChat`. |
| `src/pages/messages/MessagesPage.tsx` | Filter fix, open-by-community effect, context banner. |
| `src/pages/CommunityDetailPage.tsx` | Group chat button. |
| `src/App.tsx` | `messagesCommunityId` state and two-way navigation. |

### `summaryToConversation`

```ts
if (s.type === 'COMMUNITY') {
  const c = s.community
  return {
    id: s.id,
    type: 'community',
    name: c.name,
    handle: `${s.participantCount} in chat · ${c.memberCount.toLocaleString()} members`,
    avatar: c.avatarUrl ?? c.coverUrl,
    preview: s.preview,
    time: relativeMessageTime(s.lastMessageAt),
    unread: s.unreadCount,
    muted: s.muted,
    pinned: false,
    verified: false,
    archived: s.archived,
    canReply: true,
    communityId: c.id,
    communitySlug: c.slug,
    onlineAllowed: false,
    readReceiptsAllowed: true,
    contextLabel: c.privacy === 'PRIVATE' ? 'Private community chat' : 'Community chat',
  }
}
```

`TYPE_META.community` already exists in `MessagesPage.tsx`, and `matchesFilter` already handles `'Communities'`.

### The one non-obvious frontend fix

`MessagesPage.tsx` line ~234:

```ts
const liveFilterOnly = !['All', 'Unread', 'Personal', 'Requests', 'Journeys', 'Archived'].includes(filter)
```

Any filter not in this allowlist renders an empty list regardless of data. Add `'Communities'` or the Communities tab stays blank even after the backend works.

### Open-by-community

Add props `openCommunityId?: string | null`, `onCommunityOpened?: () => void`, `onOpenCommunity?: (communityId: string) => void`, and an effect that copies the `openJourneyId` effect (lines ~303–317) using `live.openCommunityChat`.

In the thread header context block (line ~574), include `active.type === 'community'` in the condition, label it `Community chat`, and add a `QuickActionRow` with a single `Open community` pill calling `onOpenCommunity?.(active.communityId)`.

### Community detail entry point

In `CommunityDetailPage.tsx`, add `onOpenGroupChat?: (communityId: string) => void` and place the button in the existing Join/Share row, **rendered only when `joined`** (do not show a disabled button to non-members):

```tsx
{joined && (
  <button type="button" onClick={() => onOpenGroupChat?.(community.id)} ...>
    <MessageCircle size={18} /> Group chat
  </button>
)}
```

### `App.tsx`

Add `const [messagesCommunityId, setMessagesCommunityId] = useState<string | null>(null)`. Pass `openCommunityId={messagesCommunityId}` and `onCommunityOpened={() => setMessagesCommunityId(null)}` to `MessagesPage`, plus `onOpenCommunity={id => { setActiveNav('Communities'); setCommunityDetailId(id); setCommunityInitialThreadId(null) }}`. On `CommunityDetailPage`, wire `onOpenGroupChat={id => { setMessagesCommunityId(id); setActiveNav('Messages') }}` — exactly the shape already used for `onOpenGroupChat` on `JourneyDetailPage`.

---

## Permission rules

| Action | Rule | Enforced by |
| --- | --- | --- |
| View community (public) | anyone, signed in or not | `getCommunityDetail` |
| View community (private) | metadata visible; members list gated | `listCommunityMembers` 403 |
| Edit avatar / cover | OWNER or ADMIN | `canManageCommunity` on PATCH; UI gated on `canManage` |
| Set avatar / cover at create | creator (becomes OWNER) | `createCommunity` |
| Change member role / ban | OWNER or ADMIN, never targeting OWNER | `canAssignRole`, `canRemoveMember` |
| Open group chat | membership `JOINED` and not `BANNED`/`REQUESTED` | `isActiveMember` in `getOrCreateCommunityConversation` |
| Send in group chat | participant of the conversation | `requireParticipant` |
| Stay in group chat | leaving or being banned removes the participant row | `removeCommunityChatParticipant` |
| Moderators in chat | same as members; no chat-specific powers in this scope | — |

A banned or departed member keeps no read access: the participant row is deleted, so `requireParticipant` returns 404 and the conversation disappears from their inbox.

---

## Out of scope / non-goals

- No new media purposes, no `community_avatar` / `community_cover` enum values, no changes to `media.service.ts`.
- No multi-channel or topic-based chat rooms; exactly one conversation per community.
- No backfill of existing members as chat participants; membership is lazy on first open.
- No chat-specific moderation (kick from chat only, mute in chat, message pinning, announcement-only mode, slow mode).
- No presence/online indicators, read receipts beyond the existing `lastReadAt`, calls, or push notifications.
- No image cropping or focal-point editor for banners beyond what Media Studio provides.
- No community-level media library or gallery.
- No changes to `CommunityThread` posting, reactions, or reports.
- No `MESSAGE_FEATURES` flags flipped (`reports`, `locationShare`, `safetyCases` stay off).

---

## Testing checklist

### Commands

```bash
pnpm db:migrate                    # prisma migrate dev, creates/applies the new migration
pnpm --filter @delve/api test      # vitest
pnpm typecheck:all
```

### New automated test

`apps/api/tests/community-chat.test.ts`, following the `vi.mock('@delve/database')` style of `apps/api/tests/follow-service.test.ts`:

- `getOrCreateCommunityConversation` rejects a non-member with `FORBIDDEN`.
- Rejects `REQUESTED` and `BANNED` memberships with `FORBIDDEN`.
- Rejects a soft-deleted community with `NOT_FOUND`.
- Creates the conversation on first call and reuses it on the second (assert `conversation.create` called once).
- Adds the caller as a participant only when missing.
- `removeCommunityChatParticipant` is a no-op when no conversation exists.

### Manual matrix

Branding:

1. As owner, upload a cover in Manage → header updates without a reload; refresh confirms persistence.
2. Upload an avatar → header square updates; the owner's own profile avatar and cover are **unchanged** (this is the regression that matters).
3. Remove cover → falls back to the gradient placeholder.
4. As a plain moderator, Manage shows moderation tools but no branding editor.
5. As a non-member, no Manage tab.
6. Create a community with branding filled in → detail page shows both images immediately.

Members:

7. Public community: header stack and count render for a signed-out viewer; tapping opens the Members tab.
8. Private community, non-member: count renders, member list stays gated with the join prompt.
9. Search filters correctly; role groups are ordered Owner → Admins → Moderators → Members.
10. As admin, promote a member to moderator and confirm the chip updates after refresh; confirm Owner rows expose no controls.
11. Ban a member; they disappear from the list and the member count drops.

Group chat:

12. Non-member sees no Group chat button; a direct `POST /communities/:id/conversation` returns 403.
13. Member taps Group chat → lands in the thread, sends a message, and the message appears for a second member in real time (SSE) and after a reload.
14. Communities filter in the inbox lists the conversation (this fails without the `liveFilterOnly` fix).
15. Unread badge increments for the second member and clears on open.
16. Mute and archive work on a community conversation.
17. Image attachment via the composer works (`purpose: 'message'` path is unchanged).
18. `Open community` pill in the thread header navigates to the community detail page.
19. Member leaves the community → conversation vanishes from their inbox; rejoining and reopening restores access with history intact.
20. Banned member loses access the same way.
21. Soft-delete a community (`deletedAt`) → the conversation stops appearing in inboxes rather than throwing.
22. Journey and direct conversations still behave exactly as before (regression check on the shared `conversationInclude` and `notifyMessageRecipients` changes).

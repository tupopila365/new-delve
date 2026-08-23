# Messages — production checklist

Use this before shipping traveler Messages to production (Vercel frontend + Render or Heroku API).

---

## 1. Frontend env (Vercel)

| Variable | Required value |
|----------|----------------|
| `VITE_API_BASE_URL` | `https://<your-api-host>/api/v2` — **must include** the `/api/v2` suffix |

**Render example**

```
VITE_API_BASE_URL=https://delve-api.onrender.com/api/v2
```

**Heroku example** (documented in `docs/heroku-deploy.md`)

```
VITE_API_BASE_URL=https://delve-api.herokuapp.com/api/v2
```

### Verify on Vercel

1. Project → **Settings** → **Environment Variables**
2. Confirm `VITE_API_BASE_URL` is set for **Production** (and Preview if previews should hit staging API).
3. **Redeploy** after changing — Vite bakes env vars at build time.

### Smoke test in browser

After deploy, open the app and check the API status chip (if visible) or DevTools → Network:

```
GET {VITE_API_BASE_URL}/health
→ 200 { "status": "ok", ... }
```

---

## 2. API env (Render / Heroku)

| Variable | Notes |
|----------|--------|
| `DELVE_SERVICE` | `api` |
| `DATABASE_URL` | Postgres connection string |
| `SESSION_SECRET` | ≥ 32 chars |
| `TRAVELER_WEB_URL` | Vercel production URL, e.g. `https://your-app.vercel.app` |
| `ADMIN_WEB_URL` | Admin host (for CORS) |
| `CLOUDINARY_*` | Required for image attachments in messages |

CORS must allow the Vercel origin. If messages fail with CORS errors, update `TRAVELER_WEB_URL` on the API and redeploy.

### Verify API health

```bash
curl -sS "https://<your-api-host>/api/v2/health"
```

---

## 3. Message routes deployed

Message router mounts at **`/api/v2`** (`apps/api/src/routes/index.ts`).

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/conversations` | Inbox (`?archived=true` for archive) |
| POST | `/conversations` | Start DM (`participantUserId`) |
| GET | `/conversations/:id/messages` | Thread history |
| POST | `/conversations/:id/messages` | Send text / media / shared entity |
| POST | `/conversations/:id/accept` | Accept request |
| POST | `/conversations/:id/decline` | Decline request |
| POST | `/conversations/:id/typing` | Typing indicator |
| POST | `/conversations/:id/read` | Mark read |
| POST | `/conversations/:id/archive` | Archive |
| POST | `/conversations/:id/unarchive` | Restore |
| PATCH | `/conversations/:id/mute` | Mute (`{ muted: boolean }`) |
| POST | `/journeys/:journeyId/conversation` | Journey chat |
| GET | `/messages/stream` | SSE — live inbox, message, and typing events |
| GET | `/blocks` | Blocked users (Safety Center) |
| POST | `/users/:userId/block` | Block |
| DELETE | `/users/:userId/block` | Unblock |

**Not shipped yet** (UI gated via `src/pages/messages/features.ts`):

- Message / user reports
- Safety cases list
- Location share messages
- In-app immediate safety escalation

---

## 4. Database migrations

Release phase runs `prisma migrate deploy` when `DELVE_SERVICE=api` (`scripts/heroku-release.mjs`).

On Render, run the same in a **pre-deploy** or **release** command:

```bash
pnpm --filter @delve/database migrate:deploy
```

### Message-related migrations (must be applied)

| Migration | Creates / adds |
|-----------|----------------|
| `20260823000000_direct_messages` | `Conversation`, `ConversationParticipant`, `DirectMessage` |
| `20260823010000_message_requests_blocks` | Request status, `UserBlock` |
| `20260823020000_message_context_threads` | `JOURNEY` type, shared entities |
| `20260823030000_message_realtime_media` | `IMAGE` kind, `mediaId` |

### Verify migrations on production DB

```bash
# Heroku
heroku run pnpm --filter @delve/database exec prisma migrate status -a delve-api

# Or connect to DB and check tables exist:
# Conversation, ConversationParticipant, DirectMessage, UserBlock
```

---

## 5. End-to-end manual test (signed in)

- [ ] Inbox loads (empty or with real conversations)
- [ ] New conversation → search traveler → open thread
- [ ] Send text message
- [ ] Send image attachment (Cloudinary configured)
- [ ] Accept / decline message request
- [ ] Archive and restore conversation
- [ ] Mute conversation
- [ ] Block / unblock from Safety Center
- [ ] Journey chat opens from journey deep link
- [ ] Communities / Businesses / Transport / Support filters show “Coming soon”
- [ ] Report, location share, and safety cases controls are **hidden** until APIs ship

---

## 6. Feature flags

Toggle in `src/pages/messages/features.ts` when Backend V2 endpoints are ready:

```ts
export const MESSAGE_FEATURES = {
  reports: false,
  locationShare: false,
  safetyCases: false,
  immediateSafetyEscalation: false,
}
```

---

## 7. Quick reference: architecture

```
Vercel (traveler UI)
  VITE_API_BASE_URL → Render/Heroku API (/api/v2)
    → Postgres (Conversation, DirectMessage, UserBlock, …)
    → Cloudinary (message attachments)
```

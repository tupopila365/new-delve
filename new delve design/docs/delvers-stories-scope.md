# Delvers Stories — Phase 0 scope lock

**Status:** Agreed for implementation (Phases 1–3)  
**Surface:** Traveler Delvers feed (`/delvers`)  
**Not in scope:** Home admin “Home stories” highlights (separate curated product)

---

## Product definition

Delvers Stories are **24-hour ephemeral** photo/video slides, Instagram-style. They are **not** Delvers posts. Posts stay permanent in the feed; stories expire and drop off the rail.

| Decision | Lock |
|---|---|
| Lifetime | **24 hours** from publish (`expiresAt = createdAt + 24h`). Soft-hidden after expiry; cleanup job may delete media later (Phase 4). |
| Audience | **Depends on the author’s profile visibility** (see below). No per-story visibility picker in v1. |
| Media | **Image and video** (Cloudinary). Same upload pipeline as Delvers media; dedicated `story` purpose. |
| “Your story” | **Add a story slide** (lightweight create). Does **not** open Media Studio. Media Studio remains for **posts** / reels / longer create flows. |
| Who appears on the rail | Signed-in viewer sees: **own ring** (always) + rings for people they **follow** who have an unexpired story they are allowed to view. |
| Unseen state | Gradient / “unseen” ring until the viewer has opened that author’s active story set; then marked viewed. |

---

## Visibility (depends on user)

Stories inherit **`TravelerProfile.profileVisibility`** — no separate story privacy control in v1.

| Author profile | Who can view their active stories |
|---|---|
| `PUBLIC` | Any **signed-in** traveler (rail still prioritizes people you follow; public authors may appear only when followed in v1 — see rail rule above). |
| `PRIVATE` | **Followers only** (accepted follow). Non-followers cannot open or list those slides. |

**v1 rail rule (simple):** show story rings for **self + accounts the viewer follows**, and only include a followed author if the viewer is allowed to see that author’s stories under the table above. Do **not** show a global “everyone’s public stories” discovery rail in v1.

Owner always sees and can manage their own active stories.

---

## “Your story” create flow

1. Tap **Your story** / **Add** on the Delvers rail.  
2. Pick image or video → upload via media signature (`purpose: story`) → confirm.  
3. Optional short caption / place (optional fields; caption max ~200 chars).  
4. Publish creates or appends a **slide** on the author’s active 24h story group.  
5. Success returns to Delvers with the own ring updated (unseen for others).

**Out of v1 create:** filters, multi-clip editor, music, stickers, link stickers, Media Studio handoff.

---

## Viewer flow

1. Tap a ring → full-screen viewer (image or video).  
2. Advance slides (tap / hold / auto-advance for video).  
3. Mark story (or story group) **viewed** for that author.  
4. Close returns to Delvers feed.  
5. Expired stories are not openable; broken media shows a simple error, not a huge empty frame.

---

## Explicit non-goals (v1)

- Permanent highlights / archived story collections  
- Story replies, reactions, or DM from story  
- Story resharing / screenshots policy UI  
- Business / sponsored stories  
- Guest (signed-out) story viewing  
- Replacing Home’s curated admin story channels  
- Turning stories into feed posts automatically  

---

## API surface (Phase 1–2 preview)

Enough for the product above; exact shapes in Phase 1 contracts:

- `GET /stories/rail` — own + followed authors with active stories + `unseen`  
- `GET /stories/users/:userId` — active slides for one author (authz checked)  
- `POST /stories` — create slide(s) from `mediaIds` (+ optional caption/location)  
- `POST /stories/users/:userId/view` — mark viewed  
- `DELETE /stories/:slideId` — owner deletes a slide  

---

## Acceptance (Phase 0 done)

- [x] 24h ephemeral  
- [x] Visibility follows profile PUBLIC / PRIVATE; rail = self + following  
- [x] Image + video  
- [x] Your story = add slide (not Media Studio)  
- [x] Home admin stories stay separate  

- [x] Phase 3 UI: Delvers story rail + create sheet + viewer (API-backed)
- [x] Phase 4 hardening:
  - Caps: 20 active / 20 per day / 5 per request; rail ≤50 authors
  - Cleanup soft-deletes expired slides and destroys Cloudinary media (batched)
  - Optional `STORY_FROM_FOLLOWED` alerts (respects communityActivity + inApp)
  - Home rail stays curated/demo — not Delvers API

**Done.** Delvers has no mock stories; cleanup destroys expired story media.


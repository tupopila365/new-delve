# Mock ↔ Real API parity (Phase 5)

Foundation checklist. Seed password in both modes: **`demo12345`**.

| Flow | Mock | Real | Notes |
|------|:----:|:----:|-------|
| Login seed user | ✓ | ✓ | Same emails/usernames (`demo_user`, `demo_provider`, `food_mgr`, `guide_mgr`, …) |
| Register + verify | ✓ | ✓ | Mock logs verify token to console in DEV |
| Logout clears session | ✓ | ✓ | Mock clears `currentUser` in localStorage state |
| Me / profile | ✓ | ✓ | Profile PATCH allowlist matches API |
| Businesses list / create | ✓ | ✓ | Cap 10; empty types rejected; provider-only create |
| Nav + Home + Search | ✓ | ✓ | Search `types` filter supported in mock |

## Fixed this phase (were P0 — owner: fix mock)

| Mismatch | Was |
|----------|-----|
| Login ignored password / auto-created users | Mock accepted any password; empty → `demo_user` |
| Register duplicate username returned 200 | Now 400 field errors like API |
| Verify token not surfaced in DEV | `console.info` with token + `/verify-email?token=` |
| Logout left mock `currentUser` | `clearMockSession()` on logout |
| Seed usernames `food_owner` / `guide_pro` | Renamed to `food_mgr` / `guide_mgr` |
| Profile PATCH accepted arbitrary fields | Allowlist + country/currency validation |
| check-username `q` length &lt; 2 | Now 400 |
| Create business as non-provider | Same 403 detail as API |
| Unhandled mock routes returned fake success | Now 404 `ApiError` |

## Remaining mismatches (not Day-1 foundations)

| Item | Owner | Severity |
|------|-------|----------|
| Coin Toss always hits real Django even when `VITE_USE_MOCKS=true` | By design (`client.ts`) | — |
| Mock JWT refresh unused (tokens never expire in mock; refresh uses Django only on real 401 paths) | Document | P2 |
| Password strength: mock only checks length ≥ 8; Django runs full validators | fix mock (optional) | P2 |
| Register `user_id` is synthetic index, not DB pk | Document | P2 |
| Deep marketplace / booking / payout edge cases beyond checklist | Case-by-case | P1+ |

## Smoke (both modes)

1. Login `demo@delve.local` / `demo12345` → Home loads.
2. Wrong password → rejected.
3. Register new user → verify via console token (mock) or email (real) → lands logged in.
4. Logout → `/api/accounts/me/` unauthorized; login again works.
5. Provider: list `/api/accounts/me/businesses/`; create second business (types required).
6. Search with `q` + optional `types` → results shape usable by nav/Home.

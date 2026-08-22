# Appwrite — traveler profiles collection

Document ID = Appwrite Auth user `$id` (one profile per user).

## Fast path (recommended): one-shot script

1. Appwrite Console → **Overview** → **API keys** → Create  
   - Scopes: Databases (read/write) — enough to create DB/collections/attributes  
2. On your machine (PowerShell), from `new delve design`:

```powershell
$env:APPWRITE_API_KEY="paste_server_api_key_here"
# If .env already has VITE_APPWRITE_ENDPOINT + VITE_APPWRITE_PROJECT_ID, those are reused.
pnpm appwrite:setup-profile
```

Creates (idempotent — safe to re-run):
- Database `delve`
- Collection `traveler_profiles`
- All attributes
- Collection **create** permission for **Users** (documentSecurity on)

Never commit `APPWRITE_API_KEY`. Never put it in `VITE_*`.

Wait until attributes show **Available** in Console, then test onboarding.

---

## Manual Console path (optional)

### 1. Create database

Databases → Create → Database ID: `delve`

### 2. Create collection

Collection ID: `traveler_profiles`

See attribute table in git history / script `scripts/appwrite-setup-traveler-profile.mjs` for the full field list.

Document permissions are set by the client on create (owner read/update/delete).

### Collection permissions (create)

- Create: `Users`
- Read/Update/Delete: document-level (set by SDK)

## Env (traveler)

```env
VITE_APPWRITE_DATABASE_ID=delve
VITE_APPWRITE_TRAVELER_PROFILES_COLLECTION_ID=traveler_profiles
```

Defaults in code are already `delve` / `traveler_profiles` if unset.

## Done when

- Sign up / sign in → onboarding if `NOT_STARTED`
- Complete onboarding → status `COMPLETED` in Appwrite
- Account dashboard completion % updates from real profile fields
- Profile edits in Account settings persist after refresh

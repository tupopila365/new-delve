# Heroku deploy — Delve monorepo

One git tree (`new delve design`) deploys to three apps. Each app sets **`DELVE_SERVICE`**.

| Heroku app | `DELVE_SERVICE` | Process |
|------------|-----------------|---------|
| `delve-web-nust` | `traveler` (default) | Traveler static UI |
| `delve-api` | `api` | Backend V2 (`/api/v2`) |
| `delve-admin` | `admin` | Admin-web static UI |

---

## Deploy Backend V2 to `delve-api`

### 1. Point a git remote at the API app (once)

From repo root `New Delve`:

```powershell
heroku git:remote -a delve-api -r heroku-api
```

### 2. Config vars on `delve-api`

```powershell
heroku config:set DELVE_SERVICE=api -a delve-api
heroku config:set NODE_ENV=production -a delve-api
heroku config:set SESSION_SECRET="replace-with-a-long-random-secret" -a delve-api
heroku config:set TRAVELER_WEB_URL="https://delve-web-nust.herokuapp.com" -a delve-api
heroku config:set ADMIN_WEB_URL="https://delve-admin.herokuapp.com" -a delve-api
heroku config:set ADMIN_WEB_ORIGIN="https://delve-admin.herokuapp.com" -a delve-api
heroku config:set BREVO_API_KEY="..." -a delve-api
heroku config:set BREVO_SENDER_EMAIL="noreply@delveworldwide.me" -a delve-api
heroku config:set CLOUDINARY_CLOUD_NAME="..." -a delve-api
heroku config:set CLOUDINARY_API_KEY="..." -a delve-api
heroku config:set CLOUDINARY_API_SECRET="..." -a delve-api
```

Use your real custom domains if you have them (must be `https://`).

`DATABASE_URL` should already exist from Heroku Postgres. **Prefer a fresh Postgres database** for Backend V2 — the old schema will not match.

Optional:

```powershell
heroku labs:enable runtime-dyno-metadata -a delve-api
```

### 3. Commit the Heroku wiring, then push

Wiring lives in this monorepo (`Procfile`, `scripts/heroku-*.mjs`). Commit those changes first, then:

```powershell
cd "C:\Users\kauna\Desktop\New Delve"
$env:GIT_LFS_SKIP_PUSH = "1"
git subtree push --prefix="new delve design" heroku-api main
```

Release phase runs `prisma migrate deploy` automatically when `DELVE_SERVICE=api`.

### 4. Verify

```powershell
curl https://delve-api.herokuapp.com/api/v2/health
heroku logs --tail -a delve-api
```

### 5. First administrator (when ready)

```powershell
heroku run pnpm admin:create -a delve-api
```

---

## Keep traveler working

On `delve-web-nust` (recommended once):

```powershell
heroku config:set DELVE_SERVICE=traveler -a delve-web-nust
```

Traveler deploy is unchanged:

```powershell
$env:GIT_LFS_SKIP_PUSH = "1"
git subtree push --prefix="new delve design" heroku main
```

After `delve-api` is live, set traveler:

```powershell
heroku config:set VITE_API_BASE_URL="https://delve-api.herokuapp.com/api/v2" -a delve-web-nust
```

Then redeploy traveler so Vite rebuilds with the new API URL.

---

## Admin later

```powershell
heroku config:set DELVE_SERVICE=admin -a delve-admin
heroku config:set VITE_API_BASE_URL="https://delve-api.herokuapp.com/api/v2" -a delve-admin
heroku git:remote -a delve-admin -r heroku-admin
# then subtree push to heroku-admin
```

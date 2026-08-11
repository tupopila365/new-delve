# Delve platform (`new delve design`)

Canonical Delve monorepo for Checkpoint 1 (platform foundation).

The **root package is traveler-web** (`@delve/traveler-web`). Existing traveler UI lives in `src/` and must stay there.

## Tooling

- Node.js **22+**
- **pnpm** 9+
- Docker (optional; PostgreSQL profile reserved for Checkpoint 2)

## Workspace structure

```text
new delve design/
  src/                 Traveler application (root = traveler-web)
  public/
  apps/
    admin-web/         DELVE ADMIN system-status shell
    api/               Backend V2 (Express, /api/v2)
  packages/
    contracts/         Shared Zod/TS API contracts
    config/            Shared env key conventions
    database/          Prisma package (generate only; no migration yet)
  docker-compose.yml   Postgres service behind profile `database`
  .env.example
  pnpm-workspace.yaml
```

There is **one** traveler application — the root React app. Do not add another.

## Install

```bash
cd "new delve design"
pnpm install
```

`postinstall` runs `pnpm db:generate` (Prisma client for the placeholder schema).

## Environment

```bash
cp .env.example .env
```

| Key | Where |
|-----|--------|
| `NODE_ENV`, `API_PORT`, `DATABASE_URL`, `SESSION_SECRET`, `TRAVELER_WEB_URL`, `ADMIN_WEB_URL` | Server / API only |
| `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME` | API only (transactional email). Required in staging/production |
| `VITE_API_BASE_URL` | Traveler + admin frontends only |

Never put server secrets (especially `BREVO_API_KEY` / `SESSION_SECRET`) in `VITE_*` variables.

## Authentication (Day 2)

Password-only traveler auth via Brevo email verification links (no Google/Apple).

| Method | Path |
|--------|------|
| POST | `/api/v2/auth/register` |
| GET | `/api/v2/auth/username-availability?username=` |
| POST | `/api/v2/auth/resend-verification` |
| GET | `/api/v2/auth/verify-email?token=` |
| POST | `/api/v2/auth/login` (email or username) |
| POST | `/api/v2/auth/refresh` |
| POST | `/api/v2/auth/logout` |
| GET/PATCH | `/api/v2/users/me/username` (Bearer) |
| GET/PATCH | `/api/v2/users/me/onboarding` |
| POST | `/api/v2/users/me/onboarding/complete` |
| GET/PATCH | `/api/v2/users/me/profile` |
| POST/DELETE | `/api/v2/users/me/avatar` (+ upload-url) |
| POST/DELETE | `/api/v2/users/me/email-change` (+ verify/resend) |
| POST | `/api/v2/users/me/change-password` |
| GET/DELETE | `/api/v2/users/me/sessions` |
| GET/PATCH | `/api/v2/users/me/preferences` |
| POST | `/api/v2/users/me/deactivate` |
| POST | `/api/v2/auth/logout-all` / `logout-others` |

Brevo domain authentication (manual DNS): see [`docs/brevo-domain-setup.md`](docs/brevo-domain-setup.md).  
Avatar object storage (optional): see [`docs/object-storage-setup.md`](docs/object-storage-setup.md).

Traveler UI: `/verify-email`, `/onboarding`, `/account/settings`, `/account/email-change`; usernames display as `@username`.

Before first login locally:

```bash
docker compose --profile database up -d
pnpm db:migrate
pnpm dev:api
```

## Local development

```bash
# Traveler (root Vite app — port 8443 by default)
pnpm dev
# or
pnpm dev:traveler

# Admin system-status (port 5174)
pnpm dev:admin

# Backend V2 (port 4000)
pnpm dev:api
```

Health check:

```bash
curl http://localhost:4000/api/v2/health
```

## Build & typecheck

```bash
pnpm build:all
pnpm typecheck:all
pnpm db:generate
pnpm db:migrate
```

## Checkpoint 1 + Day 2 auth

- pnpm workspace with root traveler-web
- `@delve/contracts` success/error/health + auth schemas
- `@delve/config` shared env conventions (incl. Brevo)
- `@delve/database` Prisma User / EmailVerificationToken / RefreshToken
- `@delve/api` health + auth routes, Brevo transactional mail
- `@delve/admin-web` Delve-branded system-status page
- Traveler: username signup, email-or-username login, verify-email route, JWT session

## Remains

- Forgot-password end-to-end against the API
- Real database health probing beyond Prisma
- Business modules, payments, hosting polish
- Deploy API (`delve-api`) with Brevo + `DATABASE_URL` + `SESSION_SECRET`
## Caching (production static host)

Production uses `scripts/serve-static.mjs` (Procfile `web`) with an explicit cache policy:

| Path | Cache |
|------|--------|
| `index.html` / SPA routes / `version.json` / other non-hashed files | `no-cache, no-store, must-revalidate` |
| `/assets/*` (Vite content-hashed files) | `public, max-age=31536000, immutable` (1 year) |

### Open sessions

Each production build writes `dist/version.json` with a `buildId` (Heroku `SOURCE_VERSION` when present). Open tabs poll that file about once a minute and show **“A new version is available”** with a **Refresh** button when it changes.

### CDN HTML invalidation

Heroku dynos are not a CDN. With no-store on HTML, sticky origin caching is avoided.

If you put **Cloudflare** (or similar) in front of the traveler app, purge HTML after each deploy:

```bash
export CF_ZONE_ID=...
export CF_API_TOKEN=...
export TRAVELER_ORIGIN=https://delve-web-nust.herokuapp.com
./scripts/purge-traveler-html-cache.sh
```

### Heroku deploy note (Git LFS)

Heroku does not host Git LFS. Traveler images in this folder are normal git files (see local `.gitattributes`). Push with:

```powershell
$env:GIT_LFS_SKIP_PUSH = "1"
git subtree push --prefix="new delve design" heroku main
```

Full guide for **traveler / api / admin** apps (`delve-web-nust`, `delve-api`, `delve-admin`): see [`docs/heroku-deploy.md`](docs/heroku-deploy.md).

Set `DELVE_SERVICE=api` on `delve-api` before the first Backend V2 deploy.

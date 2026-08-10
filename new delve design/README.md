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

Reserved keys:

| Key | Where |
|-----|--------|
| `NODE_ENV`, `API_PORT`, `DATABASE_URL`, `SESSION_SECRET`, `TRAVELER_WEB_URL`, `ADMIN_WEB_URL` | Server / API only |
| `VITE_API_BASE_URL` | Traveler + admin frontends only |

Never put server secrets in `VITE_*` variables.

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
pnpm db:migrate          # reserved — do not use until Checkpoint 2
```

## Checkpoint 1 implements

- pnpm workspace with root traveler-web
- `@delve/contracts` success/error/health schemas
- `@delve/config` shared env conventions
- `@delve/database` Prisma package + placeholder schema (**no migration**)
- `@delve/api` Backend V2 with `GET /api/v2/health`, CORS, errors, logging, graceful shutdown
- `@delve/admin-web` Delve-branded system-status page (backend + database status)
- Traveler header chip for API connection state (loading / ready / error / idle)

## Remains for the database checkpoint

- Full Delve Prisma schema
- PostgreSQL migration and seed
- Real database health probing
- Auth, business modules, payments, hosting

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

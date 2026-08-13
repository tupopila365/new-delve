# Appwrite Sites — traveler (production)

Deploy the **traveler Vite app** as a static site. Do **not** use Appwrite Functions for `apps/api`.

## Site settings

| Field | Value |
|--------|--------|
| Root directory | `new delve design` |
| Install command | `corepack enable && corepack prepare pnpm@9.15.0 --activate && DELVE_SKIP_POSTINSTALL=1 pnpm install --frozen-lockfile --filter @delve/traveler-web...` |
| Build command | `DELVE_SKIP_POSTINSTALL=1 pnpm run build` |
| Output directory | `dist` |

If Install + Build are flaky, use a single Build command and set Install to `true`:

**Install:** `true`  
**Build:**
```bash
corepack enable && corepack prepare pnpm@9.15.0 --activate && DELVE_SKIP_POSTINSTALL=1 pnpm install --frozen-lockfile --filter @delve/traveler-web... && DELVE_SKIP_POSTINSTALL=1 pnpm run build
```

Clear the Hosting **build cache** after changing these settings, then redeploy.

## Environment variables (Site → Variables)

Required for Appwrite Auth in the browser (baked in at build time):

```env
VITE_APPWRITE_ENDPOINT=https://<REGION>.cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=<your_project_id>
VITE_APPWRITE_EMAIL_VERIFICATION=off
```

Redeploy after changing any `VITE_*` variable.

## Appwrite Auth platforms

Auth → Platforms → Web → add your **Hosting hostname** (and `localhost` only if you also test locally).

## Notes

- Vite resolves `@delve/contracts` from source (`packages/contracts/src`). You do **not** need `pnpm --filter @delve/contracts build` / `tsc` on Hosting.
- Prisma `postinstall` is skipped when `DELVE_SKIP_POSTINSTALL=1`.
- Ignore Heroku for this path.

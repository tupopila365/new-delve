# Administrator bootstrap

Delve administrators are ordinary `User` rows with `role = admin`. They are **never** created through public registration.

## Local setup

1. Ensure PostgreSQL is running and migrations are applied:

```bash
pnpm db:migrate
```

2. Configure Backend V2 environment (at least `DATABASE_URL` and `SESSION_SECRET`).

3. Create the first administrator interactively:

```bash
pnpm admin:create
```

The command prompts for:

- Email
- Username
- Password (hidden)
- Password confirmation (hidden)

It creates an **active**, **email-verified** administrator and records an `ADMIN_BOOTSTRAPPED` audit event.

## Heroku one-off

Run only when you intend to create the first administrator for that app:

```bash
heroku run pnpm admin:create -a <your-app>
```

Use an interactive dyno so password prompts work. Do not pass passwords as command arguments or config vars.

## Required environment

- `DATABASE_URL` — PostgreSQL
- `SESSION_SECRET` — used by the API (not required to hash the bootstrap password, but required to run the API afterward)
- Admin session (API): `ADMIN_WEB_URL` / `ADMIN_WEB_ORIGIN`, `ADMIN_SESSION_COOKIE_NAME`, `ADMIN_CSRF_COOKIE_NAME`, `ADMIN_SESSION_TTL_HOURS`, `ADMIN_SESSION_IDLE_TIMEOUT_MINUTES`
- Staging/production require HTTPS admin origins so Secure cookies can be set. The API process will not start if those URLs are `http://`.

## Confirm creation

```sql
SELECT id, email, username, role, "accountStatus", "emailVerifiedAt"
FROM "User"
WHERE role = 'admin';
```

Or sign in at admin-web and load `/api/v2/admin/auth/me` (cookie session).

## If an administrator already exists

`pnpm admin:create` exits without creating another account. Additional administrators must be created through an authorized administrative process (service boundary `grantAdminRole`), not public registration and not this bootstrap command.

## Why not public registration

Public registration always creates travelers. Allowing `ADMIN` selection from the client would let anyone claim elevated access. Bootstrap is a one-time, operator-controlled path with no default password.

## Temporary configuration

There is no temporary bootstrap password env var. After the first admin exists, remove any local notes that contained the password and rely on the administrator’s own credentials and password-reset flows.

## Safety properties

- Password is never printed or logged
- Existing travelers are never silently promoted
- Concurrent first-admin races are blocked with a PostgreSQL advisory lock
- Command is idempotent: second run refuses when an admin already exists
- Never auto-runs on migrate, build, or app startup

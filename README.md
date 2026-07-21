# DELVE

Mobile-first PWA for discovery and bookings: accommodation, car rental, public bus seats, events, food & drinks, tour guides, social **Delvers** feed, and messaging. **Stack:** Django REST + SQLite (backend), React + Vite + TanStack Query (frontend), JWT auth, mock payments.

## Prerequisites

- Python 3.11+ with `pip`
- Node.js 18+ with `npm`

## Backend

```powershell
cd backend
python -m venv ..\.venv
..\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_delve
python manage.py createsuperuser
python manage.py runserver
```

API base: `http://127.0.0.1:8000`. Registration sends a verification email to the **console** by default (`EMAIL_BACKEND` in `config/settings.py`).

### Demo accounts (after `seed_delve`)

| Username        | Password   | Role              |
|----------------|------------|-------------------|
| `demo_user`    | `demo12345`| Normal (verified) |
| `demo_provider`| `demo12345`| Provider (verified)|

## Frontend

```powershell
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. The dev server proxies `/api` and `/media` to the Django server when you use the **real** API.

### Frontend mock mode (default in dev)

`frontend/.env.development` sets `VITE_USE_MOCKS=true`, so `npm run dev` talks to an **in-browser mock API** and you will **not** see `ECONNREFUSED` on port 8000 unless something still calls the real network.

To use **Django** during dev, create `frontend/.env.development.local`:

```env
VITE_USE_MOCKS=false
```

Start the backend on `http://127.0.0.1:8000`, then restart Vite.

Login with any username/password in mock mode (or `demo_user` / `demo12345`). Mock likes/saves persist in `localStorage`.

### Production build

```powershell
cd frontend
npm run build
npx vite preview
```

Set `VITE_API_URL` if the API is on another origin (e.g. `https://api.example.com`).  
Set `VITE_ADMIN_APP_URL` if the Delve Admin console is not at `http://localhost:5174` (staff handoff from `/admin`).

## Delve Admin (platform console)

```powershell
cd "Delve Admin"
npm install
npm run dev
```

Open `http://localhost:5174`. Sign in with **email** (e.g. `admin@delve.local` / `demo12345` after `seed_delve`). Tokens are stored separately from the main app (`delve_admin_access` / `delve_admin_refresh`). Backend CORS defaults include ports **5173** and **5174**.

This is the **canonical platform admin console**. The traveller app’s `/admin` route redirects here.

### Three admin surfaces

| Surface | URL | Use for |
|---------|-----|---------|
| **Delve Admin** (this app) | `http://localhost:5174` | Day-to-day ops: users, verifications, moderation, email queue, bookings, analytics |
| **Traveller app handoff** | `http://localhost:5173/admin` | Redirects staff to Delve Admin (deep links preserved) |
| **Django admin** | `http://127.0.0.1:8000/admin/` | Database / superuser only — not product operations |

Staff actions in the API (`/api/accounts/admin/*`) are audited via `AdminAuditLog`.

### Production: business verification

End-to-end flow needs the **API**, **traveller/provider app**, and **Delve Admin** wired to the same backend.

1. **API config vars**
   - `CLOUDINARY_URL` — required so verification PDFs/images survive Heroku dyno restarts
   - `FRONTEND_URL` — live traveller app origin (links in status emails)
   - `CORS_ALLOWED_ORIGINS` / `CSRF_TRUSTED_ORIGINS` — include traveller **and** Delve Admin origins
   - SMTP (`EMAIL_BACKEND`, `EMAIL_HOST`, …) — owner emails on submit / approve / reject

2. **Create a staff admin** (once):

```bash
heroku run -a YOUR_API_APP python manage.py ensure_platform_admin --email you@example.com --password 'YourSecurePass123!'
```

3. **Delve Admin** config (rebuild after change): `VITE_USE_MOCKS=false`, `VITE_API_URL=https://YOUR_API.herokuapp.com`

4. **Smoke test**
   - Provider: onboarding → upload docs → submit → status `pending`
   - Delve Admin → Verifications → open files → Approve
   - Provider settings shows Verified; owner gets email

### Environment

- `DJANGO_SECRET_KEY`, `DJANGO_DEBUG`, `DJANGO_ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, `FRONTEND_URL` (verification and password-reset links), `EMAIL_BACKEND` for real SMTP, `CLOUDINARY_URL` for verification documents.

## Features (MVP)

- Register / login, username availability, email verification token (auto sign-in after verify), resend verification, JWT refresh.
- **Password reset** (forgot-password email flow) and **change password** while signed in.
- **Self-service account delete** (Settings -> Account) — GDPR-style anonymization; admin delete unchanged.
- Home feed (ranked), search across modules, module shortcuts.
- Accommodation & vehicle rental: filters, detail, booking + **mock pay**.
- Bus trips: seat selection + **mock pay**.
- Events, food venues, tour guides: list, filters, detail; guide booking + mock pay.
- Delvers: ranked grid, like/save, create post (**image or video only** — no user-uploaded music/audio; optional client-side video trim before upload).
- Messages: conversations, start by user id, polling refresh.

### Content policy

| Area | Supported | Not supported |
|------|-----------|----------------|
| Social posts | Image, video (with optional trim) | User-uploaded audio / music files |
| Account | Email reset, self-delete, change password | SMS reset, hard delete of booking records |

SQLite is fine for demos; for production traffic use PostgreSQL and a real payment provider (e.g. PayFast / Stripe).

## Testing

```powershell
cd backend
python manage.py test
```

CI (`.github/workflows/ci.yml`) runs backend tests plus frontend and Delve Admin typecheck on push/PR to `main`.

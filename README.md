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

### Environment

- `DJANGO_SECRET_KEY`, `DJANGO_DEBUG`, `DJANGO_ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, `FRONTEND_URL` (verification links), `EMAIL_BACKEND` for real SMTP.

## Features (MVP)

- Register / login, username availability, email verification token, JWT refresh.
- Home feed (ranked), search across modules, module shortcuts.
- Accommodation & vehicle rental: filters, detail, booking + **mock pay**.
- Bus trips: seat selection + **mock pay**.
- Events, food venues, tour guides: list, filters, detail; guide booking + mock pay.
- Delvers: ranked grid, like/save, create post (JSON or image upload).
- Messages: conversations, start by user id, polling refresh.

SQLite is fine for demos; for production traffic use PostgreSQL and a real payment provider (e.g. PayFast / Stripe).

# NEEFL eFootball Esports League

Real backend system for a competitive eFootball esports league: players, tournaments, scheduling, verification, rankings, disputes, and M-Pesa payments.

## What is included

- Express API with role-based access control
- PostgreSQL schema for players, tournaments, matches, results, disputes, payments, and wallets
- M-Pesa Daraja integration (STK Push + B2C payout)
- Evidence uploads (screenshots) for match verification
- Admin control endpoints

## Quick start (local)

1. Start PostgreSQL

```
docker compose up -d
```

2. Configure environment

Copy `backend/.env.example` to `backend/.env` and set your credentials.

3. Install dependencies and initialize the database

```
cd backend
npm install
npm run db:init
```

4. Run the API

```
npm run dev
```

The API will run on `http://localhost:8080` by default.

## API overview

- Auth: `POST /api/auth/register`, `POST /api/auth/login`
- Player profile: `GET /api/players/me`, `PUT /api/players/me`
- Tournaments: `POST /api/tournaments`, `POST /api/tournaments/:id/join`, `POST /api/tournaments/:id/schedule`
- Matches: `POST /api/matches/:id/submit-result`, `POST /api/matches/:id/confirm-result`
- Disputes: `POST /api/matches/:id/dispute`, `GET /api/disputes/me`
- Payments: `POST /api/payments/mpesa/stk-push`, `POST /api/payments/mpesa/callback`, `POST /api/payments/payouts`
- Admin: `GET /api/admin/dashboard`, `POST /api/admin/results/:matchId/approve`

## Frontend

The React control center lives in `frontend/` and connects directly to the API.

```
cd frontend
npm install
cp .env.example .env
npm run dev
```

Set `VITE_API_BASE` in `frontend/.env` to point at your API host.

## Deploy to Render (single Web Service)

This setup serves the React frontend from the backend web service, so you only deploy one service.

1. Create a new Render **PostgreSQL** database (fresh instance).
2. Create a new Render **Web Service** from this repo.
3. Configure the Web Service:

```
Root Directory: backend
Build Command: npm install && npm run build:web
Start Command: npm start
```

4. Add environment variables (Render dashboard → Environment):

```
NODE_ENV=production
BASE_URL=https://your-service.onrender.com
JWT_SECRET=<strong-random-string>
DATABASE_URL=<Render Postgres Internal URL or External URL>
DB_SSL=true
DB_SSL_REJECT_UNAUTHORIZED=false
```

5. Initialize the database from your local machine (Render shell is optional):

```
PGPASSWORD=<password> psql -h <external-host> -U <user> <db> -f backend/src/db/schema.sql
```

6. Deploy. Then visit:

- `https://your-service.onrender.com/` for the frontend
- `https://your-service.onrender.com/health` for API health

## Deploy to ProFreeHost (frontend)

ProFreeHost is static hosting only. You can deploy the frontend there and point it to a separately hosted API.

1. Build the frontend with your API base URL

```
cd frontend
npm install
VITE_API_BASE=https://your-api-host.example.com npm run build
```

2. Upload the contents of `frontend/dist` to `public_html` on ProFreeHost.

3. Enable client-side routing (React Router). Create `public_html/.htaccess`:

```
RewriteEngine On
RewriteBase /
RewriteRule ^index\\.html$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]
```

Note: ProFreeHost does not run Node.js. Host the API on any Node-capable platform or VPS, then set `VITE_API_BASE` to that API URL.

## Notes

- M-Pesa credentials must be configured in `backend/.env` before initiating real payments.
- Screenshot uploads are stored under `backend/uploads` and served at `/uploads`.
- For production, move evidence to object storage (S3-compatible) and enable HTTPS.

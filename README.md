# NEEFL eFootball Esports League

Real backend system for a competitive eFootball esports league: players, tournaments, scheduling, verification, rankings, disputes, and M-Pesa payments.

## What is included

- Express API with role-based access control
- MySQL schema for players, tournaments, matches, results, disputes, payments, and wallets
- M-Pesa Daraja integration (STK Push + B2C payout)
- Evidence uploads (screenshots) for match verification
- Admin control endpoints

## Quick start (local)

1. Start MySQL

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

## Notes

- M-Pesa credentials must be configured in `backend/.env` before initiating real payments.
- Screenshot uploads are stored under `backend/uploads` and served at `/uploads`.
- For production, move evidence to object storage (S3-compatible) and enable HTTPS.

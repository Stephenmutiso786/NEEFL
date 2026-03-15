# NEEFL Platform Blueprint

This blueprint describes the real-world platform components, data flow, and operational controls for the eFootball esports league system.

## Core Components

- Web frontend (player + admin)
- REST API (Node.js/Express)
- MySQL database
- Object storage for match evidence (local or S3-compatible)
- Payment integration (M-Pesa Daraja)
- Streaming integrations (YouTube/Twitch/Facebook embeds)
- Admin control center

## Key System Flows

- Player onboarding: register -> profile -> verification -> approved by admin
- Tournament lifecycle: create -> open -> join -> pay -> schedule -> play -> verify -> approve -> leaderboard
- Match verification: result submission -> opponent confirmation -> admin approval -> stats update
- Payments: entry fee STK push -> callback -> update entry; payouts via B2C
- Disputes: file -> review -> resolve -> apply outcome

## Security & Integrity

- JWT-based API auth
- Role-based access control
- Evidence-first result verification
- Audit logging for admin actions
- Rate limiting and IP-based monitoring (recommended for production)

## Hosting & Scaling

- Start with single VPS (API + DB)
- Separate DB server as usage grows
- Add CDN for assets and streaming embeds
- Add background workers for notifications and payouts

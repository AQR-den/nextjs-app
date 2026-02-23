# Tekkerz Platform Upgrade (Cape Town)

Premium, animated booking platform for a 5-a-side venue in Cape Town.

## Key Product Rules Implemented
- Venue: Cape Town (`17 Marine Drive, Cape Town` in UI copy)
- Timezone: `Africa/Johannesburg` (same timezone as Cape Town)
- Slot duration: `1 hour`
- Daily schedule capped to `10 slots` (12:00 to 22:00)
- Courts: `1-4`
- Standard booking price: `R700` per slot
- Individual special slot: `Court 4, 17:00-18:00`, `R80`, payment required immediately

## What Was Upgraded
- New logo system (SVG):
  - `public/brand/tekkerz-logo.svg` (main horizontal)
  - `public/brand/tekkerz-icon.svg` (icon-only)
  - `public/brand/tekkerz-logo-mono.svg` (monochrome)
- More dynamic UI:
  - Animated slot cards, hover transitions, microinteractions
  - Live status pulse indicators
  - Animated booking-step transitions
  - Live countdown timers for cancellation window
  - Payment success animation
- Booking engine updates:
  - Pricing logic enforced in API + frontend summaries
  - Individual slot highlighted and hard-enforced
  - Immediate payment required for individual slot
- Cancellation automation:
  - `cancellationDeadline = start - 24h` per booking
  - Live countdown + auto-disabled cancel button in UI
  - API returns `403` inside 24h
- Refund + wallet credit flows:
  - Cancellation modal lets eligible users choose `refund` or `wallet credit`
  - Wallet balance and transaction history in dashboard
- Notification abstraction:
  - WhatsApp + Telegram provider layer (mockable)
  - Templated booking/payment/cancel/refund/reminder notifications
  - Delivery status webhook endpoint
- Admin visibility panel:
  - Totals, individual slot usage, refund/credit overview, booking list
- Docker stack expanded:
  - Web container
  - API container
  - Postgres container
- Demo wizard + notification center:
  - 5-step booking wizard with progress and back navigation
  - Demo tour overlay (demo mode only)
  - In-session notification center (bell icon)
- Visual upgrades:
  - Hero + section imagery (local assets)
  - Polished cards, inputs, buttons, modals, and transitions

## Architecture
```text
.
├── app/
│   ├── admin/page.tsx
│   ├── auth/
│   ├── booking/page.tsx
│   ├── contact/page.tsx
│   ├── my-bookings/page.tsx
│   ├── pricing/page.tsx
│   ├── favicon.svg
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── booking/
│   │   ├── cancel-booking-modal.tsx
│   │   ├── countdown-timer.tsx
│   │   ├── payment-success.tsx
│   │   └── ...
│   ├── layout/
│   │   └── logo.tsx
│   └── ui/
├── lib/
│   ├── api/client.ts
│   ├── config/constants.ts
│   ├── types/domain.ts
│   └── utils/datetime.ts
├── api-service/
│   ├── server.js
│   ├── package.json
│   └── Dockerfile
├── public/brand/
│   ├── tekkerz-logo.svg
│   ├── tekkerz-icon.svg
│   └── tekkerz-logo-mono.svg
├── Dockerfile
├── docker-compose.yml
├── docker-compose.prod.yml
└── .env.example
```

## Data Model
Frontend/API aligned interfaces include:
- `User`: `id, name, email, phone, walletBalance`
- `Court`: `id, name, features, hourlyRate`
- `Slot`: `courtId, startDateTime, endDateTime, isSpecialIndividualsSlot, state, price`
- `Booking`: `id, userId, courtId, startDateTime, endDateTime, status, createdAt, cancellationDeadline`
- `Payment`: `id, bookingId, status, amount, currency, dueAt, paidAt, providerRef, method`
- `WalletTransaction`: `id, userId, amount, type(refund|booking_payment|credit), bookingId, description, createdAt`

## API Contract
Base URL: `/api`

### Demo
- `POST /api/demo/reset`

### Core
- `GET /api/courts`
- `GET /api/availability/summary?month=YYYY-MM`
- `GET /api/availability?date=YYYY-MM-DD`

### Booking Verification (OTP)
- `POST /api/bookings/initiate`
  - Creates a pending booking + soft hold (5 min) + sends OTP
  - Body: `{ courtId, startDateTime, endDateTime, firstName, surname, email, phone }`
- `POST /api/bookings/verify`
  - Confirms booking after OTP
  - Body: `{ bookingId, code }`

### Cancellation (OTP)
- `POST /api/bookings/cancel/initiate`
  - Sends OTP for cancellation
  - Body: `{ reference, phone }`
- `POST /api/bookings/cancel/verify`
  - Confirms cancellation
  - Body: `{ bookingId, code }`

### Lookup (OTP)
- `POST /api/bookings/lookup/initiate`
  - Sends OTP for lookup
  - Body: `{ phone }`
- `POST /api/bookings/lookup/verify`
  - Returns upcoming bookings
  - Body: `{ phone, code }`

### Notifications
- `GET /api/notifications/me`
- `POST /api/notifications/webhook`

### Admin
- `GET /api/admin/bookings`
- `POST /api/admin/bookings/{id}/override-cancel`

### Payment Webhook
- `POST /api/payments/webhook`

### Errors
- `409 SLOT_CONFLICT`
- `403 CANCELLATION_WINDOW_CLOSED`
- `402 PAYMENT_REQUIRED`
- `402 INSUFFICIENT_WALLET`
- `422 VALIDATION_ERROR`
- `401 UNAUTHORIZED`

### Idempotency
`POST /api/bookings` accepts `Idempotency-Key` header and `idempotencyKey` body. Repeated key returns existing booking response.

## Notification Providers (Abstraction Layer)
API includes a mock-capable provider abstraction:
- WhatsApp: `WHATSAPP_PROVIDER=mock|twilio|meta`
- Telegram: Bot API token + chat id

Trigger events:
- Booking confirmation
- Payment confirmation
- Cancellation confirmation
- Refund processed
- 24-hour reminder

If external creds are missing, notifications are safely mocked and logged in API state.

## Environment Variables
Copy and edit:
```bash
cp .env.example .env
```

Important variables:
- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_ENABLE_ADMIN`
- `NEXT_PUBLIC_DEMO_MODE`
- `APP_TIMEZONE`
- `DEMO_MODE`
- `DEMO_PASSWORD`
- `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`
- `WHATSAPP_PROVIDER`
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`

## Run with Docker (full stack)
### Dev
```bash
docker compose up --build
```
- Web: `http://localhost:3000`
- API: `http://localhost:4001`
- Postgres: `localhost:5432`

## Demo Mode (End-to-End Scenarios)
Demo mode is enabled by default via `.env` / compose and seeds bookings, payments, and wallet state.

### Demo Accounts
- `demo.court@tekkerz.test` (standard court booking user)
- `demo.individual@tekkerz.test` (individual slot user)
- Password (demo only): `DemoPass123!`

### Reset Demo Data
Use either of the following:
- UI button: My Bookings → `Reset Demo Data`
- Direct route: `http://localhost:3000/demo/reset`

### How To Run Demo And Test Cancellation/Payment Scenarios
1. Start the stack with `docker compose up --build`.
2. Go to `http://localhost:3000/auth/sign-in` and click a `Use Demo Account` button.
3. Scenario A (Standard Court Booking):
   - Navigate to Booking.
   - Use the wizard: Step 1 → Step 2 → Step 3 → Step 4.
   - Choose any available 1-hour slot and confirm.
   - Go to My Bookings → `Try it out` to see:
     - One booking that can be cancelled (more than 24 hours away).
     - One booking that cannot be cancelled (within 24 hours).
     - Each card shows start time, cancellation deadline, countdown, cancel button state, and status.
4. Scenario B (Individuals Slot Booking + Payment):
   - Navigate to Booking.
   - In Step 2, select the Individuals Slot on Court 4 (17:00–18:00).
   - Proceed to Step 4 and complete the mock payment.
   - In My Bookings, cancel the Individuals Slot (if >24h) to choose Refund or Wallet Credit.

### Walkthrough (Click Path)
1. Standard court booking:
   - `Booking` → Step 1 (date + court) → Step 2 (slot) → Step 3 (details) → Step 4 (confirm).
2. Individuals slot booking + payment:
   - `Booking` → Step 2 (Individuals Slot) → Step 4 (Pay & confirm booking).
3. Cancellation allowed vs blocked:
   - `My Bookings` → `Try it out` → observe enabled vs disabled cancel buttons and countdowns.

### Quick Demo
- Home → `Quick Demo` to jump into Step 2 of the wizard.

### Image Assets (Local + Realistic)
This repo uses local images under `public/images` for hero, booking banner, pricing cards, empty states, and onboarding.
In this environment, network downloads are blocked, so placeholders were generated from SVGs. To download the real
photographic assets, run:
```bash
./scripts/fetch-images.sh
```
The script pulls free-to-use Unsplash images and overwrites the placeholders.
Credits are listed in `public/images/IMAGE_CREDITS.md`.

### Notification Center
- Click the bell icon in the navbar to see the last 10 session events (slot selected, booking confirmed, payment success, conflicts).

### Prod compose
```bash
docker compose -f docker-compose.prod.yml up --build
```

### Frontend standalone production image
```bash
docker build -t tekkerz-web .
docker run -p 3000:3000 -e NEXT_PUBLIC_API_BASE_URL=http://host.docker.internal:4001/api tekkerz-web
```

## Local Run (non-docker)
```bash
# api
cd api-service
npm ci
npm run dev

# web (new terminal)
cd ..
npm ci
NEXT_PUBLIC_API_BASE_URL=http://localhost:4001/api npm run dev -- --port 6001
```

## Vercel Frontend-Only (No Backend)
This app can run fully in the browser with a local mock API for demo purposes.

### Vercel Env Vars
Set these in Vercel:
- `NEXT_PUBLIC_API_BASE_URL=mock`
- `NEXT_PUBLIC_USE_MOCK=true`

### What Works In Mock Mode
- Calendar → timeslots → booking details → OTP verification
- OTP demo codes are returned and shown in the UI
- Booking lookup by phone + OTP
- Cancellation by OTP

## Demo Walkthrough (No Login)
1. Home → Booking.
2. Step A: Pick a day (calendar view).
3. Step B: Pick a timeslot (grouped by court).
4. Fill in details and click `Send code`.
5. Enter the demo OTP (shown on screen) → booking confirmed.
6. Go to `Find Booking`, enter the same phone, get OTP, and view/cancel.

## QA / Test Scenarios
1. Booking >24h: cancel allowed
- Create future booking beyond 24h and verify cancel enabled.

2. Booking <24h: cancel blocked
- Attempt cancel within 24h and verify API `403` + UI disabled/closed state.

3. Individual slot immediate payment
- Book Court 4 at 17:00-18:00; ensure booking fails without immediate payment and succeeds when paid.

4. Refund flow
- Cancel eligible paid individual booking with `refund` option; payment status becomes `refunded`.

5. Wallet credit flow
- Cancel eligible paid individual booking with `wallet`; wallet balance increases and transaction logged.

6. Countdown accuracy
- Verify live countdown displays `HH:MM:SS` and flips to `Cancellation window closed` after deadline.

7. Notifications triggered
- Confirm booking/payment/cancel/refund/reminder events create notification records.

8. Daily slot cap
- Verify availability returns exactly 10 hourly slots per court per day (12:00-22:00).

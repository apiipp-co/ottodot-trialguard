# Ottodot TrialGuard

Reliable trial booking under real-world concurrency.

> A seat is not yours until the database atomically confirms it.

TrialGuard is a small Next.js and PostgreSQL booking system for live trial classes. A parent chooses a child and class, creates a pending booking, then tries a mock payment outcome. Teachers see confirmed students only. The Reliability Lab runs two payment confirmations against one remaining seat and shows the actual response.

## What is included

- Parent booking flow with seeded synthetic families and trial classes.
- Mock success and failure payment outcomes.
- Booking timeline and idempotent terminal payment handling.
- Admin roster that queries only confirmed bookings.
- Reliability Lab with normal, failed-payment, duplicate, full-class, and last-seat explanations. The last-seat control calls the real backend route.
- PostgreSQL schema, deterministic seed data, and an automated PostgreSQL-backed verification suite.

## Reliability rules

✓ Maximum 4 confirmed students per class.

✓ One confirmed booking per student and trial class.

✓ Failed payments never enter a roster.

✓ Two simultaneous final-seat attempts produce one winner.

The browser’s seat count is advisory. `process_mock_payment` is the authority: it locks the booking, records the payment attempt, locks the class row with `FOR UPDATE`, checks for an existing confirmed booking, counts confirmed seats, and stores the final state in one PostgreSQL transaction. I chose a row lock because it keeps the invariant in PostgreSQL, where competing payment confirmations can be serialized reliably. The tradeoff is that confirmations for the same class queue briefly, which is appropriate for a class capped at four students.

## Data model

| Table | Purpose |
| --- | --- |
| `parents` | Synthetic demo parents |
| `students` | Children, each linked to one parent |
| `trial_classes` | Class metadata and capacity, constrained to 1–4 |
| `bookings` | Pending, confirmed, failed, or cancelled booking state |
| `payment_attempts` | One recorded mock outcome for a non-terminal booking |

The schema uses UUID keys, foreign keys, a `uniq_confirmed_student_trial_class` partial unique index, a `bookings.updated_at` trigger, RLS policies that deny direct browser access, and server-only RPC permissions. See [schema.sql](./supabase/schema.sql) and [implementation notes](./docs/IMPLEMENTATION.md).

## Backend design

The UI selects a parent, one of that parent's children, and a class with seats displayed. It does not make booking decisions. Route handlers validate the request shape and call the server-only Supabase client. PostgreSQL is responsible for the final payment transition, duplicate backstop, class capacity, and roster source of truth. There is no background job in this take-home slice.

| Endpoint | Purpose |
| --- | --- |
| `GET /api/parents` | List synthetic parents and their children. |
| `GET /api/trial-classes` | List classes with advisory confirmed and remaining seat counts. |
| `POST /api/bookings` | Validate parent ownership and create a `pending_payment` booking. |
| `POST /api/bookings/:id/payment` | Record a mock outcome and atomically finalize the booking. |
| `GET /api/trial-classes/:id/roster` | Return confirmed students only. |
| `POST /api/reliability/last-seat-race` | Prepare and run two concurrent payment confirmations. |

Booking statuses are `pending_payment`, `confirmed`, `payment_failed`, and `cancelled`. A terminal payment request is idempotent: it returns the stored result and does not create another payment attempt.

## Run locally

Prerequisites: Node 22+. This repository targets the supplied Supabase project, `Ottodot_Full_Stack` (`okcrsrujbuvgwblddeoo`). Its schema and seed data are already deployed. The running app uses the server-only `SUPABASE_SECRET_KEY` for Data API queries and PostgreSQL RPC calls.

```bash
npm install
cp .env.example .env.local
```

Set the Supabase URL, publishable key, secret key, and JWKS URL in `.env.local`. Do not commit the secret key.

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

For a fresh, empty development database only, add its `DATABASE_URL` and apply the schema and seed data with `psql`:

```bash
psql "$DATABASE_URL" -f supabase/schema.sql
psql "$DATABASE_URL" -f supabase/seed.sql
```

## Verify

```bash
npm run lint
npm run build
npm test
npm run verify:scenarios
```

`npm test` runs seven integration tests in PGlite, an embedded PostgreSQL runtime. Each test executes the production schema, seed data, and `process_mock_payment` function. The last-seat test sends two concurrent success calls to that function and verifies one confirmation and a 4/4 roster.

`npm run verify:scenarios` prints a readable database-level walkthrough of the normal, failed-payment, duplicate, full-class, roster, and last-seat cases.

The configured Supabase project was also checked through the running application: normal booking, success, payment failure, duplicate rejection, full class, roster filtering, and the concurrent last-seat race all passed.

## Demo route

1. Open `/`, choose a parent, child, and available class, then continue.
2. On `/booking/[id]`, simulate a success or failure.
3. Open `/admin` to inspect confirmed rosters only.
4. Open `/reliability-lab` and run the last-seat experiment. It creates the scenario with three confirmed bookings, sends two payment successes concurrently, then returns one `confirmed` and one `cancelled / class_full` outcome.

## Deliberate boundaries

This is a take-home slice. It does not include authentication, real payment processing, refunds, notifications, waitlists, or recurring enrollment. A production payment adapter would validate provider webhooks and pass provider event IDs as idempotency keys.

The supplied Supabase project is configured in `.env.local`. A database password is only needed to initialize another empty database through `psql`. Runtime requests use the server-side Supabase secret key and never expose it to the browser.

## Assumptions and follow-up

This demo assumes one trusted server owns the Supabase secret and that payment outcomes are mock inputs. It intentionally does not model identity, real payment provider webhooks, refunds, notifications, waitlists, or regular enrollment.

Exact elapsed time was not recorded. The work was scoped to the supplied 3–4 hour take-home brief.

After release, I would monitor cancelled booking reasons, payment-finalization errors, lock wait time for class rows, confirmed-seat counts, and duplicate confirmation attempts. With more time, I would add Supabase Auth, a webhook-verified payment adapter with provider event idempotency, a networked PostgreSQL test job in CI, and operational alerts.

## Submission checklist

Before submitting, publish this repository to a public GitHub URL and record a 5–8 minute walkthrough. [The walkthrough script](./docs/WALKTHROUGH.md) covers the expected demo and explanation points.

## Source documents

- [Product requirements](./PRD.md)
- [Technical design](./DESIGN.md)
- [AI usage record](./AI_USAGE.md)
- [Implementation notes](./docs/IMPLEMENTATION.md)

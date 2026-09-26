# Implementation notes

## Runtime architecture

The Next.js app uses server route handlers and a server-only Supabase client. PostgreSQL owns the final state change. The browser only sends booking details and mock payment outcomes.

`POST /api/bookings/:id/payment` calls `process_mock_payment`. That PostgreSQL function locks the booking, records one payment attempt, then locks the target `trial_classes` row with `FOR UPDATE` before checking duplicate confirmation and confirmed capacity.

## Constraints

- UUID primary keys and foreign keys on `parents`, `students`, `trial_classes`, `bookings`, and `payment_attempts`.
- `trial_classes.capacity` is constrained to 1 through 4.
- `uniq_confirmed_student_trial_class` is a partial unique index on confirmed bookings.
- Terminal payment handling is idempotent: it returns the existing state and does not add another payment attempt.

## Verification

`npm test` starts a fresh embedded PostgreSQL runtime for each test and executes `supabase/schema.sql`, `supabase/seed.sql`, and the production `process_mock_payment` function. The race test sends two success calls through that function with `Promise.all` and checks for one winner and a final confirmed count of four.

`npm run verify:scenarios` is a readable database-level walkthrough of normal, failed, duplicate, full-class, roster-filter, and last-seat paths.

PGlite is used only for repeatable local test execution. Production and the Next.js runtime use Supabase's Data API with a server-only secret key; payment confirmation remains a PostgreSQL RPC.

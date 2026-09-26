# DESIGN — Ottodot TrialGuard

## 1. Design Objective

Build a small but unusually well-explained trial-booking system.

The implementation should combine:

```text
Playful EdTech product experience
+
Backend and database reliability
+
Visible concurrency demonstration
```

The design should feel visually premium while remaining technically disciplined.

---

## 2. Architecture

```text
┌────────────────────────────────────────────────┐
│                Next.js Frontend                │
│                                                │
│ Parent Booking                                 │
│ Booking Status                                 │
│ Admin / Teacher Roster                         │
│ Reliability Lab                                │
└──────────────────────┬─────────────────────────┘
                       │
                       │ Server Routes / Actions
                       ▼
┌────────────────────────────────────────────────┐
│               Application Layer                │
│                                                │
│ Input Validation                               │
│ Parent Ownership Validation                    │
│ Booking Service                                │
│ Payment Service                                │
│ Roster Queries                                 │
│ Reliability Scenario Runner                    │
└──────────────────────┬─────────────────────────┘
                       │
                       ▼
┌────────────────────────────────────────────────┐
│              PostgreSQL / Supabase             │
│                                                │
│ parents                                        │
│ students                                       │
│ trial_classes                                  │
│ bookings                                       │
│ payment_attempts                               │
│                                                │
│ partial unique index                           │
│ row-level locking                              │
│ atomic confirmation transaction                │
└────────────────────────────────────────────────┘
```

---

## 3. Technology Decisions

### Next.js + TypeScript

Reasons:

- fast full-stack iteration
- route handlers/server actions
- strong typing
- simple deployment

### PostgreSQL / Supabase

Reasons:

- relational domain fits booking system
- transactions
- partial unique indexes
- row-level locks
- easy demo setup

### Tailwind

Reasons:

- fast custom UI
- no need to copy template CSS
- easy design-token consistency

### Vitest

Reasons:

- lightweight
- TypeScript-friendly
- easy domain/integration testing

---

## 4. Database Schema

### Parents

```sql
create table parents (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  created_at timestamptz not null default now()
);
```

### Students

```sql
create table students (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references parents(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create index idx_students_parent_id
on students(parent_id);
```

### Trial Classes

```sql
create table trial_classes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subject text,
  teacher_name text,
  starts_at timestamptz not null,
  capacity integer not null default 4 check (capacity > 0),
  created_at timestamptz not null default now()
);
```

For seeded data:

```text
capacity = 4
```

### Booking Status

```sql
create type booking_status as enum (
  'pending_payment',
  'confirmed',
  'payment_failed',
  'cancelled'
);
```

### Bookings

```sql
create table bookings (
  id uuid primary key default gen_random_uuid(),

  parent_id uuid not null references parents(id),
  student_id uuid not null references students(id),
  trial_class_id uuid not null references trial_classes(id),

  status booking_status not null default 'pending_payment',
  status_reason text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_bookings_trial_class
on bookings(trial_class_id);

create index idx_bookings_student
on bookings(student_id);
```

### Duplicate Protection

```sql
create unique index uniq_confirmed_student_trial_class
on bookings(student_id, trial_class_id)
where status = 'confirmed';
```

### Payment Attempts

```sql
create type payment_outcome as enum (
  'success',
  'failure'
);

create table payment_attempts (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  outcome payment_outcome not null,
  created_at timestamptz not null default now()
);

create index idx_payment_attempts_booking
on payment_attempts(booking_id);
```

---

## 5. Atomic Confirmation Design

Final confirmation must occur in the database transaction.

Pseudo algorithm:

```text
BEGIN

lock booking row

if booking is already terminal
  return current state

record payment attempt

if payment failure
  booking → payment_failed
  COMMIT

if payment success
  lock trial class row

  check duplicate confirmed booking

  count confirmed bookings for class

  if duplicate
    booking → cancelled / duplicate_confirmed_booking

  else if confirmed_count >= capacity
    booking → cancelled / class_full

  else
    booking → confirmed

COMMIT
```

---

## 6. PostgreSQL Function

Illustrative implementation:

```sql
create or replace function process_mock_payment(
  p_booking_id uuid,
  p_outcome payment_outcome
)
returns table (
  booking_id uuid,
  final_status booking_status,
  reason text
)
language plpgsql
as $$
declare
  v_booking bookings%rowtype;
  v_capacity integer;
  v_confirmed_count integer;
  v_duplicate_exists boolean;
begin

  select *
  into v_booking
  from bookings
  where id = p_booking_id
  for update;

  if not found then
    raise exception 'BOOKING_NOT_FOUND';
  end if;

  if v_booking.status <> 'pending_payment' then
    return query
    select v_booking.id, v_booking.status, v_booking.status_reason;
    return;
  end if;

  insert into payment_attempts (booking_id, outcome)
  values (p_booking_id, p_outcome);

  if p_outcome = 'failure' then
    update bookings
    set
      status = 'payment_failed',
      status_reason = 'payment_failed',
      updated_at = now()
    where id = p_booking_id;

    return query
    select
      p_booking_id,
      'payment_failed'::booking_status,
      'payment_failed'::text;

    return;
  end if;

  select capacity
  into v_capacity
  from trial_classes
  where id = v_booking.trial_class_id
  for update;

  if not found then
    raise exception 'TRIAL_CLASS_NOT_FOUND';
  end if;

  select exists (
    select 1
    from bookings
    where student_id = v_booking.student_id
      and trial_class_id = v_booking.trial_class_id
      and status = 'confirmed'
      and id <> v_booking.id
  )
  into v_duplicate_exists;

  if v_duplicate_exists then
    update bookings
    set
      status = 'cancelled',
      status_reason = 'duplicate_confirmed_booking',
      updated_at = now()
    where id = p_booking_id;

    return query
    select
      p_booking_id,
      'cancelled'::booking_status,
      'duplicate_confirmed_booking'::text;

    return;
  end if;

  select count(*)
  into v_confirmed_count
  from bookings
  where trial_class_id = v_booking.trial_class_id
    and status = 'confirmed';

  if v_confirmed_count >= v_capacity then
    update bookings
    set
      status = 'cancelled',
      status_reason = 'class_full',
      updated_at = now()
    where id = p_booking_id;

    return query
    select
      p_booking_id,
      'cancelled'::booking_status,
      'class_full'::text;

    return;
  end if;

  update bookings
  set
    status = 'confirmed',
    status_reason = null,
    updated_at = now()
  where id = p_booking_id;

  return query
  select
    p_booking_id,
    'confirmed'::booking_status,
    null::text;
end;
$$;
```

---

## 7. Last-Seat Concurrency Reasoning

Start:

```text
capacity = 4
confirmed = 3
```

Bookings A and B are pending.

Both call successful payment at nearly the same time.

```text
T0 A request starts
T0 B request starts

T1 B locks class row
T2 A waits

T3 B counts confirmed = 3
T4 B confirms
T5 B commits

T6 A obtains class row lock
T7 A counts confirmed = 4
T8 A becomes cancelled / class_full
T9 A commits
```

This serialization is intentional.

The transaction is short, and the class contains very few seats, so the tradeoff is acceptable.

---

## 8. API Contracts

### GET `/api/trial-classes`

Response:

```json
[
  {
    "id": "uuid",
    "title": "Math Explorers",
    "subject": "Math",
    "teacherName": "Ms. Maya",
    "startsAt": "2026-10-03T10:00:00Z",
    "capacity": 4,
    "confirmedCount": 3,
    "remainingSeats": 1
  }
]
```

### POST `/api/bookings`

Request:

```json
{
  "parentId": "uuid",
  "studentId": "uuid",
  "trialClassId": "uuid"
}
```

Response:

```json
{
  "id": "uuid",
  "status": "pending_payment"
}
```

### GET `/api/bookings/:id`

Response:

```json
{
  "id": "uuid",
  "status": "confirmed",
  "statusReason": null,
  "student": {
    "id": "uuid",
    "name": "Alya"
  },
  "trialClass": {
    "id": "uuid",
    "title": "Math Explorers"
  }
}
```

### POST `/api/bookings/:id/payment`

Request:

```json
{
  "outcome": "success"
}
```

Response:

```json
{
  "bookingId": "uuid",
  "status": "confirmed",
  "reason": null
}
```

### GET `/api/trial-classes/:id/roster`

Response:

```json
{
  "trialClass": {
    "id": "uuid",
    "title": "Math Explorers",
    "capacity": 4
  },
  "confirmedCount": 4,
  "students": [
    {
      "id": "uuid",
      "name": "Alya"
    }
  ]
}
```

### POST `/api/reliability/last-seat-race`

Purpose:

Create/reset deterministic test state and run two confirmation calls concurrently.

Response:

```json
{
  "before": {
    "capacity": 4,
    "confirmed": 3
  },
  "competitors": [
    {
      "label": "A",
      "bookingId": "...",
      "status": "confirmed"
    },
    {
      "label": "B",
      "bookingId": "...",
      "status": "cancelled",
      "reason": "class_full"
    }
  ],
  "after": {
    "confirmed": 4
  },
  "invariants": {
    "capacityPreserved": true,
    "exactlyOneWinner": true
  }
}
```

---

## 9. Validation

Use Zod.

```ts
const CreateBookingSchema = z.object({
  parentId: z.string().uuid(),
  studentId: z.string().uuid(),
  trialClassId: z.string().uuid()
})

const PaymentSchema = z.object({
  outcome: z.enum(["success", "failure"])
})
```

---

## 10. Stable Errors

Recommended machine codes:

```text
INVALID_INPUT
PARENT_NOT_FOUND
STUDENT_NOT_FOUND
STUDENT_NOT_OWNED_BY_PARENT
TRIAL_CLASS_NOT_FOUND
BOOKING_NOT_FOUND
ALREADY_CONFIRMED
CLASS_FULL
INVALID_PAYMENT_OUTCOME
```

Response:

```json
{
  "error": {
    "code": "CLASS_FULL",
    "message": "The trial class no longer has an available seat."
  }
}
```

---

## 11. Idempotency

If payment is posted again to a terminal booking:

```text
confirmed
payment_failed
cancelled
```

return existing state.

Do not create a second confirmation.

A production implementation would additionally use payment provider event IDs / idempotency keys.

---

## 12. Page Design

## `/` — Parent Booking

### Header

Inspired by playful education websites:

```text
TrialGuard logo
Book Trial
How It Works
Classes
Reliability Lab
Admin
```

CTA:

```text
Start Trial Booking →
```

### Hero

Cream background.

Left:

```text
Reliable trial classes.
Happy learning.

A friendly booking experience
protected by serious backend reliability.
```

Buttons:

```text
Book a Trial
See Reliability Lab
```

Right:

Original/custom education/science illustration or licensed image.

Decorations:

- pencil
- atom
- star
- small rocket
- abstract doodles

### Booking Steps

Pastel cards:

```text
01 Choose a Child
02 Pick a Class
03 Mock Payment
04 Seat Confirmed
```

### Trial Classes

Purple section.

Cards:

```text
Math Explorers
Science Explorers
Coding Explorers
```

Each:

```text
date
teacher
subject
four seat indicators
Book Trial
```

### Why TrialGuard

White section.

Four benefits:

```text
Atomic confirmation
No overbooking
Payment-safe roster
Duplicate protection
```

### Reliability CTA

Yellow panel:

```text
Can two parents win the same final seat?

Run the experiment.
```

Button:

```text
Open Reliability Lab →
```

---

## 13. `/booking/[id]`

Layout:

- playful booking header
- booking card
- mock payment panel
- event timeline

Example timeline:

```text
✓ Booking Created
✓ Payment Approved
✓ Capacity Revalidated
✓ Seat Secured
```

Failed:

```text
✓ Booking Created
✕ Payment Failed
```

Lost race:

```text
✓ Booking Created
✓ Payment Approved
✓ Capacity Revalidated
✕ Class reached capacity
```

---

## 14. `/admin`

Use a purple operations band + white cards.

Summary:

```text
Confirmed Students
Payment Failures
Blocked Duplicates
Active Trial Classes
```

Reliability guard panel:

```text
Capacity Guard       ACTIVE
Duplicate Guard      ACTIVE
Payment Safety       ACTIVE
Atomic Confirmation  ACTIVE
```

Roster:

```text
Math Explorers
4 / 4

1. Alya       Confirmed
2. Kevin      Confirmed
3. Mia        Confirmed
4. Rafi       Confirmed
```

---

## 15. `/reliability-lab`

This is the signature feature.

Visual direction:

```text
playful science laboratory
+
engineering observability console
```

### Top

Purple section.

```text
Reliability Lab

Let's race two bookings for one final seat.
```

### Scenario tabs

```text
Normal
Payment Failure
Duplicate
Full Class
Last Seat Race
```

### Experiment panel

Yellow large card.

```text
LAST-SEAT RACE

CLASS
Math Explorers

● ● ● ○
3 confirmed • 1 remaining
```

Competitors:

```text
Booking A
Alya

Booking B
Rafi
```

Button:

```text
Run Concurrent Confirmation
```

### Result

```text
Booking A       CONFIRMED
Booking B       CLASS_FULL

FINAL ROSTER    4 / 4

✓ Capacity invariant preserved
✓ Exactly one winner
✓ No overbooking
```

### Technical event stream

Monospace:

```text
10:21:06.102  request A started
10:21:06.104  request B started
10:21:06.109  B acquired class lock
10:21:06.111  A waiting
10:21:06.121  B confirmed
10:21:06.128  B committed
10:21:06.131  A acquired class lock
10:21:06.137  A rejected: class_full
```

Exact timing values may be generated for demonstration and should not be presented as database facts unless actually measured.

---

## 16. Design Tokens

```css
:root {
  --tg-purple: #6754E9;
  --tg-purple-dark: #4030C9;
  --tg-orange: #F16026;
  --tg-yellow: #FFE600;
  --tg-cream: #F8FAE2;
  --tg-ink: #171721;
  --tg-muted: #5E6577;

  --tg-pink-soft: #FFDEE4;
  --tg-blue-soft: #E8ECFA;
  --tg-mint-soft: #DEFFF9;
  --tg-peach-soft: #FFE7D7;

  --tg-success: #1F9D67;
  --tg-danger: #D84B4B;

  --radius-card: 28px;
  --radius-pill: 999px;
}
```

---

## 17. Typography

```text
Fredoka
  Hero
  Section headings
  Buttons
  Stat numbers

Nunito Sans
  Paragraphs
  Labels
  Forms

JetBrains Mono
  SQL
  Logs
  Request IDs
```

---

## 18. Component Inventory

```text
Header
Hero
DoodleDecoration
StepCard
TrialClassCard
SeatIndicator
BookingForm
StatusBadge
BookingTimeline
MockPaymentCard
RosterCard
ReliabilityMetric
GuardStatusCard
ScenarioTabs
RaceCompetitorCard
RaceResultPanel
TechnicalLog
Footer
```

---

## 19. Motion

Use motion only for clarity.

Examples:

- cards float 2–4 px on hover
- seat dots fill smoothly
- status timeline reveals sequentially
- race competitors animate toward confirmation
- result badge pops subtly

Avoid:

- long intro animation
- scroll hijacking
- excessive parallax
- animation that delays testing/demo

---

## 20. Accessibility

- semantic headings
- visible keyboard focus
- button labels
- no color-only status indication
- high enough contrast
- descriptive error text
- motion respects reduced-motion preference

---

## 21. Seed Plan

```text
Parent Maya
  Alya
  Rafi

Parent Daniel
  Kevin

Parent Sarah
  Mia
  Noah

Parent John
  Leo
```

Classes:

```text
Science Explorers
capacity 4
confirmed 1

Math Explorers
capacity 4
confirmed 3

Coding Explorers
capacity 4
confirmed 4
```

Use deterministic IDs in seed where convenient for tests/demo.

---

## 22. Tests

### Successful Confirmation

```text
1 confirmed
+ successful booking
= 2 confirmed
```

### Payment Failure

```text
payment_failed
not in roster
confirmed count unchanged
```

### Duplicate

```text
same child
same class
existing confirmed
=> second confirmed impossible
```

### Full Class

```text
4 / 4
successful payment attempt
=> cancelled / class_full
```

### Last-Seat Race

```ts
const [a, b] = await Promise.all([
  processPayment(bookingA, "success"),
  processPayment(bookingB, "success")
])

expect(await confirmedCount(classId)).toBe(4)

expect(
  [a, b].filter(x => x.status === "confirmed")
).toHaveLength(1)
```

### Roster

Only confirmed entries.

### Parent Ownership

Parent cannot create a booking using another parent's child.

---

## 23. Production Observability

Queries worth monitoring:

```sql
select trial_class_id, count(*)
from bookings
where status = 'confirmed'
group by trial_class_id
having count(*) > 4;
```

Expected:

```text
0 rows
```

Metrics:

```text
booking_attempt_total
booking_confirmed_total
payment_failed_total
class_full_total
duplicate_blocked_total
confirmation_latency
transaction_error_total
```

---

## 24. Security

- no real payment data
- synthetic personal data only
- server-side service role only
- `.env.local` ignored
- `.env.example` contains names only
- validate payloads
- no raw DB errors in client
- no dangerous client-side privileged Supabase key

---

## 25. Tradeoffs

### Row Lock

Chosen because:

- database-native
- simple
- correct
- no distributed locking dependency

Tradeoff:

- confirmations for one class serialize

Acceptable for 4-seat classes.

### Count Rows Instead of Seat Counter

Chosen because:

- source of truth remains bookings
- no counter drift

Tradeoff:

- aggregate query inside transaction

Negligible at this scale.

### Minimal Authentication

Not implemented.

Reason:

- synthetic take-home
- not part of required reliability scenario

---

## 26. Cut Order

If time is short:

```text
1. Keep database invariants
2. Keep booking/payment/roster
3. Keep race test
4. Keep minimal Reliability Lab
5. Cut decorative animations
6. Cut extra stats
7. Cut non-essential visual sections
```

Never cut concurrency correctness to preserve decoration.

---

## 27. Implementation Order

### Phase 1

```text
Next.js project
Supabase
schema
seed
```

### Phase 2

```text
booking creation
payment RPC
roster
```

### Phase 3

```text
tests
last-seat race
```

### Phase 4

```text
parent UI
booking status
admin
```

### Phase 5

```text
Reliability Lab
```

### Phase 6

```text
README
AI_USAGE
cleanup
walkthrough
```

---

## 28. Final Design Rule

The product should leave the reviewer with two impressions:

> **This feels like a real education product.**

and then:

> **This candidate understands why booking systems fail under concurrency.**

## 29. Agent Skills Workflow

The implementation may use five complementary skills. They must be applied in phases so that visual or editorial tooling never overrides backend correctness.

### 29.1 Ponytail — Engineering Discipline

Use from the beginning through final review.

Responsibilities:

- reduce unnecessary abstractions
- avoid unnecessary dependencies
- prefer platform/database-native capabilities
- keep the take-home scope small
- reuse existing repository patterns where appropriate
- simplify code without deleting safety mechanisms

Ponytail must **not** simplify away:

```text
PostgreSQL transactions
SELECT ... FOR UPDATE
partial unique index
foreign keys
request validation
error handling
tests
security boundaries
accessibility
```

Before adding a library or abstraction:

1. Does this feature need to exist?
2. Is there already a solution in the repository?
3. Can Next.js/PostgreSQL/Supabase solve it directly?
4. Is a suitable dependency already installed?
5. Only then add the minimum necessary solution.

---

### 29.2 UI UX Pro Max — Product & Interface Quality

Use after the product flow and technical invariants are understood, and continue during UI implementation.

Responsibilities:

- information hierarchy
- navigation
- forms
- CTA hierarchy
- typography
- color usage
- cards
- responsive behavior
- mobile usability
- error/success states
- accessibility review

Product classification:

```text
EdTech
Parent-facing booking
Playful but trustworthy
Responsive web application
Engineering reliability showcase
```

The visual direction remains defined by this document:

```text
cream canvas
purple structural sections
orange CTAs
yellow highlights
pastel cards
organic/wavy separators
science/education doodles
friendly rounded typography
```

Do not replace TrialGuard with a generic dark SaaS dashboard.

---

### 29.3 Scroll Craft — Premium Interaction Layer

Use only after all of these are working:

```text
schema
seed data
booking creation
mock payment
roster
duplicate protection
capacity protection
last-seat race test
```

Allowed uses:

- hero entrance
- subtle section reveals
- card motion
- seat-indicator animation
- wavy/scalloped section transitions
- Reliability Lab experiment animation
- small motion cues that explain state changes

Do not use it for:

- scroll-jacking
- long intro sequences
- motion that blocks controls
- heavy video backgrounds
- replacing application architecture
- hiding error or status information
- creating animation before the core tests pass

Run the skill's environment/doctor checks where supported. If the tooling is unreliable in the environment, reproduce the intended interaction principles manually rather than blocking the submission.

---

### 29.4 no-ai-slop — Human-Facing Writing Review

Apply to prose only after the technical facts are stable.

Review:

```text
README
UI headings
button labels
booking messages
Reliability Lab explanations
project description
walkthrough script
```

Do not rewrite:

```text
SQL
source code
API payloads
identifiers
test names
database status values
precise technical terms
```

The goal is clearer, more natural writing—not stylistic novelty.

---

### 29.5 unslop — Final Editorial Pass

Use last, after the implementation and documentation are technically final.

Review:

- README prose
- AI_USAGE prose
- supporting UI copy
- demo script

Never change:

```text
requirements
numbers
test output
measured timings
API names
SQL
code
architecture claims
```

Reject any editorial change that alters technical meaning.

---

## 30. Skill Conflict Resolution

If two skills disagree, follow this order:

```text
1. Ottodot take-home requirements
2. Database invariants and correctness
3. Tests and verified behavior
4. Ponytail
5. UI UX Pro Max
6. Scroll Craft
7. no-ai-slop / unslop
```

Correctness always wins over presentation.

---

## 31. Recommended Skill Execution Phases

### Phase A — Core Engineering

```text
Ponytail
  ↓
Repository inspection
  ↓
Schema
  ↓
Atomic confirmation
  ↓
APIs
  ↓
Tests
```

Exit criteria:

```text
normal booking passes
payment failure passes
duplicate protection passes
full-class rejection passes
last-seat race passes
```

### Phase B — Product UX

```text
UI UX Pro Max
  ↓
Home
Booking status
Admin
Reliability Lab
Responsive behavior
Accessibility
```

Exit criteria:

```text
all P0 flows usable on desktop and mobile
errors understandable
status never conveyed by color alone
```

### Phase C — Premium Polish

```text
Scroll Craft
  ↓
Selective motion
Micro-interactions
Section reveals
Race visualization
```

Exit criteria:

```text
no blocked interactions
no scroll-jacking
reduced-motion respected
performance remains acceptable
```

### Phase D — Editorial Cleanup

```text
no-ai-slop
  ↓
unslop
```

Exit criteria:

```text
copy sounds natural
technical meaning unchanged
README remains factual
AI_USAGE remains truthful
```

### Phase E — Final Verification

```text
Ponytail review
npm run lint
npm run build
npm test
manual flows
race demo
```

Never claim completion if one of these checks was not actually run.

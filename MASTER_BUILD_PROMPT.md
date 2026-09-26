# MASTER BUILD PROMPT — OTTODOT TRIALGUARD

You are a senior full-stack engineer working inside an existing or empty repository.

Your task is to build a complete take-home submission called:

# Ottodot TrialGuard

**Tagline:** Book confidently. Confirm atomically. Never overbook.

You must work autonomously and carry the implementation from repository inspection through final verification.

Do not stop after planning.

Do not only explain code.

Create the actual files, implementation, SQL, tests, documentation, and polished UI.

---

# 1. SOURCE OF TRUTH

Before coding, read these files if they exist:

```text
README.md
docs/PRD.md
docs/DESIGN.md
AI_USAGE.md
```

Treat `docs/PRD.md` as the product requirements.

Treat `docs/DESIGN.md` as the intended technical architecture.

If they conflict:

1. preserve the take-home requirements
2. preserve booking invariants
3. prefer the simplest correct implementation
4. document any deviation in README

Do not silently invent business requirements.

---

# REQUIRED AGENT SKILLS

This project uses five complementary agent skills.

Use them according to their responsibilities below.

Supporting skills are advisory. They are not the source of product truth.

Never allow UI, animation, simplification, or writing tools to override verified backend behavior.

---

## SKILL 1 — Ponytail

Role:

```text
Engineering discipline and anti-overengineering
```

Use throughout the entire implementation.

Apply it to:

- repository inspection
- dependency decisions
- abstraction decisions
- reducing unnecessary code
- keeping the project inside the take-home scope
- preferring native Next.js/PostgreSQL/Supabase capabilities

Before adding a dependency or abstraction, evaluate:

1. Is it required?
2. Is the same capability already present?
3. Can the platform/database solve it natively?
4. Is a suitable dependency already installed?
5. If implementation is still required, build the minimum necessary solution.

Ponytail must NOT simplify away:

```text
transactions
row-level locking
partial unique index
foreign keys
input validation
authorization boundaries
error handling
security
accessibility
tests
```

Do not trade correctness for fewer lines of code.

---

## SKILL 2 — UI UX Pro Max

Role:

```text
Product UX and interface design quality
```

Use before and during UI implementation.

Analyze this product as:

```text
EdTech
parent-facing trial booking
playful but trustworthy
responsive web application
reliability engineering showcase
```

Use the skill to review:

- page hierarchy
- CTA hierarchy
- navigation
- forms
- class cards
- status display
- error states
- success states
- responsive breakpoints
- mobile usability
- accessibility
- visual consistency

The visual source of truth remains:

```text
docs/DESIGN.md
```

Do not convert the project into a generic SaaS admin dashboard.

---

## SKILL 3 — Scroll Craft

Role:

```text
Premium interaction and scroll polish
```

Do NOT use Scroll Craft until all core behavior passes.

Preconditions:

```text
schema complete
seed complete
booking works
mock payment works
admin roster works
duplicate protection works
full-class protection works
real database-backed last-seat race test passes
```

Allowed uses:

- hero entrance
- subtle section reveals
- seat indicator animation
- card hover/entrance
- wavy/scalloped transitions
- Reliability Lab experiment animation
- small visual cues that explain status

Forbidden uses:

- scroll-jacking
- long blocking intros
- animation that hides controls
- heavy unnecessary video assets
- replacing application architecture
- reducing accessibility
- delaying backend completion

Run the skill's environment or doctor verification where supported.

If its runtime is unreliable in the current environment, implement the intended motion principles manually rather than blocking the project.

Respect `prefers-reduced-motion`.

---

## SKILL 4 — no-ai-slop

Role:

```text
Human-facing writing cleanup
```

Apply only after technical content is stable.

Review:

```text
README
UI headings
buttons
booking messages
Reliability Lab explanation
project description
walkthrough script
```

Do not rewrite:

```text
source code
SQL
API payloads
identifiers
status enum values
test output
precise technical terminology
```

Natural writing must never reduce technical precision.

---

## SKILL 5 — unslop

Role:

```text
Final editorial pass
```

Run only after implementation, tests, and technical documentation are final.

May improve:

- README prose
- AI_USAGE prose
- UI supporting copy
- walkthrough script

Must never change:

```text
requirements
numbers
measured timings
test results
API names
SQL
code
architecture claims
```

If an editorial rewrite changes technical meaning, reject it.

---

## SKILL PRIORITY

When recommendations conflict, apply this strict order:

```text
1. Ottodot take-home requirements
2. Database correctness and business invariants
3. Tests and actually verified behavior
4. Ponytail
5. UI UX Pro Max
6. Scroll Craft
7. no-ai-slop / unslop
```

Correctness always wins over visual polish.

---

## REQUIRED SKILL EXECUTION ORDER

### PHASE A — Core Engineering

Use:

```text
Ponytail
```

Complete:

```text
repository inspection
schema
seed data
atomic booking confirmation
APIs/server actions
admin roster
tests
last-seat race
```

Do not proceed to premium animation until the race test passes.

### PHASE B — Product UX

Use:

```text
UI UX Pro Max
```

Build/review:

```text
home
booking status
admin
Reliability Lab
responsive behavior
accessibility
```

### PHASE C — Premium Polish

Use:

```text
Scroll Craft
```

Apply selectively.

Do not rewrite core architecture.

### PHASE D — Writing

Use:

```text
no-ai-slop
then
unslop
```

Only on human-facing prose.

### PHASE E — Final Verification

Use Ponytail for one final simplicity/scope review, then run:

```bash
npm run lint
npm run build
npm test
```

Also manually verify every required scenario.

Do not report a test/check as successful unless it actually ran successfully.

---

# 2. PRODUCT OBJECTIVE

Build the smallest reliable slice of a trial-class booking system.

The user flow must allow:

1. parent selects a child
2. parent selects a trial class
3. parent submits a trial booking
4. booking enters `pending_payment`
5. parent runs a mock payment success or failure
6. final booking status is displayed
7. admin/teacher can see the confirmed roster

Each trial class has a strict maximum of:

```text
4 confirmed students
```

---

# 3. NON-NEGOTIABLE BUSINESS INVARIANTS

The implementation is incorrect if any of these can be violated.

## Invariant A — Capacity

```text
confirmed_count(trial_class) <= capacity
```

For seeded classes:

```text
capacity = 4
```

## Invariant B — Duplicate Confirmation

```text
at most one confirmed booking
per student
per trial class
```

## Invariant C — Payment Failure

A booking with:

```text
status = payment_failed
```

must never appear in the confirmed roster.

## Invariant D — Last Seat Race

Start with:

```text
capacity = 4
confirmed = 3
```

Create two different pending bookings.

Trigger successful payment for both concurrently.

Expected:

```text
exactly one becomes confirmed
the other becomes cancelled/class_full
final confirmed count = 4
```

Never solve this only with frontend checks.

Never solve this only with:

```ts
if (remainingSeats > 0)
```

Final enforcement must be inside the database transaction.

---

# 4. REQUIRED STACK

Prefer:

```text
Next.js
TypeScript
React
Tailwind CSS
PostgreSQL
Supabase
Zod
Vitest
```

Optional:

```text
Lucide Icons
Framer Motion
```

Do not introduce heavy dependencies without a real need.

---

# 5. DATABASE MODEL

Implement these concepts:

```text
parents
students
trial_classes
bookings
payment_attempts
```

Use UUID primary keys.

Use proper foreign keys.

Use timestamps.

Booking statuses:

```text
pending_payment
confirmed
payment_failed
cancelled
```

Payment outcomes:

```text
success
failure
```

---

# 6. DUPLICATE PROTECTION

Create a PostgreSQL partial unique index equivalent to:

```sql
create unique index uniq_confirmed_student_trial_class
on bookings(student_id, trial_class_id)
where status = 'confirmed';
```

Do not rely solely on an application query.

---

# 7. CONCURRENCY-SAFE CONFIRMATION

Implement final confirmation in PostgreSQL.

Preferred approach:

1. lock booking row
2. short-circuit if booking is already terminal
3. record payment attempt
4. if payment fails:
   - mark `payment_failed`
   - return
5. if payment succeeds:
   - lock the target `trial_classes` row with `SELECT ... FOR UPDATE`
   - check existing confirmed booking for same child/class
   - count current confirmed bookings
   - if duplicate:
     - mark cancelled
     - reason `duplicate_confirmed_booking`
   - else if full:
     - mark cancelled
     - reason `class_full`
   - else:
     - mark confirmed
6. commit

The target class row lock must serialize confirmation attempts for the same class.

Keep the transaction short.

---

# 8. IDEMPOTENCY

A repeated payment request for a terminal booking must not create a second side effect.

Terminal:

```text
confirmed
payment_failed
cancelled
```

Return existing state.

Document how a real payment provider would additionally use provider event IDs or idempotency keys.

---

# 9. SEED DATA

Create deterministic synthetic data.

Minimum:

```text
4 parents
6 students
3 or 4 trial classes
```

Required scenarios:

## Available Class

```text
Science Explorers
1 confirmed
capacity 4
```

## Last Seat

```text
Math Explorers
3 confirmed
capacity 4
```

## Full Class

```text
Coding Explorers
4 confirmed
capacity 4
```

## Duplicate Scenario

One child already has a confirmed booking for one class.

Use obviously synthetic names.

---

# 10. REQUIRED APPLICATION ROUTES

Build:

```text
/                       Parent booking
/booking/[bookingId]    Booking status + mock payment
/admin                  Admin/teacher roster
/reliability-lab        Reliability demonstration
```

API / server capabilities:

```text
GET  trial classes
POST create booking
GET  booking detail
POST mock payment
GET  roster
POST run last-seat race
```

You may implement with route handlers, server actions, or a clean combination.

---

# 11. PARENT BOOKING EXPERIENCE

The `/` page should feel like a premium playful EdTech site.

It must not look like a generic SaaS admin dashboard.

Use visual direction inspired by premium kindergarten / education landing pages:

```text
warm cream canvas
large playful heading
purple sections
orange buttons
bright yellow highlights
pastel program cards
rounded organic corners
wave/scallop section transitions
education/science doodles
generous whitespace
```

Do not copy paid template source code.

Do not use proprietary ThemeForest assets unless licensed and available.

Create original React/Tailwind components.

Use original SVG doodles, simple CSS shapes, Lucide icons, or properly licensed/free assets.

---

# 12. VISUAL TOKENS

Start with:

```css
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
```

Typography direction:

```text
Fredoka — headings
Nunito Sans — body
JetBrains Mono — technical logs
```

If remote fonts make setup fragile, use sensible fallbacks.

---

# 13. HOME PAGE SECTIONS

Build these sections in this order:

## Sticky Header

Navigation:

```text
TrialGuard
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

## Hero

Headline:

```text
Reliable trial classes.
Happy learning.
```

Supporting copy:

```text
A friendly booking experience protected by serious backend reliability.
```

Buttons:

```text
Book a Trial
Open Reliability Lab
```

Use playful educational/science graphics.

## How It Works

Four pastel cards:

```text
01 Choose a Child
02 Pick a Class
03 Mock Payment
04 Seat Confirmed
```

## Trial Classes

Purple section.

Cards for seeded classes.

Each card shows:

```text
title
subject
teacher
date/time
4 seat indicators
remaining seats
Book Trial
```

## Why TrialGuard

Four feature blocks:

```text
Atomic Confirmation
No Overbooking
Payment-Safe Roster
Duplicate Protection
```

## Reliability CTA

Bright yellow panel.

Copy:

```text
Can two parents win the same final seat?

Run the experiment.
```

CTA:

```text
Open Reliability Lab →
```

## Footer

Playful cream footer with original doodle treatment.

---

# 14. BOOKING PAGE

`/booking/[bookingId]`

Display:

```text
booking ID
child
class
status
status reason
```

If pending:

```text
Mock Payment Gateway

Simulate Success
Simulate Failure
```

Add explicit note:

```text
This is a mock transaction. No real payment is processed.
```

Add timeline.

Confirmed:

```text
✓ Booking Created
✓ Payment Approved
✓ Capacity Revalidated
✓ Seat Secured
```

Failure:

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

# 15. ADMIN PAGE

`/admin`

Display summary cards:

```text
Confirmed Students
Payment Failures
Blocked Duplicates
Active Trial Classes
```

Guard panel:

```text
Capacity Guard       ACTIVE
Duplicate Guard      ACTIVE
Payment Safety       ACTIVE
Atomic Confirmation  ACTIVE
```

Class roster cards:

```text
Math Explorers
4 / 4

Alya   Confirmed
Kevin  Confirmed
Mia    Confirmed
Rafi   Confirmed
```

Only query `confirmed` bookings for roster students.

---

# 16. RELIABILITY LAB — SIGNATURE FEATURE

This page is the main differentiator.

Route:

```text
/reliability-lab
```

Make it feel like a playful science experiment combined with an engineering console.

Top:

```text
Reliability Lab

Race two bookings for one final seat.
```

Tabs:

```text
Normal
Payment Failure
Duplicate
Full Class
Last Seat Race
```

The P0 demo is:

```text
Last Seat Race
```

Panel:

```text
Math Explorers

● ● ● ○

3 confirmed
1 seat remaining
```

Show:

```text
Booking A — Alya
Booking B — Rafi
```

CTA:

```text
Run Concurrent Confirmation
```

When clicked, call the actual backend race scenario.

Do not fake the final business result.

Display real API result:

```text
A  CONFIRMED
B  CLASS_FULL

or

A  CLASS_FULL
B  CONFIRMED
```

Then:

```text
FINAL ROSTER 4 / 4

✓ Capacity invariant preserved
✓ Exactly one winner
✓ No overbooking
```

Also show a compact technical timeline.

If exact database lock times are not available, do not fabricate measured timing.

You may show logical event ordering instead:

```text
B acquired class lock
A waited for class lock
B confirmed and committed
A re-checked capacity
A rejected as class_full
```

---

# 17. RELIABILITY API

Create a deterministic way to demo the last-seat race.

A route such as:

```text
POST /api/reliability/last-seat-race
```

may:

1. reset/create a dedicated synthetic class
2. seed exactly 3 confirmed students
3. create pending booking A
4. create pending booking B
5. execute both payment-success calls concurrently with `Promise.all`
6. query final roster
7. return both outcomes + invariants

Response:

```json
{
  "before": {
    "confirmed": 3,
    "capacity": 4
  },
  "competitors": [
    {
      "label": "A",
      "status": "confirmed"
    },
    {
      "label": "B",
      "status": "cancelled",
      "reason": "class_full"
    }
  ],
  "after": {
    "confirmed": 4
  },
  "invariants": {
    "capacityPreserved": true,
    "exactlyOneWinner": true,
    "noOverbooking": true
  }
}
```

Ensure reset logic itself does not make the test flaky.

---

# 18. TESTS

Write automated tests for:

```text
successful booking
payment failure
duplicate protection
full class
roster filtering
parent ownership
last-seat race
idempotent terminal payment
```

Critical concurrency test:

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

Do not write a fake unit test that bypasses the database lock.

The race test should exercise the real confirmation path.

---

# 19. ERROR HANDLING

Use stable codes:

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

Do not expose raw SQL error messages to the UI.

---

# 20. SECURITY

Required:

- synthetic demo data only
- secrets only in environment variables
- service role only server-side
- `.env.local` ignored
- `.env.example` provided
- request validation
- no secret keys in client bundle

---

# 21. ACCESSIBILITY

Implement:

- semantic headings
- button labels
- keyboard focus
- readable contrast
- status text in addition to color
- reduced motion support
- accessible form controls

---

# 22. DOCUMENTATION

Create/update:

```text
README.md
docs/PRD.md
docs/DESIGN.md
AI_USAGE.md
```

README must include:

```text
what was built
how to run
time spent
assumptions
architecture summary
data model
booking statuses
duplicate protection
payment failure
last-seat race
tests
tradeoffs
deliberate cuts
monitoring after release
next steps
```

README hero:

```text
# Ottodot TrialGuard

Reliable trial booking under real-world concurrency.

> A seat is not yours until the database atomically confirms it.
```

Include:

```text
✓ Duplicate Booking Protection
✓ Payment Failure Safety
✓ Maximum 4 Confirmed Students
✓ Atomic Last-Seat Confirmation
✓ Concurrent Race Condition Tested
```

---

# 23. AI_USAGE

Update `AI_USAGE.md` truthfully.

Do not fabricate AI interactions.

Record:

- AI tools actually used
- tasks AI helped with
- one real example of an AI output that was changed/rejected
- how final code was verified
- what would change in the AI workflow next time

---

# 24. QUALITY GATES

Before finishing, run all available checks.

At minimum:

```bash
npm run lint
npm run build
npm test
```

If a command does not exist, create or document the appropriate equivalent.

Fix errors rather than merely reporting them.

Also manually verify:

```text
normal booking
payment failure
duplicate
full class
admin roster
last-seat race
```

---

# 25. DO NOT OVER-ENGINEER

Do not add:

```text
real Stripe integration
auth platform
email system
CMS
waitlist
subscriptions
microservices
Redis lock
Kafka
large state-management framework
```

unless already required by the repository.

Use PostgreSQL correctly instead of adding unnecessary infrastructure.

---

# 26. TIMEBOX PRIORITY

If implementation time becomes constrained:

```text
KEEP
database invariants
booking/payment flow
roster
race-condition test
minimal Reliability Lab
README
AI_USAGE

CUT FIRST
decorative animation
extra dashboard metrics
non-essential sections
visual flourish
```

Correctness must win over decoration.

---

# 27. FINAL VERIFICATION OUTPUT

At the end of your work, provide a concise implementation report containing:

```text
Files created/changed
Architecture implemented
Database constraints
Last-seat strategy
Tests run
Build/lint/test results
Known limitations
How to run
How to demo
```

If any required item is incomplete, say exactly what remains.

Do not claim success for tests you did not run.

Do not claim concurrency safety without a real database-backed verification.

---

# 28. SUCCESS CONDITION

The final repository should make a reviewer think:

```text
The product is visually memorable.
The scope is disciplined.
The data model is clear.
The developer understands concurrency.
The edge cases are actually tested.
The documentation is easy to navigate.
```

Final principle:

> **Small in scope. Deep in engineering.**

# FINAL AGENT BEHAVIOR

You are expected to finish the repository, not merely propose it.

Do not stop after:

- planning
- schema suggestions
- pseudocode
- screenshots
- UI mockups
- partial implementation

Continue until all reasonable implementation, documentation, and verification work possible in the current environment is complete.

When a tool or environment limitation prevents a required verification:

1. state the exact limitation
2. preserve the implementation
3. provide the exact command/step needed to verify it
4. do not claim it passed

Do not delete or overwrite `docs/PRD.md`, `docs/DESIGN.md`, or `AI_USAGE.md` with generic generated content. Update them only when required to keep them aligned with the actual implementation.

# PRD — Ottodot TrialGuard

## 1. Document Overview

**Product:** Ottodot TrialGuard
**Scope:** Trial booking only
**Product type:** Full-stack take-home implementation
**Core problem:** Reliable trial-class confirmation under payment and booking edge cases
**Class capacity:** Maximum 4 confirmed students
**Primary users:** Parent, Admin/Teacher
**Priority:** Correctness first, visual polish second

---

## 2. Product Vision

Ottodot TrialGuard should feel like a modern, friendly education product to a parent while exposing unusually clear reliability behavior to a technical reviewer.

The product must make two things immediately obvious:

1. The parent experience is simple and approachable.
2. The backend is serious about booking correctness.

The project should be memorable because the reliability logic is not hidden—it is visibly demonstrated through a dedicated **Reliability Lab**.

---

## 3. Goals

### G-01 — Reliable Booking

Allow a parent to create and complete a trial booking.

### G-02 — Correct Capacity

Never allow more than 4 confirmed students in one trial class.

### G-03 — Duplicate Protection

Never allow the same child to hold multiple confirmed bookings for the same class.

### G-04 — Payment Safety

A failed payment must never create a confirmed roster entry.

### G-05 — Concurrency Safety

When two users compete for the final seat, no more than one may be confirmed.

### G-06 — Operational Visibility

Admin/teacher must be able to inspect the confirmed roster.

### G-07 — Demonstrable Engineering

The reviewer must be able to reproduce the key edge cases quickly.

---

## 4. Non-Goals

Not required:

- regular enrollment
- account registration
- password authentication
- real payments
- refunds
- subscriptions
- notifications
- rescheduling
- waitlist
- recurring classes
- CMS
- multi-tenant organization management

---

## 5. Personas

### Parent

Needs:

- choose a child
- choose a trial class
- understand available seats
- submit booking
- complete payment
- see clear outcome

Pain points:

- uncertainty about seat availability
- unclear payment status
- booking confirmation ambiguity

### Admin / Teacher

Needs:

- accurate roster
- correct confirmed count
- simple class overview
- confidence that failed/pending bookings do not appear as confirmed

### Technical Reviewer

Needs:

- simple setup
- clear domain model
- reproducible edge cases
- proof of concurrency handling
- readable documentation
- sensible tradeoffs

---

## 6. Product Principles

### Principle 1

**Database confirmation is authoritative.**

### Principle 2

**Reliability should be visible.**

### Principle 3

**Every important state should be explainable.**

### Principle 4

**Do not expand scope at the expense of correctness.**

### Principle 5

**The UI should feel playful, but the engineering should feel disciplined.**

---

## 7. Functional Requirements

### FR-01 — Parent Selection

The demo allows selection of a synthetic parent.

Acceptance:

- at least two seeded parents
- each parent has one or more children
- changing parent updates child options

### FR-02 — Child Selection

Parent can select one child.

Acceptance:

- only the selected parent's children are shown
- backend validates parent-child ownership

### FR-03 — Trial Class Listing

Each class shows:

- title
- subject/category
- start date/time
- teacher/display label
- capacity
- confirmed count
- remaining seats
- visual four-seat indicator

Availability shown in the UI is advisory.

### FR-04 — Create Trial Booking

Input:

```json
{
  "parentId": "...",
  "studentId": "...",
  "trialClassId": "..."
}
```

Creates:

```text
pending_payment
```

Backend validates:

- parent exists
- child exists
- child belongs to parent
- class exists
- child does not already have a confirmed booking for the class

### FR-05 — Mock Payment

Provide:

- Simulate Success
- Simulate Failure

Failure:

```text
pending_payment → payment_failed
```

Success:

```text
pending_payment → atomic confirmation
```

### FR-06 — Booking Result

Display:

- booking ID
- student
- class
- status
- status reason
- event timeline

### FR-07 — Admin Roster

Display per class:

- class title
- start time
- confirmed count
- capacity
- confirmed student list

Only confirmed records are included.

### FR-08 — Duplicate Confirmed Protection

The same `student_id + trial_class_id` may not exist twice with status `confirmed`.

Application checks improve UX.

Database uniqueness is authoritative.

### FR-09 — Capacity Protection

No more than class capacity may become confirmed.

Final seat allocation occurs inside a transaction.

### FR-10 — Last-Seat Race

Given:

```text
capacity = 4
confirmed = 3
```

When two different pending bookings attempt payment success concurrently:

Expected:

```text
one → confirmed
one → cancelled / class_full
final confirmed = 4
```

### FR-11 — Reliability Lab

A dedicated page exposes scenarios:

```text
Normal Booking
Payment Failure
Duplicate Booking
Full Class
Last Seat Race
```

For the race scenario, the page should show:

- initial capacity
- competitors A/B
- simultaneous trigger
- result of each
- final roster count
- invariant status
- small technical timeline

---

## 8. Business Invariants

### INV-01

```text
confirmed_count(class) <= capacity(class)
```

### INV-02

```text
confirmed_count(student, class) <= 1
```

### INV-03

```text
payment_failed ∉ confirmed roster
```

### INV-04

```text
last-seat concurrent confirmations => <= 1 new confirmed
```

### INV-05

```text
UI cannot bypass backend/database confirmation rules
```

---

## 9. Status Model

```text
pending_payment
confirmed
payment_failed
cancelled
```

Reasons:

```text
class_full
duplicate_confirmed_booking
payment_failed
```

---

## 10. UX Architecture

### Home / Parent Booking

Visual pattern:

- playful cream hero
- purple/orange/yellow accents
- education/science doodles
- class cards
- seat dots
- clear CTA

Primary CTA:

```text
Book a Trial
```

### Booking Status

Use a visual timeline:

```text
Booking Created
Payment Recorded
Capacity Revalidated
Seat Secured
```

or:

```text
Seat Unavailable
```

### Admin

Use a clean operations view with:

```text
Confirmed students
Payment failures
Blocked duplicates
Capacity guard
```

### Reliability Lab

Should visually feel like a science experiment.

Example:

```text
LAST-SEAT EXPERIMENT

3 / 4 seats confirmed

Booking A
Booking B

[ RUN CONCURRENT CONFIRMATION ]

↓ DATABASE CLASS LOCK ↓

A  CONFIRMED
B  CLASS_FULL

FINAL CAPACITY 4 / 4

✓ INVARIANT PRESERVED
```

---

## 11. Visual Design Requirements

Reference direction:

- playful modern education website
- purple structural sections
- warm cream canvas
- orange CTAs
- bright yellow emphasis
- pastel program cards
- large rounded typography
- organic curves and waves
- doodle-style science/learning illustrations
- original implementation and assets

Do not copy proprietary template code or paid images.

---

## 12. UX Copy

### Hero

**Reliable trial classes. Happy learning.**

Supporting text:

> Choose a trial class, complete a mock payment, and see how TrialGuard keeps every class roster accurate—even when two bookings compete for the final seat.

CTA:

```text
Book a Trial
```

Secondary:

```text
Open Reliability Lab
```

### Confirmed

> **You're in!** The trial seat was confirmed and added to the class roster.

### Payment Failed

> **Payment failed.** No seat was added to the confirmed roster.

### Class Full

> **That seat was just taken.** The class reached capacity before this booking could be confirmed.

### Duplicate

> **Already booked.** This child already has a confirmed seat in this trial class.

---

## 13. Seed Requirements

Seed at least:

- 4 parents
- 6 students
- 3–4 trial classes

Required cases:

```text
Available class: 1 confirmed
Last-seat class: 3 confirmed
Full class: 4 confirmed
Existing duplicate: child already confirmed
```

---

## 14. Analytics / Observability Concept

In production, track:

- booking attempts
- confirmation rate
- payment failure rate
- class-full rejection rate
- duplicate rejection rate
- confirmation latency
- transaction failures

Reliability Lab can display synthetic/demo versions of these metrics.

---

## 15. Priority Matrix

### P0 — Must Have

- schema
- seed data
- class listing
- booking creation
- mock payment
- booking state
- roster
- duplicate protection
- capacity protection
- atomic last-seat race handling
- critical tests
- README
- AI_USAGE

### P1 — Strong Differentiators

- Reliability Lab
- transaction event timeline
- visual seat indicator
- admin reliability summary
- polished education visual system

### P2 — Only If Time Remains

- subtle animations
- richer empty states
- additional analytics
- decorative illustrations
- dark-mode experiments

If time is constrained:

```text
protect P0
keep Reliability Lab minimal
cut decorative P2 first
```

---

## 16. Acceptance Criteria

| ID | Scenario | Expected |
|---|---|---|
| AC-01 | Normal booking + successful payment | `confirmed` |
| AC-02 | Payment failure | `payment_failed`; roster unchanged |
| AC-03 | Existing confirmed booking | second confirmation blocked |
| AC-04 | 4/4 class | new confirmation rejected |
| AC-05 | 3/4 + two concurrent successes | exactly one new confirmed |
| AC-06 | Admin roster | confirmed only |
| AC-07 | Wrong parent-child relation | rejected |
| AC-08 | Repeated terminal payment request | does not create duplicate side effect |
| AC-09 | Reliability Lab race demo | final count 4 and invariant PASS |

---

## 17. Definition of Done

- [ ] Parent booking flow works.
- [ ] Booking statuses persist.
- [ ] Mock success works.
- [ ] Mock failure works.
- [ ] Admin roster works.
- [ ] Duplicate confirmation is database-protected.
- [ ] Fifth confirmed student is impossible through normal confirmation path.
- [ ] Last-seat race is tested.
- [ ] Reliability Lab demonstrates the race.
- [ ] Seed data reproduces all required scenarios.
- [ ] Setup is documented.
- [ ] README explains architecture and tradeoffs.
- [ ] AI_USAGE is truthful and complete.
- [ ] Walkthrough video can be recorded in 5–8 minutes.

## 18. Implementation Guardrails

The product may be built with multiple coding-agent skills, but none of them may redefine the product requirements.

Required precedence:

```text
Take-home requirements
    ↓
Business invariants
    ↓
Verified implementation behavior
    ↓
Engineering / UI / animation / writing skills
```

Specific guardrails:

- UI tooling may improve presentation but may not move authoritative validation to the client.
- Animation tooling may not delay or obscure booking actions, status feedback, or error states.
- Code-simplification tooling may not remove transaction boundaries, row locks, unique constraints, validation, accessibility, or tests.
- Writing cleanup tooling may not rewrite numbers, test results, API names, database behavior, or architecture claims.
- If any supporting skill conflicts with a verified requirement, the requirement wins.

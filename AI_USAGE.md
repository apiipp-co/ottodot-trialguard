# AI usage record

## Tools used

Codex was used as an engineering assistant. No other AI tool was used in this repository build.

## What AI helped with

Codex helped turn the requirements into the Next.js route structure, PostgreSQL schema, test cases, original UI components, and documentation. It also reviewed responsive controls, accessibility basics, motion limits, and human-facing copy.

AI did not count as evidence that the booking design was correct. The schema and payment function were executed in tests before they were documented as working.

It was fastest when it helped turn the last-seat requirement into one testable database function and a matching concurrent integration test. The result was accepted only after the test ran against PostgreSQL semantics and then against the configured Supabase project through the application API.

## A decision that was rejected

The tempting shortcut is to trust the seat count shown to the parent and confirm with a simple `if (remainingSeats > 0)` check. That would let two requests read the same final seat. The implementation keeps the final count inside `process_mock_payment`, after a `FOR UPDATE` lock on the trial-class row. The partial unique index remains a second database-level check for duplicate confirmation.

## Verification performed

- `npm test` executed seven PostgreSQL-backed integration tests through the production schema and `process_mock_payment` function.
- `npm run verify:scenarios` executed normal booking, payment failure, duplicate, full class, roster filtering, and the last-seat race.
- `npm run lint` and `npm run build` passed after the final schema updates.
- The configured Supabase project received the initial schema and hardening migrations plus seed data. The running application then verified normal booking, successful and failed payments, duplicate rejection, a full class, admin roster filtering, and the concurrent last-seat race.

The test suite uses PGlite, an embedded PostgreSQL runtime, for repeatability. Supabase is the deployed runtime database; application requests use its Data API and PostgreSQL RPC through a server-only secret key.

## Skills used

| Skill | Use | What stayed manually verified |
| --- | --- | --- |
| Ponytail | Kept the application to one booking flow, direct PostgreSQL, and a small dependency set. | Transactions, locks, constraints, validation, and tests stayed in scope. |
| UI UX Pro Max | Reviewed hierarchy, responsive controls, focus states, feedback, and reduced motion. | The implemented UI follows the project’s provided design direction. |
| Scroll Craft | Added small hover and state cues after core SQL tests passed. | Motion is non-blocking and reduced-motion aware. |
| no-ai-slop | Tightened UI and README prose after technical work stabilized. | SQL, status values, API names, capacities, and test facts were not edited. |
| unslop | Final editorial pass on the README and this record. | Technical claims were retained only when backed by executed checks. |

## Next time

I would add a disposable PostgreSQL service to CI so the same integration suite also runs over a networked PostgreSQL connection. That would complement the local embedded PostgreSQL verification without changing the production transaction design.

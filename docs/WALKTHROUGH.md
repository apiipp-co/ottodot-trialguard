# Take home walkthrough script

Record a five to eight minute screen walkthrough after the repository has been published. Replace the placeholders below with the public repository and video links before submission.

- Repository: `<public GitHub URL>`
- Video: `<Loom or unlisted YouTube URL>`

## Suggested flow

1. Start on the booking page. Select a parent, their child, and a class with available seats. Create the booking and show a successful mock payment.
2. Create a second booking and choose the failed payment outcome. Open the roster to show that child is absent.
3. Explain the `bookings` and `payment_attempts` tables, the four booking statuses, and the partial unique index that prevents two confirmed bookings for the same child and class.
4. Open the full class and explain why payment confirmation returns `cancelled / class_full` rather than confirming a fifth student.
5. Open the Reliability Lab. Run the last-seat race and show that one request becomes `confirmed` while the other becomes `cancelled / class_full`.
6. Open `process_mock_payment` in `supabase/schema.sql`. Explain that it locks the booking, records the payment outcome, locks the class row with `FOR UPDATE`, checks the confirmed count, and updates the booking in one transaction.
7. Finish with the test results: seven PostgreSQL integration tests, lint, production build, and the remote Supabase API verification. Mention the deliberate boundaries: mock payments and no end-user authentication.

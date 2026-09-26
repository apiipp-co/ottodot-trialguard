"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, CircleAlert, CreditCard, Loader2, LockKeyhole } from "lucide-react";
import type { BookingDetail, PaymentOutcome } from "@/lib/types";
import { StatusBadge } from "@/components/ui/StatusBadge";

const messages = {
  confirmed: ["You’re in!", "The trial seat was confirmed and added to the class roster."],
  payment_failed: ["Payment failed.", "No seat was added to the confirmed roster."],
  cancelled: ["That seat was just taken.", "The class reached capacity before this booking could be confirmed."],
  pending_payment: ["One last step.", "Choose a mock outcome to see how the booking settles."]
};

export function BookingStatus({ initialBooking }: { initialBooking: BookingDetail }) {
  const [booking, setBooking] = useState(initialBooking); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function pay(outcome: PaymentOutcome) {
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/bookings/${booking.id}/payment`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ outcome }) });
      const body = await response.json(); if (!response.ok) throw new Error(body.error?.message ?? "Payment could not be processed.");
      const refreshed = await fetch(`/api/bookings/${booking.id}`, { cache: "no-store" }); setBooking(await refreshed.json());
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Payment could not be processed."); } finally { setBusy(false); }
  }
  const [title, text] = messages[booking.status];
  const timeline = booking.status === "confirmed" ? ["Booking created", "Payment approved", "Capacity revalidated", "Seat secured"] : booking.status === "payment_failed" ? ["Booking created", "Payment failed"] : booking.status === "cancelled" ? ["Booking created", "Payment approved", "Capacity revalidated", booking.statusReason === "duplicate_confirmed_booking" ? "Existing confirmed booking found" : "Class reached capacity"] : ["Booking created", "Awaiting mock payment"];
  return <main className="status-page shell"><Link href="/" className="back-link"><ArrowLeft size={17} /> Back to trial classes</Link><section className="status-layout"><div className="status-summary"><p className="eyebrow">Booking status</p><StatusBadge status={booking.status} /><h1>{title}</h1><p>{text}</p><dl><div><dt>Child</dt><dd>{booking.student.name}</dd></div><div><dt>Trial class</dt><dd>{booking.trialClass.title}</dd></div><div><dt>Booking ID</dt><dd className="mono">{booking.id}</dd></div></dl></div><aside className="timeline-card"><h2>Booking timeline</h2><ol>{timeline.map((item, index) => <li className={index === timeline.length - 1 && booking.status !== "confirmed" ? "timeline-stop" : ""} key={item}>{index === timeline.length - 1 && booking.status !== "confirmed" ? <CircleAlert /> : <CheckCircle2 />}<span>{item}</span></li>)}</ol></aside></section>{booking.status === "pending_payment" && <section className="payment-card"><div><p className="eyebrow"><CreditCard size={16} /> Mock Payment Gateway</p><h2>Choose an outcome</h2><p>This is a mock transaction. No real payment is processed. The database will re-check capacity after a successful outcome.</p></div><div className="payment-actions"><button className="button" onClick={() => pay("success")} disabled={busy}>{busy ? <Loader2 className="spin" /> : <CheckCircle2 />} Simulate success</button><button className="button button-outline" onClick={() => pay("failure")} disabled={busy}><CircleAlert /> Simulate failure</button></div>{error && <p className="form-error" role="alert">{error}</p>}</section>}<section className="trust-note"><LockKeyhole size={18} /><p>Terminal payment requests are idempotent. Repeating one returns the stored booking state without creating another payment attempt.</p></section></main>;
}

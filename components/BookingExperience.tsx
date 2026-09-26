"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { ArrowRight, Atom, BookOpen, CalendarDays, CheckCircle2, FlaskConical, Rocket, ShieldCheck, Sparkles, UsersRound } from "lucide-react";
import type { TrialClass } from "@/lib/types";
import { SeatIndicator } from "@/components/ui/SeatIndicator";

type Parent = { id: string; name: string; students: { id: string; name: string }[] };

const steps = [
  ["01", "Choose a child", "Pick a learner from the demo family.", Sparkles],
  ["02", "Pick a class", "See the live, advisory seat count.", BookOpen],
  ["03", "Mock payment", "Try a success or a failure safely.", CheckCircle2],
  ["04", "Seat confirmed", "The database makes the final call.", ShieldCheck]
] as const;

const classTimeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC", weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit"
});

export function BookingExperience({ parents, classes }: { parents: Parent[]; classes: TrialClass[] }) {
  const [parentId, setParentId] = useState(parents[0]?.id ?? "");
  const [studentId, setStudentId] = useState(parents[0]?.students[0]?.id ?? "");
  const [classId, setClassId] = useState(classes.find((item) => item.remainingSeats > 0)?.id ?? classes[0]?.id ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const activeParent = useMemo(() => parents.find((parent) => parent.id === parentId), [parents, parentId]);

  function chooseParent(nextParent: string) {
    setParentId(nextParent);
    setStudentId(parents.find((parent) => parent.id === nextParent)?.students[0]?.id ?? "");
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const response = await fetch("/api/bookings", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ parentId, studentId, trialClassId: classId }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message ?? "Could not create this booking.");
      window.location.assign(`/booking/${body.id}`);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not create this booking."); }
    finally { setSaving(false); }
  }

  return <>
    <section className="hero shell" aria-labelledby="hero-heading">
      <div className="hero-copy">
        <p className="eyebrow hero-eyebrow"><Sparkles size={16} aria-hidden="true" /> Big curiosity. Carefully protected seats.</p>
        <h1 id="hero-heading">A bright first class<br /><em>starts here.</em></h1>
        <p className="hero-lede">Choose a trial class your child will love. TrialGuard keeps the booking cheerful on screen and precise in the database.</p>
        <div className="hero-actions"><a className="button" href="#book">Book a trial <ArrowRight size={18} /></a><a className="text-link" href="/reliability-lab">Open Reliability Lab <ArrowRight size={16} /></a></div>
        <div className="hero-proof"><ShieldCheck size={21} aria-hidden="true" /><span><strong>Database-confirmed seats</strong><br />Availability on screen is a guide, not a promise.</span></div>
      </div>
      <div className="hero-art" role="img" aria-label="A playful collage of children learning together">
        <span className="hero-doodle hero-doodle-star"><Sparkles /></span><span className="hero-doodle hero-doodle-orbit"><Atom /></span><span className="hero-doodle hero-doodle-rocket"><Rocket /></span>
        <div className="hero-sun" /><div className="hero-portrait" />
        <div className="hero-note"><ShieldCheck size={20} /><span><strong>One seat at a time</strong><br />The final answer is always checked twice.</span></div>
      </div>
    </section>

    <section id="how-it-works" className="steps-section"><div className="shell"><div className="section-heading"><p className="eyebrow">A tiny, clear journey</p><h2>Four cheerful steps.<br />One reliable answer.</h2></div><div className="steps-grid">{steps.map(([number, title, text, Icon], index) => <article className={`step-card step-${index + 1}`} key={number}><span className="step-number">{number}</span><span className="step-icon"><Icon size={25} /></span><h3>{title}</h3><p>{text}</p></article>)}</div></div></section>

    <section id="classes" className="classes-section"><div className="shell"><div className="section-heading section-heading-light"><p className="eyebrow">Find a trial that fits</p><h2>Small classes, big curiosity.</h2><p>Every card shows the current count. The final confirmation still happens inside PostgreSQL.</p></div><div className="class-grid">{classes.filter((item) => item.title !== "Reliability Race Lab").map((item, index) => <button className={`class-card class-${index + 1} ${classId === item.id ? "selected" : ""}`} onClick={() => { setClassId(item.id); document.getElementById("book")?.scrollIntoView({ behavior: "smooth" }); }} key={item.id} aria-pressed={classId === item.id}><span className="class-icon">{index === 0 ? <FlaskConical /> : index === 1 ? <BookOpen /> : <Rocket />}</span><span className="class-card-content"><span className="class-subject">{item.subject}</span><strong>{item.title}</strong><small><CalendarDays size={15} />{classTimeFormatter.format(new Date(item.startsAt))}</small><small><UsersRound size={15} />{item.teacherName}</small><SeatIndicator confirmed={item.confirmedCount} capacity={item.capacity} /><span className="class-cta">{item.remainingSeats ? `${item.remainingSeats} seat${item.remainingSeats === 1 ? "" : "s"} shown` : "Class currently full"} <ArrowRight size={16} /></span></span></button>)}</div></div></section>

    <section id="book" className="booking-section shell" aria-labelledby="booking-heading"><div className="booking-copy"><p className="eyebrow"><CheckCircle2 size={16} /> Trial booking</p><h2 id="booking-heading">Ready to pick a first class?</h2><p>This demo uses synthetic families and a mock payment screen. No card details are requested or stored.</p></div><form className="booking-form" onSubmit={submit}><label>Parent<select value={parentId} onChange={(event) => chooseParent(event.target.value)}>{parents.map((parent) => <option key={parent.id} value={parent.id}>{parent.name}</option>)}</select></label><label>Child<select value={studentId} onChange={(event) => setStudentId(event.target.value)}>{activeParent?.students.map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}</select></label><label>Trial class<select value={classId} onChange={(event) => setClassId(event.target.value)}>{classes.filter((item) => item.title !== "Reliability Race Lab").map((item) => <option key={item.id} value={item.id}>{item.title} · {item.remainingSeats} seat{item.remainingSeats === 1 ? "" : "s"} shown</option>)}</select></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="button" disabled={saving}>{saving ? "Creating booking…" : "Continue to mock payment"}<ArrowRight size={18} /></button></form></section>

    <section className="benefits-section shell"><div className="benefits-intro"><div className="section-heading"><p className="eyebrow">Built to keep its word</p><h2>Careful where it counts.</h2><p>Warm for families, exact for every final-seat decision.</p></div><div className="benefits-image"><Image src="/kidza/supplied/children_collage.png" alt="Children learning, reading, and playing together" width={833} height={833} sizes="(max-width: 900px) 100vw, 38vw" priority={false} /></div></div><div className="benefits-grid"><article><ShieldCheck /><h3>Atomic confirmation</h3><p>A class-row lock serializes final-seat decisions.</p></article><article><UsersRound /><h3>No overbooking</h3><p>Only confirmed bookings count toward the capacity.</p></article><article><FlaskConical /><h3>Payment-safe roster</h3><p>Failed payments stay out of the teacher&apos;s list.</p></article><article><CheckCircle2 /><h3>Duplicate protection</h3><p>A partial unique index backs up the application check.</p></article></div></section>
    <section className="lab-banner shell"><div><p className="eyebrow">A real race, not a canned animation</p><h2>Can two parents win the same final seat?</h2><p>Start from 3/4 confirmed, send two payment successes together, and inspect the real response.</p></div><a className="button button-dark" href="/reliability-lab">Run the experiment <ArrowRight size={18} /></a></section>
  </>;
}

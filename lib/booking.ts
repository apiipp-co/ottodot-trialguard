import { randomUUID } from "crypto";
import { supabaseServer } from "@/lib/supabase";
import type { BookingDetail, BookingStatus, PaymentOutcome, TrialClass } from "@/lib/types";
import { ServiceError } from "@/lib/types";

type ValidationClient = { query: <T extends { parent_id?: string }>(text: string, values?: unknown[]) => Promise<{ rowCount: number | null; rows: T[] }> };

function fail(error: { message: string } | null, code: "INVALID_INPUT" | "BOOKING_NOT_FOUND" = "INVALID_INPUT"): never {
  console.error(error?.message);
  throw new ServiceError(code, code === "BOOKING_NOT_FOUND" ? "That booking was not found." : "The database request could not be completed.", code === "BOOKING_NOT_FOUND" ? 404 : 500);
}

export async function listTrialClasses(): Promise<TrialClass[]> {
  const { data, error } = await supabaseServer().from("trial_classes").select("id,title,subject,teacher_name,starts_at,capacity,bookings(status)").order("starts_at");
  if (error) fail(error);
  const rows = (data ?? []) as unknown as { id: string; title: string; subject: string; teacher_name: string; starts_at: string; capacity: number; bookings: { status: BookingStatus }[] | null }[];
  return rows.map((row) => {
    const confirmedCount = (row.bookings ?? []).filter((booking) => booking.status === "confirmed").length;
    return { id: row.id, title: row.title, subject: row.subject, teacherName: row.teacher_name, startsAt: row.starts_at, capacity: row.capacity, confirmedCount, remainingSeats: Math.max(0, row.capacity - confirmedCount) };
  });
}

export async function listParents() {
  const { data, error } = await supabaseServer().from("parents").select("id,name,students(id,name)").order("name");
  if (error) fail(error);
  const parents = (data ?? []) as unknown as { id: string; name: string; students: { id: string; name: string }[] | null }[];
  return parents.map((parent) => ({ id: parent.id, name: parent.name, students: parent.students ?? [] }));
}

export async function validateBookingTarget(client: ValidationClient, input: { parentId: string; studentId: string; trialClassId: string }) {
  const parent = await client.query("select id from parents where id = $1", [input.parentId]);
  if (!parent.rowCount) throw new ServiceError("PARENT_NOT_FOUND", "That parent record was not found.", 404);
  const student = await client.query<{ parent_id: string }>("select parent_id from students where id = $1", [input.studentId]);
  if (!student.rowCount) throw new ServiceError("STUDENT_NOT_FOUND", "That child record was not found.", 404);
  if (student.rows[0].parent_id !== input.parentId) throw new ServiceError("STUDENT_NOT_OWNED_BY_PARENT", "Choose a child linked to the selected parent.", 403);
  const trialClass = await client.query("select id from trial_classes where id = $1", [input.trialClassId]);
  if (!trialClass.rowCount) throw new ServiceError("TRIAL_CLASS_NOT_FOUND", "That trial class was not found.", 404);
  const existing = await client.query("select 1 from bookings where student_id = $1 and trial_class_id = $2 and status = 'confirmed'", [input.studentId, input.trialClassId]);
  if (existing.rowCount) throw new ServiceError("ALREADY_CONFIRMED", "This child already has a confirmed seat in this class.", 409);
}

export async function createBooking(input: { parentId: string; studentId: string; trialClassId: string }) {
  const db = supabaseServer();
  const [{ data: parent, error: parentError }, { data: student, error: studentError }, { data: trialClass, error: classError }] = await Promise.all([
    db.from("parents").select("id").eq("id", input.parentId).maybeSingle(), db.from("students").select("parent_id").eq("id", input.studentId).maybeSingle(), db.from("trial_classes").select("id").eq("id", input.trialClassId).maybeSingle()
  ]);
  if (parentError || !parent) throw new ServiceError("PARENT_NOT_FOUND", "That parent record was not found.", 404);
  if (studentError || !student) throw new ServiceError("STUDENT_NOT_FOUND", "That child record was not found.", 404);
  const studentRow = student as unknown as { parent_id: string };
  if (studentRow.parent_id !== input.parentId) throw new ServiceError("STUDENT_NOT_OWNED_BY_PARENT", "Choose a child linked to the selected parent.", 403);
  if (classError || !trialClass) throw new ServiceError("TRIAL_CLASS_NOT_FOUND", "That trial class was not found.", 404);
  const { data: existing, error: existingError } = await db.from("bookings").select("id").eq("student_id", input.studentId).eq("trial_class_id", input.trialClassId).eq("status", "confirmed").maybeSingle();
  if (existingError) fail(existingError);
  if (existing) throw new ServiceError("ALREADY_CONFIRMED", "This child already has a confirmed seat in this class.", 409);
  const id = randomUUID();
  const { error } = await db.from("bookings").insert({ id, parent_id: input.parentId, student_id: input.studentId, trial_class_id: input.trialClassId, status: "pending_payment" });
  if (error) fail(error);
  return { id, status: "pending_payment" as const };
}

export async function getBooking(id: string): Promise<BookingDetail> {
  const { data, error } = await supabaseServer().from("bookings").select("id,status,status_reason,created_at,students(id,name),trial_classes(id,title,subject,starts_at),payment_attempts(outcome,created_at)").eq("id", id).maybeSingle();
  if (error) fail(error);
  if (!data || !data.students || !data.trial_classes) throw new ServiceError("BOOKING_NOT_FOUND", "That booking was not found.", 404);
  const row = data as unknown as { id: string; status: BookingStatus; status_reason: string | null; created_at: string; students: { id: string; name: string }; trial_classes: { id: string; title: string; subject: string; starts_at: string }; payment_attempts: { outcome: PaymentOutcome; created_at: string }[] | null };
  const student = row.students;
  const trialClass = row.trial_classes;
  return { id: row.id, status: row.status, statusReason: row.status_reason, createdAt: row.created_at, student, trialClass: { id: trialClass.id, title: trialClass.title, subject: trialClass.subject, startsAt: trialClass.starts_at }, paymentAttempts: (row.payment_attempts ?? []).map((attempt) => ({ outcome: attempt.outcome, createdAt: attempt.created_at })) };
}

export async function processPayment(bookingId: string, outcome: PaymentOutcome) {
  const { data, error } = await supabaseServer().rpc("process_mock_payment", { p_booking_id: bookingId, p_outcome: outcome });
  if (error) {
    if (error.message.includes("BOOKING_NOT_FOUND")) throw new ServiceError("BOOKING_NOT_FOUND", "That booking was not found.", 404);
    fail(error);
  }
  const result = ((data as unknown as { booking_id: string; final_status: BookingStatus; reason: string | null }[] | null)?.[0]);
  if (!result) throw new ServiceError("BOOKING_NOT_FOUND", "That booking was not found.", 404);
  return { bookingId: result.booking_id, status: result.final_status, reason: result.reason };
}

export async function getRoster(trialClassId: string) {
  const db = supabaseServer();
  const { data: trialClass, error: classError } = await db.from("trial_classes").select("id,title,capacity,starts_at").eq("id", trialClassId).maybeSingle();
  if (classError) fail(classError);
  if (!trialClass) throw new ServiceError("TRIAL_CLASS_NOT_FOUND", "That trial class was not found.", 404);
  const classRow = trialClass as unknown as { id: string; title: string; capacity: number; starts_at: string };
  const { data: bookings, error } = await db.from("bookings").select("updated_at,students(id,name)").eq("trial_class_id", trialClassId).eq("status", "confirmed").order("updated_at");
  if (error) fail(error);
  const rosterBookings = (bookings ?? []) as unknown as { updated_at: string; students: { id: string; name: string } | null }[];
  const students = rosterBookings.flatMap((booking) => booking.students ? [{ ...booking.students, confirmed_at: booking.updated_at }] : []);
  return { trialClass: { id: classRow.id, title: classRow.title, capacity: classRow.capacity, startsAt: classRow.starts_at }, confirmedCount: students.length, students };
}

export async function dashboard() {
  const classes = await listTrialClasses();
  const { data: bookings, error } = await supabaseServer().from("bookings").select("status");
  if (error) fail(error);
  const counts: Record<string, number> = {};
  for (const booking of (bookings ?? []) as unknown as { status: BookingStatus }[]) counts[booking.status] = (counts[booking.status] ?? 0) + 1;
  return { classes, rosters: await Promise.all(classes.map((trialClass) => getRoster(trialClass.id))), counts };
}

export async function runLastSeatRace() {
  const { data: prepared, error } = await supabaseServer().rpc("prepare_last_seat_race");
  if (error) fail(error);
  const race = ((prepared as unknown as { booking_a: string; booking_b: string }[] | null)?.[0]);
  if (!race) throw new ServiceError("INVALID_INPUT", "The Reliability Lab could not prepare its race scenario.", 500);
  const [a, b] = await Promise.all([processPayment(race.booking_a, "success"), processPayment(race.booking_b, "success")]);
  const after = await getRoster("00000000-0000-0000-0000-000000000104");
  const winners = [a, b].filter((result) => result.status === "confirmed").length;
  return { before: { capacity: 4, confirmed: 3 }, competitors: [{ label: "A", bookingId: race.booking_a, status: a.status, reason: a.reason }, { label: "B", bookingId: race.booking_b, status: b.status, reason: b.reason }], after: { confirmed: after.confirmedCount }, invariants: { capacityPreserved: after.confirmedCount <= 4, exactlyOneWinner: winners === 1, noOverbooking: after.confirmedCount === 4 } };
}

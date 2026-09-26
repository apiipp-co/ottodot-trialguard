import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { beforeEach, describe, expect, it } from "vitest";
import { validateBookingTarget } from "../lib/booking";

const IDs = {
  maya: "00000000-0000-0000-0000-000000000001",
  alya: "00000000-0000-0000-0000-000000000001",
  rafi: "00000000-0000-0000-0000-000000000002",
  sora: "00000000-0000-0000-0000-000000000007",
  ivo: "00000000-0000-0000-0000-000000000008",
  science: "00000000-0000-0000-0000-000000000101",
  coding: "00000000-0000-0000-0000-000000000103",
  race: "00000000-0000-0000-0000-000000000104"
};

let db: PGlite;

beforeEach(async () => {
  db = new PGlite();
  await db.exec(await readFile("supabase/schema.sql", "utf8"));
  await db.exec(await readFile("supabase/seed.sql", "utf8"));
});

async function pending(parentId: string, studentId: string, classId: string) {
  const id = randomUUID();
  await db.query(`insert into bookings (id, parent_id, student_id, trial_class_id, status)
    values ($1, $2, $3, $4, 'pending_payment')`, [id, parentId, studentId, classId]);
  return id;
}
async function pay(id: string, outcome: "success" | "failure") {
  const result = await db.query<{ final_status: string; reason: string | null }>(
    "select final_status, reason from process_mock_payment($1::uuid, $2::payment_outcome)", [id, outcome]
  );
  return result.rows[0];
}
async function confirmed(classId: string) {
  const result = await db.query<{ count: string }>("select count(*)::text as count from bookings where trial_class_id = $1 and status = 'confirmed'", [classId]);
  return Number(result.rows[0].count);
}

describe("PostgreSQL booking invariants", () => {
  it("confirms a normal pending booking", async () => {
    const booking = await pending(IDs.maya, IDs.rafi, IDs.science);
    expect((await pay(booking, "success")).final_status).toBe("confirmed");
    expect(await confirmed(IDs.science)).toBe(2);
  });

  it("rejects a parent attempting to book another parent's child", async () => {
    const client = { query: async (text: string, values?: unknown[]) => db.query(text, values) };
    await expect(validateBookingTarget(client, {
      parentId: "00000000-0000-0000-0000-000000000002", studentId: IDs.alya, trialClassId: IDs.science
    })).rejects.toMatchObject({ code: "STUDENT_NOT_OWNED_BY_PARENT" });
  });

  it("keeps a failed payment out of the confirmed roster", async () => {
    const booking = await pending(IDs.maya, IDs.rafi, IDs.science);
    expect((await pay(booking, "failure")).final_status).toBe("payment_failed");
    expect(await confirmed(IDs.science)).toBe(1);
    const roster = await db.query("select * from bookings where trial_class_id = $1 and status = 'confirmed'", [IDs.science]);
    expect(roster.rows).toHaveLength(1);
  });

  it("cancels a duplicate confirmation and has a partial unique index as a backstop", async () => {
    const duplicate = await pending(IDs.maya, IDs.alya, IDs.science);
    await expect(pay(duplicate, "success")).resolves.toMatchObject({ final_status: "cancelled", reason: "duplicate_confirmed_booking" });
    await expect(db.query(`insert into bookings (id, parent_id, student_id, trial_class_id, status)
      values ($1, $2, $3, $4, 'confirmed')`, [randomUUID(), IDs.maya, IDs.alya, IDs.science])).rejects.toThrow();
  });

  it("cancels a successful payment when a class is already full", async () => {
    const booking = await pending(IDs.maya, IDs.alya, IDs.coding);
    await expect(pay(booking, "success")).resolves.toMatchObject({ final_status: "cancelled", reason: "class_full" });
    expect(await confirmed(IDs.coding)).toBe(4);
  });

  it("makes terminal payment requests idempotent", async () => {
    const booking = await pending(IDs.maya, IDs.rafi, IDs.science);
    await pay(booking, "success");
    expect((await pay(booking, "success")).final_status).toBe("confirmed");
    const attempts = await db.query<{ count: string }>("select count(*)::text as count from payment_attempts where booking_id = $1", [booking]);
    expect(Number(attempts.rows[0].count)).toBe(1);
  });

  it("serializes two last-seat confirmations through the PostgreSQL function", async () => {
    // The test deliberately uses the SQL function under test, not a mocked lock.
    const first = await pending("00000000-0000-0000-0000-000000000004", IDs.sora, IDs.race);
    const second = await pending("00000000-0000-0000-0000-000000000002", IDs.ivo, IDs.race);
    for (const [student, parent] of [[IDs.alya, IDs.maya], [IDs.rafi, IDs.maya], ["00000000-0000-0000-0000-000000000003", "00000000-0000-0000-0000-000000000002"]]) {
      await db.query(`insert into bookings (id, parent_id, student_id, trial_class_id, status)
        values ($1, $2, $3, $4, 'confirmed')`, [randomUUID(), parent, student, IDs.race]);
    }
    const [a, b] = await Promise.all([pay(first, "success"), pay(second, "success")]);
    expect(await confirmed(IDs.race)).toBe(4);
    expect([a, b].filter((item) => item.final_status === "confirmed")).toHaveLength(1);
    expect([a, b].filter((item) => item.reason === "class_full")).toHaveLength(1);
  });
});

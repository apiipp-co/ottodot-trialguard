import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";

const id = {
  maya: "00000000-0000-0000-0000-000000000001", alya: "00000000-0000-0000-0000-000000000001",
  rafi: "00000000-0000-0000-0000-000000000002", sora: "00000000-0000-0000-0000-000000000007",
  ivo: "00000000-0000-0000-0000-000000000008", science: "00000000-0000-0000-0000-000000000101",
  coding: "00000000-0000-0000-0000-000000000103", race: "00000000-0000-0000-0000-000000000104"
};
const db = new PGlite();
await db.exec(await readFile("supabase/schema.sql", "utf8"));
await db.exec(await readFile("supabase/seed.sql", "utf8"));

async function pending(parent, student, trialClass) {
  const booking = randomUUID();
  await db.query("insert into bookings (id, parent_id, student_id, trial_class_id) values ($1, $2, $3, $4)", [booking, parent, student, trialClass]);
  return booking;
}
async function pay(booking, outcome) {
  return (await db.query("select final_status, reason from process_mock_payment($1::uuid, $2::payment_outcome)", [booking, outcome])).rows[0];
}
async function count(trialClass) {
  return Number((await db.query("select count(*)::text as count from bookings where trial_class_id = $1 and status = 'confirmed'", [trialClass])).rows[0].count);
}

const normal = await pending(id.maya, id.rafi, id.science);
console.log("normal booking:", await pay(normal, "success"));

await db.exec(await readFile("supabase/seed.sql", "utf8"));
const failed = await pending(id.maya, id.rafi, id.science);
console.log("failed payment:", await pay(failed, "failure"), "roster", await count(id.science));

await db.exec(await readFile("supabase/seed.sql", "utf8"));
const duplicate = await pending(id.maya, id.alya, id.science);
console.log("duplicate booking:", await pay(duplicate, "success"));

await db.exec(await readFile("supabase/seed.sql", "utf8"));
const full = await pending(id.maya, id.alya, id.coding);
console.log("full class:", await pay(full, "success"), "roster", await count(id.coding));

await db.exec(await readFile("supabase/seed.sql", "utf8"));
console.log("admin roster filter:", await count(id.science), "confirmed student");
for (const [student, parent] of [[id.alya, id.maya], [id.rafi, id.maya], ["00000000-0000-0000-0000-000000000003", "00000000-0000-0000-0000-000000000002"]]) {
  await db.query("insert into bookings (id, parent_id, student_id, trial_class_id, status) values ($1, $2, $3, $4, 'confirmed')", [randomUUID(), parent, student, id.race]);
}
const [a, b] = await Promise.all([pay(await pending("00000000-0000-0000-0000-000000000004", id.sora, id.race), "success"), pay(await pending("00000000-0000-0000-0000-000000000002", id.ivo, id.race), "success")]);
console.log("last-seat race:", { a, b, confirmed: await count(id.race) });
await db.close();

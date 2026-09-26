import { ShieldCheck, UsersRound, CircleX, CreditCard, LockKeyhole, type LucideIcon } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SeatIndicator } from "@/components/ui/SeatIndicator";
import { dashboard } from "@/lib/booking";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const data = await dashboard();
  const totalConfirmed = data.rosters.reduce((total, roster) => total + roster.confirmedCount, 0);
  const stats: { Icon: LucideIcon; label: string; value: number }[] = [
    { Icon: UsersRound, label: "Confirmed students", value: totalConfirmed }, { Icon: CreditCard, label: "Payment failures", value: data.counts.payment_failed ?? 0 },
    { Icon: CircleX, label: "Blocked duplicates", value: data.counts.cancelled ?? 0 }, { Icon: ShieldCheck, label: "Active trial classes", value: data.classes.filter((item) => item.title !== "Reliability Race Lab").length }
  ];
  return <><SiteHeader /><main className="admin-page"><section className="admin-hero"><div className="shell"><p className="eyebrow">Teacher & admin view</p><h1>Confirmed rosters,<br /><em>nothing speculative.</em></h1><p>Pending, failed, and cancelled bookings stay out of the student list.</p></div></section><section className="shell admin-content"><div className="admin-stats">{stats.map(({ Icon, label, value }) => <article key={label}><Icon /><span>{label}</span><strong>{value}</strong></article>)}</div><section className="guard-panel"><div><p className="eyebrow"><LockKeyhole size={16} /> Reliability guards</p><h2>All checks are active.</h2></div><ul><li><ShieldCheck /> Capacity guard</li><li><ShieldCheck /> Duplicate guard</li><li><ShieldCheck /> Payment safety</li><li><ShieldCheck /> Atomic confirmation</li></ul></section><div className="section-heading"><p className="eyebrow">Confirmed students only</p><h2>Class rosters</h2></div><div className="roster-grid">{data.rosters.filter((item) => item.trialClass.title !== "Reliability Race Lab").map((roster) => <article className="roster-card" key={roster.trialClass.id}><header><div><p>{new Date(roster.trialClass.startsAt).toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" })}</p><h3>{roster.trialClass.title}</h3></div><SeatIndicator confirmed={roster.confirmedCount} capacity={roster.trialClass.capacity} label={false} /></header><p className="roster-count">{roster.confirmedCount} / {roster.trialClass.capacity} confirmed</p><ol>{roster.students.length ? roster.students.map((student, index) => <li key={student.id}><span>{index + 1}</span><strong>{student.name}</strong><small>Confirmed</small></li>) : <li className="empty">No confirmed students yet.</li>}</ol></article>)}</div></section></main></>;
}

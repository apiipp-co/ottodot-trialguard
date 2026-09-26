import { BookingExperience } from "@/components/BookingExperience";
import { SiteHeader } from "@/components/SiteHeader";
import { listParents, listTrialClasses } from "@/lib/booking";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [parents, classes] = await Promise.all([listParents(), listTrialClasses()]);
  return <><SiteHeader /><main><BookingExperience parents={parents} classes={classes} /></main><footer className="site-footer"><div className="shell"><strong>TrialGuard</strong><span>Small in scope. Serious about a confirmed seat.</span><span>© 2026 synthetic demo</span></div></footer></>;
}

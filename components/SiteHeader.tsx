import Link from "next/link";
import { Atom, HeartHandshake, ShieldCheck } from "lucide-react";

export function SiteHeader() {
  return <header className="site-chrome">
    <div className="site-ribbon"><div><span><HeartHandshake size={14} /> A friendly first class for curious kids</span><Link href="/reliability-lab"><ShieldCheck size={14} /> Seats protected in PostgreSQL</Link></div></div>
    <div className="site-header">
      <Link href="/" className="brand" aria-label="TrialGuard home"><span className="brand-mark"><Atom size={22} /></span><span>Trial<span>Guard</span></span></Link>
      <nav aria-label="Primary navigation"><Link href="/#book">Book trial</Link><Link href="/#how-it-works">How it works</Link><Link href="/#classes">Classes</Link><Link href="/reliability-lab">Reliability Lab</Link><Link href="/admin">Admin</Link></nav>
      <Link href="/#book" className="button button-small">Start booking <span aria-hidden="true">→</span></Link>
    </div>
  </header>;
}

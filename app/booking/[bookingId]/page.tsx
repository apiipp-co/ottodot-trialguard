import { BookingStatus } from "@/components/BookingStatus";
import { SiteHeader } from "@/components/SiteHeader";
import { getBooking } from "@/lib/booking";

export const dynamic = "force-dynamic";

export default async function BookingPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const booking = await getBooking((await params).bookingId);
  return <><SiteHeader /><BookingStatus initialBooking={booking} /></>;
}

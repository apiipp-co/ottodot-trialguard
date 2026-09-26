import type { BookingStatus } from "@/lib/types";

const labels: Record<BookingStatus, string> = {
  pending_payment: "Awaiting payment", confirmed: "Seat confirmed", payment_failed: "Payment failed", cancelled: "Booking cancelled"
};

export function StatusBadge({ status }: { status: BookingStatus }) {
  return <span className={`status status-${status}`}>{labels[status]}</span>;
}

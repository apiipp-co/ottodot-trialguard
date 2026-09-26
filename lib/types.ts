export type BookingStatus = "pending_payment" | "confirmed" | "payment_failed" | "cancelled";
export type PaymentOutcome = "success" | "failure";

export type TrialClass = {
  id: string;
  title: string;
  subject: string;
  teacherName: string;
  startsAt: string;
  capacity: number;
  confirmedCount: number;
  remainingSeats: number;
};

export type BookingDetail = {
  id: string;
  status: BookingStatus;
  statusReason: string | null;
  createdAt: string;
  student: { id: string; name: string };
  trialClass: { id: string; title: string; subject: string; startsAt: string };
  paymentAttempts: { outcome: PaymentOutcome; createdAt: string }[];
};

export type ServiceErrorCode =
  | "INVALID_INPUT"
  | "PARENT_NOT_FOUND"
  | "STUDENT_NOT_FOUND"
  | "STUDENT_NOT_OWNED_BY_PARENT"
  | "TRIAL_CLASS_NOT_FOUND"
  | "BOOKING_NOT_FOUND"
  | "ALREADY_CONFIRMED"
  | "CLASS_FULL"
  | "INVALID_PAYMENT_OUTCOME";

export class ServiceError extends Error {
  constructor(public code: ServiceErrorCode, message: string, public status = 400) {
    super(message);
  }
}

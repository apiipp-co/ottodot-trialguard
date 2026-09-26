import { z } from "zod";

export const CreateBookingSchema = z.object({
  parentId: z.string().uuid(),
  studentId: z.string().uuid(),
  trialClassId: z.string().uuid()
});

export const PaymentSchema = z.object({
  outcome: z.enum(["success", "failure"])
});

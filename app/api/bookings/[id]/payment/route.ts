import { NextRequest, NextResponse } from "next/server";
import { processPayment } from "@/lib/booking";
import { PaymentSchema } from "@/lib/validation";
import { apiError } from "@/app/api/_lib";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { outcome } = PaymentSchema.parse(await request.json());
    return NextResponse.json(await processPayment((await params).id, outcome));
  } catch (error) { return apiError(error); }
}

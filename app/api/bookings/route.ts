import { NextRequest, NextResponse } from "next/server";
import { createBooking } from "@/lib/booking";
import { CreateBookingSchema } from "@/lib/validation";
import { apiError } from "@/app/api/_lib";

export async function POST(request: NextRequest) {
  try { return NextResponse.json(await createBooking(CreateBookingSchema.parse(await request.json())), { status: 201 }); }
  catch (error) { return apiError(error); }
}

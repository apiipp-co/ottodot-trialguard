import { NextResponse } from "next/server";
import { runLastSeatRace } from "@/lib/booking";
import { apiError } from "@/app/api/_lib";

export async function POST() {
  try { return NextResponse.json(await runLastSeatRace()); } catch (error) { return apiError(error); }
}

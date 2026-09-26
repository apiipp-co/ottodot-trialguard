import { NextResponse } from "next/server";
import { listTrialClasses } from "@/lib/booking";
import { apiError } from "@/app/api/_lib";

export async function GET() {
  try { return NextResponse.json(await listTrialClasses()); } catch (error) { return apiError(error); }
}

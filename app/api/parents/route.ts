import { NextResponse } from "next/server";
import { listParents } from "@/lib/booking";
import { apiError } from "@/app/api/_lib";

export async function GET() {
  try { return NextResponse.json(await listParents()); } catch (error) { return apiError(error); }
}

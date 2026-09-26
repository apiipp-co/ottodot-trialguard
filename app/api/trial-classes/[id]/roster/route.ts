import { NextResponse } from "next/server";
import { getRoster } from "@/lib/booking";
import { apiError } from "@/app/api/_lib";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try { return NextResponse.json(await getRoster((await params).id)); } catch (error) { return apiError(error); }
}

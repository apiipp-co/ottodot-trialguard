import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { ServiceError } from "@/lib/types";

export function apiError(error: unknown) {
  if (error instanceof ServiceError) return NextResponse.json({ error: { code: error.code, message: error.message } }, { status: error.status });
  if (error instanceof ZodError) return NextResponse.json({ error: { code: "INVALID_INPUT", message: "Check the submitted booking details." } }, { status: 400 });
  console.error(error);
  return NextResponse.json({ error: { code: "INVALID_INPUT", message: "The request could not be completed." } }, { status: 500 });
}

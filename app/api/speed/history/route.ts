import { NextResponse } from "next/server";
import { listSpeedTests } from "@/lib/server/db";

export async function GET() {
  return NextResponse.json(listSpeedTests(30), { headers: { "Cache-Control": "no-store, max-age=0" } });
}

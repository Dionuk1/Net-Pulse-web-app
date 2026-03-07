import { NextRequest, NextResponse } from "next/server";
import { agentGet } from "@/lib/agentProxy";

export async function GET(request: NextRequest) {
  const ip = request.nextUrl.searchParams.get("ip")?.trim() ?? "";
  if (!ip) {
    return NextResponse.json({ error: "Query parameter 'ip' is required." }, { status: 400 });
  }
  try {
    const result = await agentGet<{ ip: string; osGuess: string; ttl: number | null }>(`/scan/os?ip=${encodeURIComponent(ip)}`);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "OS scan failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

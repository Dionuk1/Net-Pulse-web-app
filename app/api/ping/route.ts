import { NextRequest, NextResponse } from "next/server";
import { agentGet } from "@/lib/agentProxy";

export async function GET(request: NextRequest) {
  const ip = request.nextUrl.searchParams.get("ip")?.trim() ?? "";
  if (!ip) {
    return NextResponse.json({ error: "Query parameter 'ip' is required." }, { status: 400 });
  }

  try {
    const result = await agentGet<{ host: string; online: boolean; latencyMs: number | null }>(`/ping?host=${encodeURIComponent(ip)}`);
    return NextResponse.json({ ip: result.host, online: result.online, latencyMs: result.latencyMs });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to ping host.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

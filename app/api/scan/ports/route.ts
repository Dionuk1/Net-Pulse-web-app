import { NextRequest, NextResponse } from "next/server";
import { agentGet } from "@/lib/agentProxy";

export async function GET(request: NextRequest) {
  const ip = request.nextUrl.searchParams.get("ip")?.trim() ?? "";
  const range = request.nextUrl.searchParams.get("range")?.trim() ?? "";
  if (!ip) {
    return NextResponse.json({ error: "Query parameter 'ip' is required." }, { status: 400 });
  }
  try {
    const result = await agentGet<{ ip: string; ports: Array<{ port: number; service: string; open: boolean }>; openPorts: number[]; summary: string }>(
      `/scan/ports?ip=${encodeURIComponent(ip)}${range ? `&range=${encodeURIComponent(range)}` : ""}`,
    );
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Port scan failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

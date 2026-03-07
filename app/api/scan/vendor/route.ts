import { NextRequest, NextResponse } from "next/server";
import { agentGet } from "@/lib/agentProxy";

export async function GET(request: NextRequest) {
  const mac = request.nextUrl.searchParams.get("mac")?.trim() ?? "";
  if (!mac) {
    return NextResponse.json({ error: "Query parameter 'mac' is required." }, { status: 400 });
  }
  try {
    const result = await agentGet<{ mac: string; vendor: string }>(`/scan/vendor?mac=${encodeURIComponent(mac)}`);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Vendor lookup failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

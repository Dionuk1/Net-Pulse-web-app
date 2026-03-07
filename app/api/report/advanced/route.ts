import { NextResponse } from "next/server";
import { listActivityEvents, listSpeedTests, readCurrentDeviceState, readLatestTrustSample } from "@/lib/server/db";
import { getNetworkInfo } from "@/lib/windowsNetwork";

export async function GET() {
  const network = await getNetworkInfo().catch(() => ({
    ssid: "Unknown",
    localIp: "0.0.0.0",
    gateway: "1.1.1.1",
    dnsServers: [],
  }));

  return NextResponse.json(
    {
      generatedAt: new Date().toISOString(),
      network,
      devices: readCurrentDeviceState(),
      speedHistory: listSpeedTests(20),
      activityEvents: listActivityEvents(80),
      trustLatest: readLatestTrustSample(),
    },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}

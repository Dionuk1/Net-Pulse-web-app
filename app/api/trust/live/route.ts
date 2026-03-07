import { NextResponse } from "next/server";
import { readCurrentDeviceState, insertTrustSample, readLatestTrustSample } from "@/lib/server/db";
import { computeTrustScoreV2 } from "@/lib/trustScore";
import { getNetworkInfo } from "@/lib/windowsNetwork";

export async function GET() {
  try {
    const networkInfo = await getNetworkInfo().catch(() => null);
    const devices = readCurrentDeviceState();
    const last = readLatestTrustSample();
    const trust = computeTrustScoreV2({
      networkInfo,
      devices,
      previous: last
        ? {
            score: last.score,
            badge: last.badge,
            encryption: last.encryption,
            stability: last.stability,
            dnsConsistency: last.dnsConsistency,
            routerBehavior: last.routerBehavior,
            recommendation: "",
          }
        : null,
    });

    const timestamp = new Date().toISOString();
    insertTrustSample({
      timestamp,
      score: trust.score,
      badge: trust.badge,
      encryption: trust.encryption,
      stability: trust.stability,
      dnsConsistency: trust.dnsConsistency,
      routerBehavior: trust.routerBehavior,
    });

    return NextResponse.json(
      {
        ...trust,
        timestamp,
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to calculate trust score.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

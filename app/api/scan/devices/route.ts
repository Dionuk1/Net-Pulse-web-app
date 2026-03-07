import { NextResponse } from "next/server";
import { agentGet } from "@/lib/agentProxy";
import { scanDevicesFallback } from "@/lib/server/scanFallback";

type AgentDevice = {
  ip: string;
  mac: string;
  online: boolean;
  latencyMs: number | null;
  vendor: string;
  osGuess: string;
  openPorts: number[];
  openPortsSummary: string;
};

export async function GET() {
  try {
    const payload = await agentGet<{ timestamp: string; devices: AgentDevice[] }>("/scan/devices");
    return NextResponse.json(payload.devices, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to scan devices.";
    console.error("[scan/devices] agent failed:", message);
    try {
      const fallback = await scanDevicesFallback();
      return NextResponse.json(fallback, {
        headers: {
          "Cache-Control": "no-store, max-age=0",
          "X-NetPulse-Data-Source": "fallback",
        },
      });
    } catch (fallbackError) {
      const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : "Fallback scan failed.";
      console.error("[scan/devices] fallback failed:", fallbackMessage);
      return NextResponse.json({ error: fallbackMessage }, { status: 502, headers: { "Cache-Control": "no-store, max-age=0" } });
    }
  }
}

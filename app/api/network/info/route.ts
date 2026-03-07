import { NextResponse } from "next/server";
import { agentGet } from "@/lib/agentProxy";

export async function GET() {
  try {
    const info = await agentGet<{ ssid: string; localIp: string; gateway: string; dns: string[] }>("/network/info");
    return NextResponse.json({
      ssid: info.ssid,
      localIp: info.localIp,
      gateway: info.gateway,
      dnsServers: info.dns,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get network info.";
    return NextResponse.json({
      ssid: `Unknown (${message})`,
      localIp: "0.0.0.0",
      gateway: "1.1.1.1",
      dnsServers: [],
    });
  }
}

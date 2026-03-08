import { NextResponse } from "next/server";
import { agentGet } from "@/lib/agentProxy";
import { getNetworkInfo } from "@/lib/windowsNetwork";

export async function GET() {
  try {
    const info = await agentGet<{ ssid: string; localIp: string; gateway: string; dns: string[] }>("/network/info").catch(async () => {
      const fallback = await getNetworkInfo();
      return {
        ssid: fallback.ssid,
        localIp: fallback.localIp,
        gateway: fallback.gateway,
        dns: fallback.dnsServers,
      };
    });
    return NextResponse.json({
      ssid: info.ssid,
      localIp: info.localIp,
      gateway: info.gateway,
      dnsServers: info.dns,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get network info.";
    return NextResponse.json({
      ssid: "Unknown Network",
      localIp: "0.0.0.0",
      gateway: "",
      dnsServers: [],
      error: message,
    });
  }
}

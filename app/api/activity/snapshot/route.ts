import { NextResponse } from "next/server";
import { agentGet } from "@/lib/agentProxy";
import { buildActivityEvents } from "@/lib/activityLogic";
import {
  insertActivityEvents,
  listActivityEvents,
  readCurrentDeviceState,
  replaceDeviceState,
  type DbActivityEvent,
  type DbDeviceSnapshot,
} from "@/lib/server/db";
import { scanDevicesFallback } from "@/lib/server/scanFallback";

type AgentDevice = {
  ip: string;
  mac: string;
  online: boolean;
  latencyMs: number | null;
  vendor?: string;
  openPorts?: number[];
};

function suspiciousPortEvent(device: AgentDevice, timestamp: string): DbActivityEvent | null {
  const ports = device.openPorts ?? [];
  const suspicious = ports.find((port) => [22, 23, 3389, 445].includes(port));
  if (!suspicious) return null;

  return {
    id: `${timestamp}-${device.ip}-${device.mac}-suspicious-port-${suspicious}`,
    type: "latency_spike",
    deviceIp: device.ip,
    deviceMac: device.mac,
    deviceLabel: device.ip,
    details: `Suspicious open port detected: ${suspicious}`,
    severity: "critical",
    timestamp,
  };
}

export async function GET() {
  const timestamp = new Date().toISOString();

  try {
    let devices: AgentDevice[];
    try {
      const payload = await agentGet<{ devices: AgentDevice[] }>("/scan/devices");
      devices = payload.devices;
    } catch (agentError) {
      const message = agentError instanceof Error ? agentError.message : "Agent scan failed.";
      console.error("[activity/snapshot] agent failed:", message);
      devices = await scanDevicesFallback();
    }

    const currentDevices: DbDeviceSnapshot[] = devices.map((device) => ({
      ip: device.ip,
      mac: device.mac,
      online: device.online,
      latencyMs: device.latencyMs,
      name: device.ip,
      vendor: device.vendor,
      riskLevel: device.openPorts?.some((p) => [22, 23, 3389, 445].includes(p)) ? "high" : "low",
    }));

    const previous = readCurrentDeviceState();
    const diffEvents = buildActivityEvents(previous, currentDevices, timestamp);
    const suspiciousEvents = devices
      .map((device) => suspiciousPortEvent(device, timestamp))
      .filter((event): event is DbActivityEvent => Boolean(event));

    replaceDeviceState(currentDevices, timestamp);
    insertActivityEvents([...diffEvents, ...suspiciousEvents]);

    return NextResponse.json(
      {
        scannedDevices: devices.map((device) => ({
          ip: device.ip,
          mac: device.mac,
          online: device.online,
          latencyMs: device.latencyMs,
          name: device.ip,
        })),
        events: listActivityEvents(120),
        timestamp,
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to capture activity snapshot.";
    console.error("[activity/snapshot]", message);
    return NextResponse.json(
      { error: message },
      { status: 502, headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }
}

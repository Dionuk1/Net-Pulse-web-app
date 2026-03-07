import "server-only";

import { scanArpDevices } from "@/lib/windowsNetwork";

export type FallbackDevice = {
  ip: string;
  mac: string;
  online: boolean;
  latencyMs: number | null;
  vendor: string;
  osGuess: string;
  openPorts: number[];
  openPortsSummary: string;
};

export async function scanDevicesFallback(): Promise<FallbackDevice[]> {
  const devices = await scanArpDevices();

  return devices.map((device) => ({
    ip: device.ip,
    mac: device.mac,
    online: device.online,
    latencyMs: device.latencyMs,
    vendor: "Unknown",
    osGuess: "Unknown",
    openPorts: [],
    openPortsSummary: "N/A",
  }));
}

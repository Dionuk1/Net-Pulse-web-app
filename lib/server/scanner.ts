import "server-only";

import { reverse } from "node:dns/promises";
import { buildActivityEvents } from "@/lib/activityLogic";
import { enrichDevices } from "@/lib/networkInsights";
import { insertActivityEvents, readCurrentDeviceState, replaceDeviceState, type DbDeviceSnapshot } from "@/lib/server/db";
import { resolveNetBiosName, scanArpDevices } from "@/lib/windowsNetwork";

export type ScanSnapshot = {
  timestamp: string;
  devices: DbDeviceSnapshot[];
};

async function mapWithLimit<T, R>(items: T[], limit: number, mapper: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;
  async function worker() {
    while (true) {
      const current = index;
      index += 1;
      if (current >= items.length) break;
      results[current] = await mapper(items[current]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(Math.max(1, items.length), limit) }, () => worker()));
  return results;
}

async function resolveName(ip: string): Promise<string | undefined> {
  try {
    const hostnames = await reverse(ip);
    if (hostnames[0]) return hostnames[0];
  } catch {
    // best effort
  }
  const netBios = await resolveNetBiosName(ip).catch(() => null);
  return netBios ?? undefined;
}

export async function runAdvancedDeviceScan(): Promise<ScanSnapshot> {
  const scanned = await scanArpDevices().catch(() => []);
  const ipNames = await mapWithLimit(scanned, 6, async (item) => ({ ip: item.ip, name: await resolveName(item.ip) }));
  const nameMap = new Map(ipNames.filter((item) => item.name).map((item) => [item.ip, item.name as string]));
  const enriched = enrichDevices(scanned, nameMap);
  const timestamp = new Date().toISOString();

  const devices: DbDeviceSnapshot[] = enriched.map((device) => ({
    ip: device.ip,
    mac: device.mac,
    online: device.online,
    latencyMs: device.latencyMs,
    name: device.name,
    vendor: device.vendor,
    riskLevel: device.riskLevel,
  }));

  const previous = readCurrentDeviceState();
  const events = buildActivityEvents(previous, devices, timestamp);
  replaceDeviceState(devices, timestamp);
  insertActivityEvents(events);

  return { timestamp, devices };
}

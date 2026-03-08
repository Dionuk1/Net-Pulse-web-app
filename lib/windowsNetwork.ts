import { execFile } from "node:child_process";
import os from "node:os";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type NetworkInfo = {
  ssid: string;
  localIp: string;
  gateway: string;
  dnsServers: string[];
};

export type ScannedDevice = {
  ip: string;
  mac: string;
  seen: boolean; // ? FIX
  online: boolean;
  latencyMs: number | null;
  reason?: string;
};


function ensureWindows() {
  if (process.platform !== "win32") {
    throw new Error("This endpoint is supported on Windows only.");
  }
}

async function runCommand(
  file: string,
  args: string[],
  timeoutMs = 7000,
): Promise<string> {
  const { stdout } = await execFileAsync(file, args, {
    timeout: timeoutMs,
    windowsHide: true,
    maxBuffer: 1024 * 1024,
  });
  return stdout ?? "";
}

function parseSsid(output: string): string {
  const lines = output.split(/\r?\n/);

  // match: SSID                   : MyWifi
  for (const raw of lines) {
    const m = raw.match(/^\s*SSID\s*:\s*(.+)\s*$/i);
    if (m && !/BSSID/i.test(raw)) {
      const val = m[1].trim();
      if (val && val.toLowerCase() !== "n/a") return val;
    }
  }

  return "Unknown";
}

function normalizeMac(mac: string): string {
  return mac.replace(/-/g, ":").toUpperCase();
}

export function isIPv4Address(ip: string): boolean {
  const parts = ip.split(".");
  if (parts.length !== 4) return false;

  return parts.every((part) => {
    if (!/^\d+$/.test(part)) return false;
    const value = Number(part);
    return value >= 0 && value <= 255;
  });
}

export function isLocalIPv4(ip: string): boolean {
  if (!isIPv4Address(ip)) return false;

  const [a, b] = ip.split(".").map(Number);

  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 169 && b === 254) return true; // link-local

  return false;
}

function parseArpEntries(output: string): Array<{ ip: string; mac: string }> {
  const lines = output.split(/\r?\n/);
  const results: Array<{ ip: string; mac: string }> = [];

  for (const line of lines) {
    const match = line.match(
      /\s*(\d+\.\d+\.\d+\.\d+)\s+([0-9a-fA-F-]{17})\s+\w+/,
    );
    if (!match) continue;

    const ip = match[1];
    const mac = normalizeMac(match[2]);

    if (!isLocalIPv4(ip)) continue;
    if (mac === "FF:FF:FF:FF:FF:FF") continue;

    results.push({ ip, mac });
  }

  const seen = new Set<string>();
  return results.filter((entry) => {
    const key = `${entry.ip}-${entry.mac}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function parsePingLatency(output: string): { online: boolean; latencyMs: number | null } {
  const online = /TTL=/i.test(output) || /Reply from/i.test(output);
  if (!online) return { online: false, latencyMs: null };

  const exact = output.match(/time[=<]\s*(\d+)ms/i);
  if (exact) return { online: true, latencyMs: Number(exact[1]) };

  const avg = output.match(/Average\s*=\s*(\d+)ms/i);
  if (avg) return { online: true, latencyMs: Number(avg[1]) };

  return { online: true, latencyMs: null };
}

export async function pingHost(ip: string): Promise<{ online: boolean; latencyMs: number | null }> {
  ensureWindows();

  if (!isIPv4Address(ip)) {
    throw new Error("Host must be a valid IPv4 address.");
  }

  const output = await runCommand("ping", ["-n", "1", "-w", "900", ip], 3000).catch(
    (error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      return message;
    },
  );

  return parsePingLatency(output);
}

export async function getNetworkInfo(): Promise<NetworkInfo> {
  const fallback: NetworkInfo = {
    ssid: "Unknown",
    localIp: "0.0.0.0",
    gateway: "",
    dnsServers: [],
  };

  if (process.platform !== "win32") {
    return {
      ...fallback,
      ssid: "Unavailable (non-Windows runtime)",
    };
  }

  // Wi-Fi SSID (vetëm nëse je lidh me Wi-Fi)
  const ssidRaw = await runCommand("netsh", ["wlan", "show", "interfaces"], 7000).catch(() => "");
  const ssidParsed = parseSsid(ssidRaw);

  // Nëse Wi-Fi është disconnected ose nuk ka SSID -> konsideroje Ethernet
  const ssid = ssidParsed === "Unknown" ? "Wired (Ethernet)" : ssidParsed;

  // Zgjedh adapterin aktiv me gateway (Ethernet ose Wi-Fi)
  const psScript = `
$cfg = Get-NetIPConfiguration |
  Where-Object { $_.NetAdapter.Status -eq 'Up' -and $_.IPv4Address -ne $null } |
  Sort-Object -Property InterfaceMetric |
  Select-Object -First 1;

if ($null -eq $cfg) {
  [pscustomobject]@{
    localIp    = ""
    gateway    = ""
    dnsServers = @()
  } | ConvertTo-Json -Compress
  exit 0
}

$ip = $cfg.IPv4Address.IPAddress | Select-Object -First 1;
$gw = "";
if ($cfg.IPv4DefaultGateway -ne $null) { $gw = $cfg.IPv4DefaultGateway.NextHop; }

$dns = @();
try {
  $dns = (Get-DnsClientServerAddress -InterfaceIndex $cfg.InterfaceIndex -AddressFamily IPv4).ServerAddresses
} catch { }

[pscustomobject]@{
  localIp    = $ip
  gateway    = $gw
  dnsServers = $dns
} | ConvertTo-Json -Compress
`.trim();

  const configRaw = await runCommand("powershell.exe", ["-NoProfile", "-Command", psScript], 7000).catch(() => "");
  if (!configRaw) {
    return { ...fallback, ssid };
  }

  let parsed: { localIp?: string; gateway?: string; dnsServers?: string[] } = {};
  try {
    parsed = JSON.parse(configRaw || "{}") as {
      localIp?: string;
      gateway?: string;
      dnsServers?: string[];
    };
  } catch {
    return { ...fallback, ssid };
  }

  let localIp = parsed.localIp ?? "";
  let gateway = parsed.gateway ?? "";
  const dnsServers = (parsed.dnsServers ?? []).filter(isIPv4Address);

  if (!isIPv4Address(localIp)) {
    const interfaces = os.networkInterfaces();
    for (const entries of Object.values(interfaces)) {
      if (!entries) continue;
      for (const entry of entries) {
        if (entry.family !== "IPv4" || entry.internal) continue;
        if (!isIPv4Address(entry.address)) continue;
        localIp = entry.address;
        break;
      }
      if (isIPv4Address(localIp)) break;
    }
  }

  if (!isIPv4Address(gateway)) {
    const routeRaw = await runCommand("route", ["PRINT", "-4"], 5000).catch(() => "");
    const match = routeRaw.match(/^\s*0\.0\.0\.0\s+0\.0\.0\.0\s+(\d+\.\d+\.\d+\.\d+)/m);
    gateway = match && isIPv4Address(match[1]) ? match[1] : "";
  }

  if (!isIPv4Address(localIp)) {
    return { ...fallback, ssid, gateway };
  }

  return { ssid, localIp, gateway, dnsServers };
}

async function mapWithLimit<T, R>(
  items: T[],
  limit: number,
  mapper: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= items.length) break;
      results[index] = await mapper(items[index]);
    }
  }

  const workers = Array.from({ length: Math.min(limit, Math.max(items.length, 1)) }, () => worker());
  await Promise.all(workers);
  return results;
}

export async function scanArpDevices(): Promise<ScannedDevice[]> {
  ensureWindows();

  const arpRaw = await runCommand("arp", ["-a"], 7000);
  const entries = parseArpEntries(arpRaw);

  const scanned = await mapWithLimit(entries, 10, async (entry) => {
    const ping = await pingHost(entry.ip).catch(() => ({ online: false, latencyMs: null }));

    return {
      ip: entry.ip,
      mac: entry.mac,
      seen: true,
      online: ping.online,
      latencyMs: ping.latencyMs,
      reason: ping.online ? "reachable" : "no_ping",
    };
  });

  scanned.sort((a, b) => a.ip.localeCompare(b.ip, undefined, { numeric: true }));
  return scanned;
}

export async function resolveNetBiosName(ip: string): Promise<string | null> {
  ensureWindows();

  if (!isIPv4Address(ip)) {
    return null;
  }

  try {
    const output = await runCommand("nbtstat", ["-A", ip], 4000);
    const lines = output.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

    for (const line of lines) {
      if (!/<00>\s+UNIQUE/i.test(line)) {
        continue;
      }

      const name = line.split(/\s+/)[0];
      if (name && name !== "NetBIOS") {
        return name;
      }
    }
  } catch {
    return null;
  }

  return null;
}


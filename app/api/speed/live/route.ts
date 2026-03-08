import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { NextResponse } from "next/server";

const execFileAsync = promisify(execFile);

type SpeedSample = {
  timestampMs: number;
  rxBytes: number;
  txBytes: number;
};

let previousSample: SpeedSample | null = null;

function toMbps(bytesDelta: number, msDelta: number): number {
  if (bytesDelta <= 0 || msDelta <= 0) return 0;
  const seconds = msDelta / 1000;
  const bitsPerSecond = (bytesDelta * 8) / seconds;
  return Number((bitsPerSecond / 1_000_000).toFixed(2));
}

export async function GET() {
  if (process.platform !== "win32") {
    return NextResponse.json({ rxMbps: 0, txMbps: 0, interfaceAlias: "unsupported", timestamp: new Date().toISOString() });
  }

  const psScript = `
$cfg = Get-NetIPConfiguration |
  Where-Object { $_.NetAdapter.Status -eq 'Up' -and $_.IPv4Address -ne $null -and $_.IPv4DefaultGateway -ne $null } |
  Sort-Object -Property InterfaceMetric |
  Select-Object -First 1;

if ($null -eq $cfg) {
  [pscustomobject]@{ rxBytes = 0; txBytes = 0; interfaceAlias = "none" } | ConvertTo-Json -Compress
  exit 0
}

$stats = Get-NetAdapterStatistics -Name $cfg.InterfaceAlias;
[pscustomobject]@{
  rxBytes = [double]$stats.ReceivedBytes
  txBytes = [double]$stats.SentBytes
  interfaceAlias = $cfg.InterfaceAlias
} | ConvertTo-Json -Compress
`.trim();

  try {
    const { stdout } = await execFileAsync("powershell.exe", ["-NoProfile", "-Command", psScript], {
      timeout: 7000,
      windowsHide: true,
      maxBuffer: 1024 * 1024,
    });

    const parsed = JSON.parse(stdout || "{}") as { rxBytes?: number; txBytes?: number; interfaceAlias?: string };
    const nowMs = Date.now();
    const current: SpeedSample = {
      timestampMs: nowMs,
      rxBytes: Number(parsed.rxBytes ?? 0),
      txBytes: Number(parsed.txBytes ?? 0),
    };

    let rxMbps = 0;
    let txMbps = 0;
    if (previousSample && current.rxBytes >= previousSample.rxBytes && current.txBytes >= previousSample.txBytes) {
      const msDelta = current.timestampMs - previousSample.timestampMs;
      rxMbps = toMbps(current.rxBytes - previousSample.rxBytes, msDelta);
      txMbps = toMbps(current.txBytes - previousSample.txBytes, msDelta);
    }
    previousSample = current;

    return NextResponse.json({
      rxMbps,
      txMbps,
      interfaceAlias: parsed.interfaceAlias || "unknown",
      timestamp: new Date(nowMs).toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to read live bandwidth.";
    return NextResponse.json({ error: message, rxMbps: 0, txMbps: 0, interfaceAlias: "unknown", timestamp: new Date().toISOString() }, { status: 500 });
  }
}

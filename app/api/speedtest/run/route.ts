import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { NextResponse } from "next/server";
import { insertSpeedTest } from "@/lib/server/db";

const execFileAsync = promisify(execFile);
const SPEEDTEST_ARGS = ["--format=json", "--accept-license", "--accept-gdpr", "--progress=no"] as const;
const COMMAND_TIMEOUT_MS = 60_000;

type OoklaCliResult = {
  timestamp?: string;
  isp?: string;
  packetLoss?: number;
  ping?: {
    latency?: number;
    jitter?: number;
  };
  download?: {
    bandwidth?: number;
  };
  upload?: {
    bandwidth?: number;
  };
  interface?: {
    externalIp?: string;
  };
  server?: {
    name?: string;
    location?: string;
  };
  result?: {
    url?: string;
  };
};

function toMbps(bytesPerSecond: number | undefined): number {
  if (typeof bytesPerSecond !== "number" || !Number.isFinite(bytesPerSecond) || bytesPerSecond < 0) {
    return 0;
  }
  return Number(((bytesPerSecond * 8) / 1_000_000).toFixed(2));
}

function toRoundedNumber(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return 0;
  }
  return Number(value.toFixed(2));
}

function resolveSpeedtestBin(): { bin: string | null; checked: string[] } {
  const checked: string[] = [];

  const envBin = process.env.NETPULSE_SPEEDTEST_BIN?.trim();
  if (envBin) {
    checked.push(envBin);
    if (fs.existsSync(envBin)) {
      return { bin: envBin, checked };
    }
  }

  const projectRoot = process.cwd();
  const commonLocal = path.join(projectRoot, "ookla-speedtest-1.2.0-win64", "speedtest.exe");
  checked.push(commonLocal);
  if (fs.existsSync(commonLocal)) {
    return { bin: commonLocal, checked };
  }

  const rootEntries = fs.readdirSync(projectRoot, { withFileTypes: true });
  for (const entry of rootEntries) {
    if (!entry.isDirectory()) continue;
    if (!/^ookla-speedtest/i.test(entry.name)) continue;

    const candidate = path.join(projectRoot, entry.name, "speedtest.exe");
    checked.push(candidate);
    if (fs.existsSync(candidate)) {
      return { bin: candidate, checked };
    }
  }

  const legacyPath = "C:\\Tools\\speedtest\\speedtest.exe";
  checked.push(legacyPath);
  if (fs.existsSync(legacyPath)) {
    return { bin: legacyPath, checked };
  }

  return { bin: null, checked };
}

export async function POST() {
  if (process.platform !== "win32") {
    return NextResponse.json({ error: "Speedtest CLI is supported on Windows only." }, { status: 400 });
  }

  const { bin: speedtestBin, checked } = resolveSpeedtestBin();
  if (!speedtestBin) {
    return NextResponse.json(
      { error: `Speedtest executable not found. Checked: ${checked.join(" | ")}` },
      { status: 500 },
    );
  }

  try {
    const { stdout } = await execFileAsync(speedtestBin, [...SPEEDTEST_ARGS], {
      windowsHide: true,
      timeout: COMMAND_TIMEOUT_MS,
      maxBuffer: 4 * 1024 * 1024,
    });

    let parsed: OoklaCliResult;
    try {
      parsed = JSON.parse(stdout || "{}") as OoklaCliResult;
    } catch {
      return NextResponse.json({ error: "Failed to parse Speedtest CLI JSON output." }, { status: 500 });
    }

    const timestamp = parsed.timestamp ?? new Date().toISOString();
    const downloadMbps = toMbps(parsed.download?.bandwidth);
    const uploadMbps = toMbps(parsed.upload?.bandwidth);
    const pingMs = toRoundedNumber(parsed.ping?.latency);
    const jitterMs = toRoundedNumber(parsed.ping?.jitter);
    const packetLoss = toRoundedNumber(parsed.packetLoss);
    const isp = parsed.isp?.trim() || "Unknown ISP";
    const publicIp = parsed.interface?.externalIp?.trim() || "0.0.0.0";
    const serverName = parsed.server?.name?.trim() || "Unknown Server";
    const serverLocation = parsed.server?.location?.trim() || "Unknown Location";
    const resultUrl = parsed.result?.url?.trim() || null;

    insertSpeedTest({
      id: `speed-${Date.now()}`,
      timestamp,
      downloadMbps,
      uploadMbps,
      pingMs: Math.round(pingMs),
      targetHost: `${serverName} (${serverLocation})`,
    });

    return NextResponse.json({
      downloadMbps,
      uploadMbps,
      pingMs,
      jitterMs,
      packetLoss,
      isp,
      publicIp,
      serverName,
      serverLocation,
      resultUrl,
      timestamp,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Speedtest CLI execution failed.";
    const hint = /ENOENT|not recognized/i.test(message)
      ? `Speedtest executable not found at ${speedtestBin}.`
      : /timed out/i.test(message)
        ? "Speedtest CLI timed out after 60 seconds."
        : message;

    return NextResponse.json({ error: hint }, { status: 500 });
  }
}

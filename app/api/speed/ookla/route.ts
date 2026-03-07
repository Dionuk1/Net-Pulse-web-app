import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { NextResponse } from "next/server";
import { insertSpeedTest } from "@/lib/server/db";

const execFileAsync = promisify(execFile);
const COMMAND_TIMEOUT_MS = 70000;

type OoklaRaw = {
  timestamp?: string;
  ping?: { latency?: number };
  download?: { bandwidth?: number };
  upload?: { bandwidth?: number };
  server?: { host?: string; name?: string };
  result?: { url?: string };
};

function toMbps(bandwidthBytesPerSecond: number | undefined): number {
  if (!bandwidthBytesPerSecond || !Number.isFinite(bandwidthBytesPerSecond)) {
    return 0;
  }
  return Number(((bandwidthBytesPerSecond * 8) / 1_000_000).toFixed(2));
}

export async function POST() {
  if (process.platform !== "win32") {
    return NextResponse.json({ error: "Speed test is supported on Windows only." }, { status: 400 });
  }

  try {
    const { stdout } = await execFileAsync(
      "speedtest",
      ["--accept-license", "--accept-gdpr", "--format=json"],
      { timeout: COMMAND_TIMEOUT_MS, windowsHide: true, maxBuffer: 1024 * 1024 * 4 },
    );

    const raw = JSON.parse(stdout || "{}") as OoklaRaw;
    const timestamp = raw.timestamp || new Date().toISOString();
    const downloadMbps = toMbps(raw.download?.bandwidth);
    const uploadMbps = toMbps(raw.upload?.bandwidth);
    const pingMs = Number(Math.round(raw.ping?.latency ?? 0));
    const targetHost = raw.server?.host || raw.server?.name || "Ookla Server";

    const entry = {
      id: `speed-${Date.now()}`,
      timestamp,
      downloadMbps,
      uploadMbps,
      pingMs,
      targetHost,
    };

    insertSpeedTest(entry);

    return NextResponse.json({
      ...entry,
      resultUrl: raw.result?.url ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ookla CLI speed test failed.";
    const hint = /ENOENT|not recognized/i.test(message)
      ? "Install Ookla Speedtest CLI and ensure `speedtest` is in PATH."
      : message;

    return NextResponse.json({ error: hint }, { status: 500 });
  }
}

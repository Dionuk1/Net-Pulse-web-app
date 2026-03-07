import { execFile } from "node:child_process";
import { timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import {
  DEFAULT_COMMAND_TIMEOUT_MS,
  MAX_JSON_BODY_BYTES,
  MAX_OUTPUT_LENGTH,
  NETPULSE_TOKEN,
  TOKEN_HEADER,
} from "./config.js";
import type { IncomingMessage, ServerResponse } from "node:http";

const execFileAsync = promisify(execFile);

export type JsonValue = Record<string, unknown>;

export function json(res: ServerResponse, status: number, payload: JsonValue): void {
  const body = JSON.stringify(payload);
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(body);
}

export async function readJsonBody(req: IncomingMessage): Promise<JsonValue> {
  const chunks: Buffer[] = [];
  let total = 0;

  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buffer.byteLength;
    if (total > MAX_JSON_BODY_BYTES) {
      throw new Error("Request body too large.");
    }
    chunks.push(buffer);
  }

  const raw = Buffer.concat(chunks).toString("utf-8").trim();
  if (!raw) {
    return {};
  }

  const parsed = JSON.parse(raw) as unknown;
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("JSON body must be an object.");
  }
  return parsed as JsonValue;
}

export function requireToken(req: IncomingMessage): boolean {
  const tokenHeader = req.headers[TOKEN_HEADER];
  const token = Array.isArray(tokenHeader) ? tokenHeader[0] : tokenHeader;
  return typeof token === "string" && token.length > 0 && timingSafeEquals(token, NETPULSE_TOKEN);
}

function timingSafeEquals(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) {
    return false;
  }
  return timingSafeEqual(aBuf, bBuf);
}

export function isIPv4Address(ip: string): boolean {
  const parts = ip.split(".");
  if (parts.length !== 4) return false;
  return parts.every((part) => {
    if (!/^\d+$/.test(part)) return false;
    const n = Number(part);
    return n >= 0 && n <= 255;
  });
}

export function isHostname(input: string): boolean {
  return /^([a-zA-Z0-9-]+\.)*[a-zA-Z0-9-]+$/.test(input) && !input.startsWith("-") && input.length <= 253;
}

export function isLocalIPv4(ip: string): boolean {
  if (!isIPv4Address(ip)) return false;
  const [a, b] = ip.split(".").map(Number);
  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 169 && b === 254) return true;
  return false;
}

export function sanitizeOutput(raw: string): string {
  const noAnsi = raw.replace(/\x1B\[[0-9;]*[A-Za-z]/g, "");
  const printable = noAnsi.replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "");
  if (printable.length <= MAX_OUTPUT_LENGTH) {
    return printable;
  }
  return `${printable.slice(0, MAX_OUTPUT_LENGTH)}\n\n[output truncated]`;
}

export async function runCommand(
  file: string,
  args: string[],
  timeoutMs = DEFAULT_COMMAND_TIMEOUT_MS,
): Promise<{ ok: boolean; output: string }> {
  try {
    const { stdout, stderr } = await execFileAsync(file, args, {
      timeout: timeoutMs,
      windowsHide: true,
      maxBuffer: MAX_OUTPUT_LENGTH * 2,
    });
    return { ok: true, output: sanitizeOutput([stdout, stderr].filter(Boolean).join("\n").trim() || "(no output)") };
  } catch (error: unknown) {
    const processError = error as { stdout?: string; stderr?: string; message?: string };
    const output = sanitizeOutput(
      [processError.stdout, processError.stderr].filter(Boolean).join("\n").trim() || processError.message || "Command failed.",
    );
    return { ok: false, output };
  }
}

export async function mapWithLimit<T, R>(items: T[], limit: number, mapper: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= items.length) break;
      results[index] = await mapper(items[index]);
    }
  }

  const workers = Array.from({ length: Math.min(Math.max(items.length, 1), limit) }, () => worker());
  await Promise.all(workers);
  return results;
}

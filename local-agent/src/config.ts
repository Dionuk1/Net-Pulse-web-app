export const AGENT_HOST = "127.0.0.1";
export const AGENT_PORT = 5055;

export const TOKEN_HEADER = "x-netpulse-token";
export const NETPULSE_TOKEN = process.env.NETPULSE_TOKEN || "change-me-local-token";

export const MAX_JSON_BODY_BYTES = 32 * 1024;
export const MAX_OUTPUT_LENGTH = 12000;
export const DEFAULT_COMMAND_TIMEOUT_MS = 7000;
export const PING_TIMEOUT_MS = 3500;
export const SCAN_PING_CONCURRENCY = 10;

if (!process.env.NETPULSE_TOKEN) {
  console.warn("[agent] NETPULSE_TOKEN not set. Using fallback token. Set NETPULSE_TOKEN in production.");
}

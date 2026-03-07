import { createServer } from "node:http";
import { URL } from "node:url";
import type { IncomingMessage, ServerResponse } from "node:http";
import { AGENT_HOST, AGENT_PORT } from "./config.js";
import { getNetworkInfo, pingHost, scanDevices, scanOs, scanPorts, scanVendor } from "./network.js";
import { parseTerminalInput, runTerminalCommand } from "./terminal.js";
import { isIPv4Address, json, readJsonBody, requireToken } from "./utils.js";

const REQUEST_WINDOW_MS = 60_000;
const REQUEST_LIMIT = 120;
const requestBuckets = new Map<string, { count: number; windowStart: number }>();

function requestPath(reqUrl: string | undefined, hostHeader: string | undefined): URL {
  return new URL(reqUrl || "/", `http://${hostHeader || `${AGENT_HOST}:${AGENT_PORT}`}`);
}

function ensureLocalRemote(remote?: string): boolean {
  if (!remote) return false;
  return remote === "127.0.0.1" || remote === "::1" || remote === "::ffff:127.0.0.1";
}

async function handleRequest(req: IncomingMessage, res: ServerResponse) {
  const method = req.method || "GET";
  const url = requestPath(req.url, req.headers.host);
  const path = url.pathname;

  if (!ensureLocalRemote(req.socket.remoteAddress || undefined)) {
    json(res, 403, { error: "Forbidden remote address." });
    return;
  }

  const remoteKey = req.socket.remoteAddress || "unknown";
  const now = Date.now();
  const bucket = requestBuckets.get(remoteKey);
  if (!bucket || now - bucket.windowStart > REQUEST_WINDOW_MS) {
    requestBuckets.set(remoteKey, { count: 1, windowStart: now });
  } else {
    bucket.count += 1;
    if (bucket.count > REQUEST_LIMIT) {
      json(res, 429, { error: "Rate limit exceeded." });
      return;
    }
  }

  if (method === "GET" && path === "/health") {
    json(res, 200, {
      ok: true,
      service: "netpulse-local-agent",
      platform: process.platform,
      uptimeSec: Math.round(process.uptime()),
      now: new Date().toISOString(),
    });
    return;
  }

  if (!requireToken(req)) {
    json(res, 401, { error: "Unauthorized. Missing or invalid X-NETPULSE-TOKEN." });
    return;
  }

  try {
    if (method === "GET" && path === "/network/info") {
      const info = await getNetworkInfo();
      json(res, 200, info);
      return;
    }

    if (method === "GET" && path === "/scan/devices") {
      const devices = await scanDevices();
      json(res, 200, {
        timestamp: new Date().toISOString(),
        devices,
      });
      return;
    }

    if (method === "GET" && path === "/scan/ports") {
      const ip = (url.searchParams.get("ip") || "").trim();
      const range = (url.searchParams.get("range") || "").trim() || null;
      if (!isIPv4Address(ip)) {
        json(res, 400, { error: "Query parameter 'ip' must be a valid IPv4 address." });
        return;
      }
      const result = await scanPorts(ip, range);
      json(res, 200, result);
      return;
    }

    if (method === "GET" && path === "/scan/os") {
      const ip = (url.searchParams.get("ip") || "").trim();
      if (!isIPv4Address(ip)) {
        json(res, 400, { error: "Query parameter 'ip' must be a valid IPv4 address." });
        return;
      }
      const result = await scanOs(ip);
      json(res, 200, result);
      return;
    }

    if (method === "GET" && path === "/scan/vendor") {
      const mac = (url.searchParams.get("mac") || "").trim();
      if (!mac) {
        json(res, 400, { error: "Query parameter 'mac' is required." });
        return;
      }
      const result = scanVendor(mac);
      json(res, 200, result);
      return;
    }

    if (method === "GET" && path === "/ping") {
      const host = (url.searchParams.get("host") || "").trim();
      if (!isIPv4Address(host)) {
        json(res, 400, { error: "Query parameter 'host' must be a valid IPv4 address." });
        return;
      }
      const result = await pingHost(host);
      json(res, 200, result);
      return;
    }

    if (method === "POST" && path === "/terminal/run") {
      const body = await readJsonBody(req);
      const input = parseTerminalInput(body);
      const result = await runTerminalCommand(input);
      json(res, 200, {
        ok: result.ok,
        command: input.cmd,
        output: result.output,
      });
      return;
    }

    json(res, 404, { error: "Not found." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error.";
    json(res, 500, { error: message });
  }
}

const server = createServer((req, res) => {
  void handleRequest(req, res);
});

server.listen(AGENT_PORT, AGENT_HOST, () => {
  console.log(`[agent] Listening on http://${AGENT_HOST}:${AGENT_PORT}`);
});

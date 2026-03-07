import "server-only";

import { DatabaseSync } from "node:sqlite";
import path from "node:path";

export type DbSpeedTest = {
  id: string;
  timestamp: string;
  downloadMbps: number;
  uploadMbps: number;
  pingMs: number;
  targetHost: string;
};

export type DbDeviceSnapshot = {
  ip: string;
  mac: string;
  online: boolean;
  latencyMs: number | null;
  name?: string;
  vendor?: string;
  riskLevel?: "low" | "medium" | "high";
};

export type DbActivityEvent = {
  id: string;
  type: "device_added" | "device_removed" | "went_offline" | "came_online" | "latency_spike";
  deviceIp: string;
  deviceMac: string;
  deviceLabel: string;
  details: string;
  severity: "info" | "warn" | "critical";
  timestamp: string;
};

let dbInstance: DatabaseSync | null = null;

function getDbPath(): string {
  return path.join(process.cwd(), "netpulse.db");
}

function db(): DatabaseSync {
  if (dbInstance) {
    return dbInstance;
  }

  const next = new DatabaseSync(getDbPath());
  next.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;

    CREATE TABLE IF NOT EXISTS speed_tests (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      download_mbps REAL NOT NULL,
      upload_mbps REAL NOT NULL,
      ping_ms INTEGER NOT NULL,
      target_host TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS device_state (
      device_key TEXT PRIMARY KEY,
      ip TEXT NOT NULL,
      mac TEXT NOT NULL,
      name TEXT,
      vendor TEXT,
      risk_level TEXT NOT NULL DEFAULT 'low',
      online INTEGER NOT NULL,
      latency_ms INTEGER,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS device_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at TEXT NOT NULL,
      ip TEXT NOT NULL,
      mac TEXT NOT NULL,
      name TEXT,
      vendor TEXT,
      risk_level TEXT NOT NULL DEFAULT 'low',
      online INTEGER NOT NULL,
      latency_ms INTEGER
    );

    CREATE TABLE IF NOT EXISTS activity_events (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      event_type TEXT NOT NULL,
      device_ip TEXT NOT NULL,
      device_mac TEXT NOT NULL,
      device_label TEXT NOT NULL,
      details TEXT NOT NULL,
      severity TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS terminal_audit (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at TEXT NOT NULL,
      cmd TEXT NOT NULL,
      args TEXT NOT NULL,
      ok INTEGER NOT NULL,
      duration_ms INTEGER NOT NULL,
      output_preview TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS trust_samples (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at TEXT NOT NULL,
      score INTEGER NOT NULL,
      badge TEXT NOT NULL,
      encryption INTEGER NOT NULL,
      stability INTEGER NOT NULL,
      dns_consistency INTEGER NOT NULL,
      router_behavior INTEGER NOT NULL
    );
  `);

  dbInstance = next;
  return next;
}

function deviceKey(ip: string, mac: string): string {
  return `${ip}-${mac}`.toUpperCase();
}

export function insertSpeedTest(entry: DbSpeedTest): void {
  db().prepare(`
    INSERT OR REPLACE INTO speed_tests (id, created_at, download_mbps, upload_mbps, ping_ms, target_host)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(entry.id, entry.timestamp, entry.downloadMbps, entry.uploadMbps, entry.pingMs, entry.targetHost);
}

export function listSpeedTests(limit = 20): DbSpeedTest[] {
  return db().prepare(`
    SELECT id, created_at, download_mbps, upload_mbps, ping_ms, target_host
    FROM speed_tests
    ORDER BY datetime(created_at) DESC
    LIMIT ?
  `).all(limit).map((row: unknown) => {
    const typed = row as Record<string, unknown>;
    return {
      id: String(typed.id),
      timestamp: String(typed.created_at),
      downloadMbps: Number(typed.download_mbps),
      uploadMbps: Number(typed.upload_mbps),
      pingMs: Number(typed.ping_ms),
      targetHost: String(typed.target_host),
    };
  });
}

export function appendDeviceSnapshot(devices: DbDeviceSnapshot[], timestamp: string): void {
  if (devices.length === 0) {
    return;
  }

  const insertSnapshot = db().prepare(`
    INSERT INTO device_snapshots (created_at, ip, mac, name, vendor, risk_level, online, latency_ms)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const upsertState = db().prepare(`
    INSERT INTO device_state (device_key, ip, mac, name, vendor, risk_level, online, latency_ms, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(device_key) DO UPDATE SET
      ip = excluded.ip,
      mac = excluded.mac,
      name = excluded.name,
      vendor = excluded.vendor,
      risk_level = excluded.risk_level,
      online = excluded.online,
      latency_ms = excluded.latency_ms,
      updated_at = excluded.updated_at
  `);

  for (const device of devices) {
    insertSnapshot.run(
      timestamp,
      device.ip,
      device.mac,
      device.name ?? null,
      device.vendor ?? null,
      device.riskLevel ?? "low",
      device.online ? 1 : 0,
      device.latencyMs ?? null,
    );
    upsertState.run(
      deviceKey(device.ip, device.mac),
      device.ip,
      device.mac,
      device.name ?? null,
      device.vendor ?? null,
      device.riskLevel ?? "low",
      device.online ? 1 : 0,
      device.latencyMs ?? null,
      timestamp,
    );
  }
}

export function readCurrentDeviceState(): DbDeviceSnapshot[] {
  return db().prepare(`
    SELECT ip, mac, name, vendor, risk_level, online, latency_ms
    FROM device_state
  `).all().map((row: unknown) => {
    const typed = row as Record<string, unknown>;
    return {
      ip: String(typed.ip),
      mac: String(typed.mac),
      name: typed.name ? String(typed.name) : undefined,
      vendor: typed.vendor ? String(typed.vendor) : undefined,
      riskLevel: (typed.risk_level ? String(typed.risk_level) : "low") as "low" | "medium" | "high",
      online: Number(typed.online) === 1,
      latencyMs: typed.latency_ms == null ? null : Number(typed.latency_ms),
    };
  });
}

export function replaceDeviceState(devices: DbDeviceSnapshot[], timestamp: string): void {
  const removeMissing = db().prepare("DELETE FROM device_state WHERE device_key = ?");
  const keep = new Set(devices.map((d) => deviceKey(d.ip, d.mac)));
  const currentKeys = db().prepare("SELECT device_key FROM device_state").all().map((row: unknown) => String((row as Record<string, unknown>).device_key));
  const insertSnapshot = db().prepare(`
    INSERT INTO device_snapshots (created_at, ip, mac, name, vendor, risk_level, online, latency_ms)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const upsertState = db().prepare(`
    INSERT INTO device_state (device_key, ip, mac, name, vendor, risk_level, online, latency_ms, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(device_key) DO UPDATE SET
      ip = excluded.ip,
      mac = excluded.mac,
      name = excluded.name,
      vendor = excluded.vendor,
      risk_level = excluded.risk_level,
      online = excluded.online,
      latency_ms = excluded.latency_ms,
      updated_at = excluded.updated_at
  `);

  for (const currentKey of currentKeys) {
    if (!keep.has(currentKey)) {
      removeMissing.run(currentKey);
    }
  }
  for (const device of devices) {
    insertSnapshot.run(
      timestamp,
      device.ip,
      device.mac,
      device.name ?? null,
      device.vendor ?? null,
      device.riskLevel ?? "low",
      device.online ? 1 : 0,
      device.latencyMs ?? null,
    );
    upsertState.run(
      deviceKey(device.ip, device.mac),
      device.ip,
      device.mac,
      device.name ?? null,
      device.vendor ?? null,
      device.riskLevel ?? "low",
      device.online ? 1 : 0,
      device.latencyMs ?? null,
      timestamp,
    );
  }
}

export function insertActivityEvents(events: DbActivityEvent[]): void {
  if (events.length === 0) {
    return;
  }
  const stmt = db().prepare(`
    INSERT OR REPLACE INTO activity_events (id, created_at, event_type, device_ip, device_mac, device_label, details, severity)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const event of events) {
    stmt.run(event.id, event.timestamp, event.type, event.deviceIp, event.deviceMac, event.deviceLabel, event.details, event.severity);
  }
}

export function listActivityEvents(limit = 120): DbActivityEvent[] {
  return db().prepare(`
    SELECT id, created_at, event_type, device_ip, device_mac, device_label, details, severity
    FROM activity_events
    ORDER BY datetime(created_at) DESC
    LIMIT ?
  `).all(limit).map((row: unknown) => {
    const typed = row as Record<string, unknown>;
    return {
      id: String(typed.id),
      timestamp: String(typed.created_at),
      type: String(typed.event_type) as DbActivityEvent["type"],
      deviceIp: String(typed.device_ip),
      deviceMac: String(typed.device_mac),
      deviceLabel: String(typed.device_label),
      details: String(typed.details),
      severity: String(typed.severity) as DbActivityEvent["severity"],
    };
  });
}

export function insertTerminalAudit(entry: {
  cmd: string;
  args: string;
  ok: boolean;
  durationMs: number;
  outputPreview: string;
  timestamp: string;
}): void {
  db().prepare(`
    INSERT INTO terminal_audit (created_at, cmd, args, ok, duration_ms, output_preview)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(entry.timestamp, entry.cmd, entry.args, entry.ok ? 1 : 0, entry.durationMs, entry.outputPreview);
}

export function insertTrustSample(sample: {
  timestamp: string;
  score: number;
  badge: string;
  encryption: number;
  stability: number;
  dnsConsistency: number;
  routerBehavior: number;
}): void {
  db().prepare(`
    INSERT INTO trust_samples (created_at, score, badge, encryption, stability, dns_consistency, router_behavior)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    sample.timestamp,
    sample.score,
    sample.badge,
    sample.encryption,
    sample.stability,
    sample.dnsConsistency,
    sample.routerBehavior,
  );
}

export function readLatestTrustSample(): {
  timestamp: string;
  score: number;
  badge: string;
  encryption: number;
  stability: number;
  dnsConsistency: number;
  routerBehavior: number;
} | null {
  const row = db().prepare(`
    SELECT created_at, score, badge, encryption, stability, dns_consistency, router_behavior
    FROM trust_samples
    ORDER BY datetime(created_at) DESC
    LIMIT 1
  `).get() as Record<string, unknown> | undefined;

  if (!row) {
    return null;
  }

  return {
    timestamp: String(row.created_at),
    score: Number(row.score),
    badge: String(row.badge),
    encryption: Number(row.encryption),
    stability: Number(row.stability),
    dnsConsistency: Number(row.dns_consistency),
    routerBehavior: Number(row.router_behavior),
  };
}

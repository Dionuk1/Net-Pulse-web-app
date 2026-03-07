"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AnimatedButton from "@/components/AnimatedButton";
import Card from "@/components/Card";
import { Activity, Filter, RefreshCcw } from "lucide-react";
import { fetchActivitySnapshot, type ActivityDevice } from "@/lib/api";
import { getPollingIntervalMs } from "@/lib/settings";
import useAutoRefresh from "@/lib/useAutoRefresh";
import useSettings from "@/lib/useSettings";

type ActivityEventType = "device_added" | "device_removed" | "went_offline" | "came_online" | "latency_spike";

type ActivityEvent = {
  id: string;
  type: ActivityEventType;
  deviceLabel: string;
  details: string;
  severity: "info" | "warn" | "critical";
  timestamp: string;
};

function toDeviceKey(device: ActivityDevice): string {
  return `${device.ip}-${device.mac}`;
}

function toDeviceLabel(device: ActivityDevice): string {
  return device.name || device.ip;
}

function formatEventType(type: ActivityEventType): string {
  if (type === "device_added") return "Device Added";
  if (type === "device_removed") return "Device Removed";
  if (type === "came_online") return "Came Online";
  if (type === "went_offline") return "Went Offline";
  return "Latency Spike";
}

export default function ActivityPage() {
  const { settings } = useSettings();
  const [devices, setDevices] = useState<ActivityDevice[]>([]);
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [eventFilter, setEventFilter] = useState<"all" | ActivityEventType>("all");
  const [showOnlyOnline, setShowOnlyOnline] = useState(false);
  const inFlightRef = useRef(false);

  const refreshSnapshot = useCallback(async (showLoading: boolean) => {
    if (inFlightRef.current) {
      return;
    }

    inFlightRef.current = true;
    if (showLoading) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const payload = await fetchActivitySnapshot();
      setDevices(payload.scannedDevices);
      setEvents((payload.events ?? []).map((event) => ({
        id: event.id,
        type: event.type,
        deviceLabel: event.deviceLabel,
        details: event.details,
        severity: event.severity,
        timestamp: event.timestamp,
      })));
      setLoadError(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load activity snapshot.";
      setLoadError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
      inFlightRef.current = false;
    }
  }, []);

  useAutoRefresh(() => refreshSnapshot(false), getPollingIntervalMs(settings));

  useEffect(() => {
    void refreshSnapshot(true);
  }, [refreshSnapshot]);

  const visibleDevices = useMemo(() => {
    return devices.filter((device) => {
      if (!settings.showOfflineDevices && !device.online) return false;
      if (showOnlyOnline && !device.online) return false;
      return true;
    });
  }, [devices, settings.showOfflineDevices, showOnlyOnline]);

  const filteredEvents = useMemo(() => {
    if (eventFilter === "all") return events;
    return events.filter((event) => event.type === eventFilter);
  }, [eventFilter, events]);

  const onlineCount = devices.filter((device) => device.online).length;
  const totalCount = devices.length;
  const offlineCount = Math.max(0, totalCount - onlineCount);

  return (
    <main className="space-y-4 pb-4 md:space-y-6 md:pb-8">
      <header className="flex items-center justify-between pt-2">
        <h1 className="text-[44px] font-bold text-white sm:text-[36px]">Network Activity</h1>
        <AnimatedButton
          className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5"
          onClick={() => void refreshSnapshot(false)}
          loading={refreshing}
          disabled={refreshing}
          variant="ghost"
        >
          <RefreshCcw size={20} className="text-[color:var(--np-primary)]" />
        </AnimatedButton>
      </header>

      <section className="grid grid-cols-3 gap-3 md:max-w-2xl">
        <Card className="border-[color:var(--np-border)] bg-[color:var(--np-card)] p-4"><p className="text-[24px] text-white/50 sm:text-[18px]">Online</p><p className="text-[48px] font-bold text-[color:var(--np-accent)] sm:text-[38px]">{onlineCount}</p></Card>
        <Card className="border-[color:var(--np-border)] bg-[color:var(--np-card)] p-4"><p className="text-[24px] text-white/50 sm:text-[18px]">Offline</p><p className="text-[48px] font-bold text-[color:var(--np-warn)] sm:text-[38px]">{offlineCount}</p></Card>
        <Card className="border-[color:var(--np-border)] bg-[color:var(--np-card)] p-4"><p className="text-[24px] text-white/50 sm:text-[18px]">Total</p><p className="text-[48px] font-bold text-white sm:text-[38px]">{totalCount}</p></Card>
      </section>

      <Card className="border-[color:var(--np-border)] bg-[color:var(--np-card)] p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-white/65">
            <Filter size={16} />
            <span className="text-xs uppercase tracking-wide">Event Filter</span>
          </div>
          <select
            className="rounded-xl border border-[color:var(--np-border)] bg-[color:var(--np-surface)] px-3 py-2 text-sm text-white"
            value={eventFilter}
            onChange={(event) => setEventFilter(event.target.value as "all" | ActivityEventType)}
          >
            <option value="all">All events</option>
            <option value="device_added">Device added</option>
            <option value="device_removed">Device removed</option>
            <option value="came_online">Came online</option>
            <option value="went_offline">Went offline</option>
            <option value="latency_spike">Latency spike</option>
          </select>
          <label className="flex items-center gap-2 text-sm text-white/80">
            <input
              type="checkbox"
              checked={showOnlyOnline}
              onChange={(event) => setShowOnlyOnline(event.target.checked)}
              className="h-4 w-4 rounded border-[color:var(--np-border)] bg-[color:var(--np-surface)]"
            />
            Show only online devices
          </label>
        </div>
      </Card>

      <div className="flex items-center gap-2">
        <Activity size={22} className="text-[color:var(--np-primary)]" />
        <h2 className="text-[40px] font-semibold text-white sm:text-[32px]">Event Feed</h2>
      </div>

      <Card className="border-[color:var(--np-border)] bg-[color:var(--np-card)] p-4">
        {loading && <p className="text-sm text-white/60">Loading activity snapshot...</p>}
        {!loading && loadError && <p className="text-sm text-[color:var(--np-danger)]">{loadError}</p>}
        {!loading && !loadError && filteredEvents.length === 0 && (
          <p className="text-sm text-white/60">No events yet. Keep this page open to build live history.</p>
        )}
        {!loading && !loadError && filteredEvents.length > 0 && (
          <div className="space-y-3">
            {filteredEvents.map((event) => (
              <div key={event.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-white">{formatEventType(event.type)} - {event.deviceLabel}</p>
                  <p className={`text-xs ${event.severity === "critical" ? "text-[color:var(--np-danger)]" : event.severity === "warn" ? "text-[color:var(--np-warn)]" : "text-white/50"}`}>
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </p>
                </div>
                <p className="mt-1 text-sm text-white/70">{event.details}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <h2 className="text-[34px] font-semibold text-white sm:text-[28px]">Scanned Devices</h2>
      <Card className="border-[color:var(--np-border)] bg-[color:var(--np-card)] p-4">
        {!loading && visibleDevices.length === 0 && <p className="text-sm text-white/60">No devices match current filters.</p>}
        {visibleDevices.length > 0 && (
          <div className="space-y-2">
            {visibleDevices.map((device) => (
              <div key={toDeviceKey(device)} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                <div>
                  <p className="text-sm font-semibold text-white">{toDeviceLabel(device)}</p>
                  <p className="text-xs text-white/50">{device.ip} - {device.mac}</p>
                </div>
                <p className={`text-xs font-medium ${device.online ? "text-[color:var(--np-accent)]" : "text-white/45"}`}>
                  {device.online ? `Online${device.latencyMs != null ? ` - ${device.latencyMs}ms` : ""}` : "Offline"}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </main>
  );
}

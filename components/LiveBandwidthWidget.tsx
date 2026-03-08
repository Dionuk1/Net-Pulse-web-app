"use client";

import { useEffect, useMemo, useState } from "react";
import Card from "@/components/Card";
import { fetchLiveBandwidth, type LiveBandwidthResponse } from "@/lib/api";

type Point = {
  rx: number;
  tx: number;
};

const MAX_POINTS = 28;
const POLL_MS = 2500;

function pointsToPath(values: number[], width: number, height: number, maxValue: number): string {
  if (values.length === 0) return "";
  const stepX = values.length > 1 ? width / (values.length - 1) : width;
  return values
    .map((value, index) => {
      const x = index * stepX;
      const y = height - (value / maxValue) * height;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

export default function LiveBandwidthWidget() {
  const [points, setPoints] = useState<Point[]>([]);
  const [latest, setLatest] = useState<LiveBandwidthResponse | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tick = async () => {
      try {
        const result = await fetchLiveBandwidth();
        if (!active) return;
        setLatest(result);
        setErrorText(null);
        setPoints((current) => [...current, { rx: result.rxMbps, tx: result.txMbps }].slice(-MAX_POINTS));
      } catch (error) {
        if (!active) return;
        const message = error instanceof Error ? error.message : "Live bandwidth monitor unavailable.";
        setErrorText(message);
      } finally {
        if (active) {
          timer = setTimeout(tick, POLL_MS);
        }
      }
    };

    void tick();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, []);

  const chart = useMemo(() => {
    const width = 680;
    const height = 180;
    const rxValues = points.map((p) => p.rx);
    const txValues = points.map((p) => p.tx);
    const maxValue = Math.max(1, ...rxValues, ...txValues);

    return {
      width,
      height,
      rxPath: pointsToPath(rxValues, width, height, maxValue),
      txPath: pointsToPath(txValues, width, height, maxValue),
    };
  }, [points]);

  return (
    <Card className="border-[color:var(--np-border)] bg-[color:var(--np-card)] p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[color:var(--np-text)]">Live Bandwidth Monitor</h2>
        <span className="text-xs text-[color:var(--np-muted)]">{latest?.interfaceAlias || "Detecting adapter..."}</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
          <p className="text-xs text-emerald-300/80">Download</p>
          <p className="text-2xl font-semibold text-emerald-300">{(latest?.rxMbps ?? 0).toFixed(2)} Mbps</p>
        </div>
        <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-2">
          <p className="text-xs text-cyan-300/80">Upload</p>
          <p className="text-2xl font-semibold text-cyan-300">{(latest?.txMbps ?? 0).toFixed(2)} Mbps</p>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-white/10 bg-[color:var(--np-surface)] p-2">
        <svg viewBox={`0 0 ${chart.width} ${chart.height}`} className="h-40 w-full">
          <path d={chart.rxPath} fill="none" stroke="#34d399" strokeWidth="2.2" strokeLinecap="round" />
          <path d={chart.txPath} fill="none" stroke="#22d3ee" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      </div>

      <div className="mt-2 flex items-center gap-4 text-xs text-[color:var(--np-muted)]">
        <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />Download</span>
        <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-cyan-400" />Upload</span>
        <span>Updates every {POLL_MS / 1000}s</span>
      </div>

      {errorText && <p className="mt-2 text-xs text-[color:var(--np-danger)]">{errorText}</p>}
    </Card>
  );
}

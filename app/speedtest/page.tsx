"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Upload, Wifi } from "lucide-react";
import Card from "@/components/Card";
import GoSpeedtestButton from "@/components/GoSpeedtestButton";
import RocketOverlay from "@/components/RocketOverlay";
import { runOoklaSpeedTest, type OoklaSpeedTestResponse } from "@/lib/api";

type TestState = "idle" | "running" | "done" | "error";

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export default function SpeedtestPage() {
  const [state, setState] = useState<TestState>("idle");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<OoklaSpeedTestResponse | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [showBurst, setShowBurst] = useState(false);

  useEffect(() => {
    if (state !== "running") return;

    let raf = 0;
    let last = performance.now();

    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      setProgress((current) => {
        if (current >= 97) return 97;
        const rate = current < 30 ? 26 : current < 80 ? 14 : current < 95 ? 8 : 3.5;
        return Math.min(97, current + rate * dt);
      });

      raf = window.requestAnimationFrame(loop);
    };

    raf = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(raf);
  }, [state]);

  const phaseLabel = useMemo(() => {
    if (state === "running") {
      if (progress < 30) return "Connecting";
      if (progress < 80) return "Downloading";
      if (progress < 95) return "Uploading";
      return "Finalizing";
    }
    if (state === "done") return "Complete";
    if (state === "error") return "Error";
    return "Ready";
  }, [progress, state]);

  const startTest = async () => {
    if (state === "running") return;

    setState("running");
    setProgress(0);
    setErrorText(null);
    setShowBurst(false);

    try {
      const payload = await runOoklaSpeedTest();
      setResult(payload);
      setProgress(100);
      setState("done");
      setShowBurst(true);
      window.setTimeout(() => setShowBurst(false), 520);
    } catch (error) {
      setState("error");
      setErrorText(error instanceof Error ? error.message : "Speed test failed.");
      window.setTimeout(() => {
        setState("idle");
        setProgress(0);
      }, 1100);
      return;
    }

    window.setTimeout(() => {
      setState("idle");
      setProgress(0);
    }, 1000);
  };

  const safeProgress = clamp(progress, 0, 100);

  return (
    <main className="space-y-6 pb-8">
      <Card className="relative overflow-hidden border-[color:var(--np-border)] bg-[radial-gradient(circle_at_50%_0%,rgba(30,167,255,0.2),rgba(11,20,34,1)_58%)] p-8">
        <RocketOverlay progress={safeProgress} state={state} />

        {showBurst && (
          <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(31,213,169,0.4),rgba(31,213,169,0)_68%)] animate-ping" />
        )}

        <div className="relative z-20 mx-auto flex max-w-3xl flex-col items-center gap-6">
          <GoSpeedtestButton state={state} progress={safeProgress} phaseText={phaseLabel} onClick={() => void startTest()} />
          <p className={`text-2xl ${state === "error" ? "text-[color:var(--np-danger)]" : "text-[color:var(--np-text)]"}`}>
            {state === "error" ? errorText : `${phaseLabel}${state === "running" ? "..." : ""}`}
          </p>
          <p className="text-sm uppercase tracking-[0.2em] text-[color:var(--np-muted)]">{Math.round(safeProgress)}%</p>
        </div>
      </Card>

      {result && (
        <Card className="border-[color:var(--np-border)] bg-[color:var(--np-card)] p-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="mb-1 flex items-center gap-2 text-sm text-[color:var(--np-muted)]"><Download size={16} />Download</p>
              <p className="text-3xl font-bold text-[color:var(--np-accent)]">{result.downloadMbps.toFixed(1)}</p>
              <p className="text-sm text-[color:var(--np-muted)]">Mbps</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="mb-1 flex items-center gap-2 text-sm text-[color:var(--np-muted)]"><Upload size={16} />Upload</p>
              <p className="text-3xl font-bold text-[color:var(--np-primary-soft)]">{result.uploadMbps.toFixed(1)}</p>
              <p className="text-sm text-[color:var(--np-muted)]">Mbps</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="mb-1 flex items-center gap-2 text-sm text-[color:var(--np-muted)]"><Wifi size={16} />Ping</p>
              <p className="text-3xl font-bold text-white">{result.pingMs.toFixed(0)}</p>
              <p className="text-sm text-[color:var(--np-muted)]">ms</p>
            </div>
          </div>
        </Card>
      )}
    </main>
  );
}

"use client";

import { motion } from "framer-motion";

type GoState = "idle" | "running" | "done" | "error";

type GoSpeedtestButtonProps = {
  state: GoState;
  onClick: () => void;
  progress?: number;
  phaseText?: string;
};

function ringDuration(state: GoState): number {
  if (state === "running") return 0.75;
  if (state === "done") return 1.8;
  if (state === "error") return 0.9;
  return 1.7;
}

export default function GoSpeedtestButton({ state, onClick, progress = 0, phaseText }: GoSpeedtestButtonProps) {
  const disabled = state === "running";
  const accent = state === "error" ? "var(--np-danger)" : state === "done" ? "var(--np-accent)" : "var(--np-primary)";
  const duration = ringDuration(state);
  const safeProgress = Math.max(0, Math.min(100, progress));

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="relative h-56 w-56 rounded-full disabled:cursor-not-allowed"
      aria-label="Run Speed Test"
    >
      {(state === "idle" || state === "running") && (
        <>
          <motion.div
            className="pointer-events-none absolute inset-0 rounded-full border"
            style={{ borderColor: accent }}
            animate={{ scale: [1, 1.25, 1.5], opacity: [0.5, 0.22, 0] }}
            transition={{ duration, repeat: Number.POSITIVE_INFINITY, ease: "easeOut" }}
          />
          <motion.div
            className="pointer-events-none absolute inset-0 rounded-full border"
            style={{ borderColor: accent }}
            animate={{ scale: [1, 1.25, 1.5], opacity: [0.35, 0.18, 0] }}
            transition={{ duration, repeat: Number.POSITIVE_INFINITY, ease: "easeOut", delay: duration * 0.38 }}
          />
        </>
      )}

      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: `conic-gradient(${accent} ${Math.round((safeProgress / 100) * 360)}deg, rgba(255,255,255,0.14) 0deg)`,
          boxShadow:
            state === "running"
              ? `0 0 40px color-mix(in srgb, ${accent} 45%, transparent), inset 0 0 30px color-mix(in srgb, ${accent} 28%, transparent)`
              : `0 0 24px color-mix(in srgb, ${accent} 35%, transparent), inset 0 0 16px color-mix(in srgb, ${accent} 16%, transparent)`,
        }}
      />
      <div className="absolute inset-[2px] rounded-full bg-[radial-gradient(circle_at_50%_45%,rgba(20,35,66,1)_0%,rgba(9,17,36,1)_72%)]" />

      {state === "running" && (
        <motion.div
          className="pointer-events-none absolute inset-1 rounded-full"
          style={{
            background: `conic-gradient(from 0deg, rgba(255,255,255,0) 0deg, color-mix(in srgb, ${accent} 70%, white) 35deg, rgba(255,255,255,0) 72deg)`,
            mixBlendMode: "screen",
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 0.85, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
        />
      )}

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-5xl font-light tracking-wide text-white">
          {state === "running" ? Math.round(safeProgress) : "GO"}
        </span>
        <span className="mt-2 text-xs uppercase tracking-[0.22em] text-[color:var(--np-muted)]">
          {state === "running" ? phaseText || "Running" : state}
        </span>
      </div>
    </button>
  );
}

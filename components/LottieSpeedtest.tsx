"use client";

import { useEffect, useRef } from "react";
import Lottie, { type LottieRefCurrentProps } from "lottie-react";
import rocketAnimation from "@/public/animations/space-rocket.json";

type Phase = "idle" | "running" | "done" | "error";

type LottieSpeedtestProps = {
  progress: number;
  phase: Phase;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export default function LottieSpeedtest({ progress, phase }: LottieSpeedtestProps) {
  const lottieRef = useRef<LottieRefCurrentProps>(null);
  const clampedProgress = clamp(progress, 0, 100);
  const rocketY = phase === "running" ? 22 - clampedProgress * 0.12 : phase === "done" ? 8 : 22;

  useEffect(() => {
    const player = lottieRef.current;
    if (!player) return;

    if (phase === "running") {
      player.setDirection(1);
      player.play();
      return;
    }

    if (phase === "done") {
      player.pause();
      return;
    }

    if (phase === "error") {
      player.setSpeed(1.2);
      player.playSegments([100, 140], true);
      return;
    }

    player.goToAndStop(0, true);
  }, [phase]);

  useEffect(() => {
    const player = lottieRef.current;
    if (!player) return;
    if (phase !== "running") return;

    const speed = 0.8 + (clampedProgress / 100) * 1.6;
    player.setSpeed(speed);
  }, [clampedProgress, phase]);

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-[color:var(--np-border)] bg-[radial-gradient(circle_at_50%_20%,rgba(30,167,255,0.18),rgba(7,18,35,1)_65%)] transition-opacity duration-500 ${
        phase === "done" ? "opacity-80" : "opacity-100"
      }`}
    >
      <div
        className={`pointer-events-none absolute inset-0 transition-opacity duration-500 ${
          phase === "running" ? "opacity-100" : "opacity-50"
        }`}
        style={{
          background:
            phase === "error"
              ? "radial-gradient(circle at 50% 60%, rgba(239,102,114,0.18), transparent 62%)"
              : `radial-gradient(circle at 50% 60%, rgba(31,213,169,${0.1 + (clampedProgress / 100) * 0.2}), transparent 62%)`,
        }}
      />

      <div className="relative h-72">
        <Lottie
          lottieRef={lottieRef}
          animationData={rocketAnimation}
          autoplay={false}
          loop={phase === "running"}
          className="h-full w-full"
          rendererSettings={{ preserveAspectRatio: "xMidYMid meet" }}
        />

        <div
          className="pointer-events-none absolute left-1/2 top-1/2 z-20 transition-transform duration-300"
          style={{ transform: `translate(-50%, -50%) translateY(${rocketY}px)` }}
        >
          <svg width="220" height="170" viewBox="0 0 220 170" fill="none" aria-hidden="true">
            <defs>
              <linearGradient id="npBody" x1="64" y1="24" x2="146" y2="114" gradientUnits="userSpaceOnUse">
                <stop stopColor="#ffffff" />
                <stop offset="1" stopColor="#dbe6f5" />
              </linearGradient>
              <linearGradient id="npBlue" x1="0" y1="0" x2="1" y2="1">
                <stop stopColor="#2cc3ff" />
                <stop offset="1" stopColor="#0c73da" />
              </linearGradient>
              <radialGradient id="npWindow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(122 72) rotate(90) scale(16)">
                <stop stopColor="#72e0ff" />
                <stop offset="1" stopColor="#1b9ce6" />
              </radialGradient>
              <radialGradient id="npFlame" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(56 108) rotate(145) scale(44 20)">
                <stop stopColor="#fff5b0" />
                <stop offset="0.45" stopColor="#ff9f4d" />
                <stop offset="1" stopColor="#ff5b2f" stopOpacity="0" />
              </radialGradient>
              <filter id="npShadow" x="0" y="0" width="220" height="170" colorInterpolationFilters="sRGB">
                <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#000000" floodOpacity="0.35" />
              </filter>
            </defs>

            <g transform="rotate(-32 112 88)" filter="url(#npShadow)">
              {(phase === "running" || phase === "done") && (
                <ellipse
                  cx="53"
                  cy="108"
                  rx={phase === "running" ? 46 : 60}
                  ry={phase === "running" ? 20 : 26}
                  fill="url(#npFlame)"
                  opacity={phase === "running" ? 0.95 : 1}
                />
              )}

              <path d="M76 58C102 40 140 42 160 62L126 118C102 118 84 105 72 86C67 77 69 65 76 58Z" fill="url(#npBody)" />
              <path d="M157 59L180 58C181 65 176 77 164 87L157 59Z" fill="url(#npBlue)" />
              <path d="M100 117L85 136C73 126 66 112 65 98L100 117Z" fill="url(#npBlue)" />
              <path d="M88 56L63 48C71 37 84 30 98 32L88 56Z" fill="url(#npBlue)" />
              <rect x="72" y="92" width="44" height="8" rx="4" fill="url(#npBlue)" />
              <circle cx="121" cy="73" r="16" fill="#222f43" />
              <circle cx="121" cy="73" r="12" fill="url(#npWindow)" />
              <circle cx="121" cy="73" r="14.5" stroke="#6f7f94" strokeWidth="2" />
            </g>
          </svg>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-4 bottom-4">
        <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.14em] text-white/70">
          <span>{phase}</span>
          <span>{Math.round(clamp(progress, 0, 100))}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className={`h-full transition-all duration-200 ${
              phase === "error" ? "bg-[color:var(--np-danger)]" : "bg-[color:var(--np-primary)]"
            }`}
            style={{ width: `${clamp(progress, 0, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

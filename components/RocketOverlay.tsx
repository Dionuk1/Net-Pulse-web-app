"use client";

type RocketState = "idle" | "running" | "done" | "error";

type RocketOverlayProps = {
  progress: number;
  state: RocketState;
};

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export default function RocketOverlay({ progress, state }: RocketOverlayProps) {
  const p = clamp(progress, 0, 100);
  const active = state === "running";
  const done = state === "done";

  let x = -16;
  let y = 92;
  let scale = 0.86;
  let rotate = -30;
  let opacity = state === "idle" ? 0.4 : 1;

  if (active) {
    if (p <= 75) {
      const t = p / 75;
      x = -16 + t * 86;
      y = 92 - t * 48;
      scale = 0.86 + t * 0.25;
      rotate = -30 + t * 18;
    } else {
      const t = (p - 75) / 25;
      x = 70 + t * 18;
      y = 44 - t * 95;
      scale = 1.11 + t * 0.22;
      rotate = -12 + t * 22;
    }
  }

  if (done) {
    x = 88;
    y = -64;
    scale = 1.35;
    rotate = 18;
    opacity = 0;
  }

  const speedFactor = active ? 0.7 - (p / 100) * 0.35 : 0.95;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute left-0 top-0 h-full w-full transition-[background-color] duration-300"
        style={{ backgroundColor: state === "error" ? "rgba(239,102,114,0.08)" : "transparent" }}
      />

      <div
        className="absolute left-0 top-0 transition-[transform,opacity] duration-200 ease-out"
        style={{
          transform: `translate(${x}%, ${y}%) rotate(${rotate}deg) scale(${scale})`,
          opacity,
        }}
      >
        <svg width="190" height="130" viewBox="0 0 190 130" fill="none" aria-hidden="true">
          <defs>
            <linearGradient id="npRocketBody2" x1="70" y1="24" x2="146" y2="102" gradientUnits="userSpaceOnUse">
              <stop stopColor="#F8FBFF" />
              <stop offset="0.55" stopColor="#E8EEF7" />
              <stop offset="1" stopColor="#C8D4E4" />
            </linearGradient>
            <linearGradient id="npRocketFin2" x1="58" y1="37" x2="160" y2="111" gradientUnits="userSpaceOnUse">
              <stop stopColor="#56CAFF" />
              <stop offset="1" stopColor="#1E7FD8" />
            </linearGradient>
            <radialGradient id="npRocketWindow2" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(108 61) rotate(90) scale(13)">
              <stop stopColor="#8EEBFF" />
              <stop offset="1" stopColor="#279EE2" />
            </radialGradient>
            <linearGradient id="npRocketStripe2" x1="64" y1="87" x2="102" y2="87" gradientUnits="userSpaceOnUse">
              <stop stopColor="#2DAAF0" />
              <stop offset="1" stopColor="#1A7BCD" />
            </linearGradient>
          </defs>

          <path d="M70 52C92 36 124 38 145 56L118 101C96 102 78 90 67 72C63 65 64 57 70 52Z" fill="url(#npRocketBody2)" />
          <path d="M142 55L162 54C161 62 155 73 144 82L142 55Z" fill="url(#npRocketFin2)" />
          <path d="M91 101L77 119C66 112 59 101 58 89L91 101Z" fill="url(#npRocketFin2)" />
          <path d="M82 50L60 43C67 33 79 26 91 29L82 50Z" fill="url(#npRocketFin2)" />
          <rect x="64" y="82" width="40" height="7" rx="3.5" fill="url(#npRocketStripe2)" />
          <circle cx="108" cy="61" r="14.5" fill="#293545" />
          <circle cx="108" cy="61" r="11.2" fill="url(#npRocketWindow2)" />
          <circle cx="108" cy="61" r="13.4" stroke="#7E8D9F" strokeWidth="1.8" />
          <path d="M73 59C83 49 101 43 120 45" stroke="rgba(255,255,255,0.35)" strokeWidth="1.8" strokeLinecap="round" />
        </svg>

        {(active || done) && (
          <div className="absolute left-[30px] top-[56px] -z-10">
            <div
              className="rounded-full bg-[radial-gradient(circle,rgba(255,243,173,0.9)_0%,rgba(255,162,82,0.72)_40%,rgba(255,93,52,0)_100%)] blur-[2px]"
              style={{
                width: done ? 72 : 52 + p * 0.28,
                height: done ? 30 : 20 + p * 0.12,
                transform: "translateX(-62%)",
                opacity: done ? 0.72 : 0.78,
              }}
            />
          </div>
        )}

        {(active || done) && (
          <>
            <span className="np-spark absolute left-[18px] top-[54px] h-1.5 w-1.5 rounded-full bg-orange-300" style={{ animationDuration: `${speedFactor}s` }} />
            <span className="np-spark absolute left-[22px] top-[66px] h-1 w-1 rounded-full bg-orange-400" style={{ animationDuration: `${speedFactor * 1.2}s` }} />
            <span className="np-spark absolute left-[26px] top-[59px] h-1.5 w-1.5 rounded-full bg-amber-300" style={{ animationDuration: `${speedFactor * 0.85}s` }} />
          </>
        )}
      </div>

      <style jsx>{`
        .np-spark {
          opacity: 0;
          animation-name: npSparkFly;
          animation-timing-function: ease-out;
          animation-iteration-count: infinite;
        }
        @keyframes npSparkFly {
          0% {
            transform: translate(0, 0) scale(1);
            opacity: 0.95;
          }
          100% {
            transform: translate(-26px, 12px) scale(0.3);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

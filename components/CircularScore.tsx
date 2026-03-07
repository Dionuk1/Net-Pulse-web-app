type CircularScoreProps = {
  score: number;
  color?: "green" | "purple";
};

export default function CircularScore({ score, color = "green" }: CircularScoreProps) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, score));
  const dashOffset = circumference - (clamped / 100) * circumference;
  const strokeColor = color === "green" ? "var(--np-accent)" : "var(--np-primary)";

  return (
    <div className="flex items-center justify-center">
      <div className="relative h-40 w-40">
        <svg className="h-40 w-40 -rotate-90" viewBox="0 0 132 132" fill="none">
          <circle cx="66" cy="66" r={radius} stroke="var(--np-surface)" strokeWidth="8" />
          <circle
            cx="66"
            cy="66"
            r={radius}
            stroke={strokeColor}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className="transition-all"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-6xl font-semibold leading-none text-[color:var(--np-accent)]">{clamped}</span>
        </div>
      </div>
    </div>
  );
}

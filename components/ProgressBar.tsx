type ProgressBarProps = {
  value: number;
  max?: number;
  color?: "green" | "purple";
  showLabel?: boolean;
};

export default function ProgressBar({ value, max = 100, color = "green", showLabel = true }: ProgressBarProps) {
  const percentage = Math.max(0, Math.min(100, (value / max) * 100));
  const fillClass = color === "green" ? "bg-[color:var(--np-accent)]" : "bg-[color:var(--np-primary)]";

  return (
    <div className="w-full">
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-[color:var(--np-surface)]">
        <div className={`h-full rounded-full ${fillClass} transition-all`} style={{ width: `${percentage}%` }} />
      </div>
      {showLabel && <p className="mt-1 text-right text-[11px] text-[color:var(--np-accent)]">{Math.round(percentage)}%</p>}
    </div>
  );
}

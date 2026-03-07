import type { NetworkInfo } from "@/lib/windowsNetwork";
import type { DbDeviceSnapshot } from "@/lib/server/db";

export type TrustScoreV2 = {
  score: number;
  badge: string;
  encryption: number;
  stability: number;
  dnsConsistency: number;
  routerBehavior: number;
  recommendation: string;
};

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export function computeTrustScoreV2(args: {
  networkInfo: NetworkInfo | null;
  devices: DbDeviceSnapshot[];
  previous?: TrustScoreV2 | null;
}): TrustScoreV2 {
  const onlineDevices = args.devices.filter((device) => device.online).length;
  const highRiskDevices = args.devices.filter((device) => device.riskLevel === "high").length;
  const mediumRiskDevices = args.devices.filter((device) => device.riskLevel === "medium").length;
  const baseNoise = randomBetween(-2.5, 2.5);

  const hasDns = (args.networkInfo?.dnsServers.length ?? 0) > 0;
  const gatewayLooksLocal = args.networkInfo?.gateway?.startsWith("192.168.") || args.networkInfo?.gateway?.startsWith("10.") || false;

  const encryption = clamp(92 + randomBetween(-4, 4) - highRiskDevices * 2);
  const stability = clamp(88 + randomBetween(-7, 5) - mediumRiskDevices * 1.5 - highRiskDevices * 3);
  const dnsConsistency = clamp((hasDns ? 90 : 75) + randomBetween(-4, 4));
  const routerBehavior = clamp((gatewayLooksLocal ? 89 : 76) + randomBetween(-5, 5) - Math.max(0, onlineDevices - 12) * 1.5);

  const computedScore = clamp((encryption * 0.32) + (stability * 0.28) + (dnsConsistency * 0.2) + (routerBehavior * 0.2) + baseNoise);
  const score = args.previous ? clamp((args.previous.score * 0.45) + (computedScore * 0.55)) : computedScore;

  const badge =
    score >= 90 ? "Excellent" :
    score >= 80 ? "Good" :
    score >= 70 ? "Fair" :
    "Risky";

  const recommendation =
    highRiskDevices > 0
      ? "High-latency devices detected. Check Wi-Fi channel usage and router placement."
      : score >= 90
        ? "Security posture looks strong. Keep firmware updates enabled."
        : "Review router DNS settings and monitor unstable devices.";

  return {
    score,
    badge,
    encryption,
    stability,
    dnsConsistency,
    routerBehavior,
    recommendation,
  };
}

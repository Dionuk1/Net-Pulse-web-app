import type { ScannedDevice } from "@/lib/windowsNetwork";

type RiskLevel = "low" | "medium" | "high";

export type EnrichedDevice = ScannedDevice & {
  name?: string;
  vendor: string;
  riskLevel: RiskLevel;
  riskReason: string;
};

const ouiVendorHints: Array<{ prefix: string; vendor: string }> = [
  { prefix: "00:50:56", vendor: "VMware" },
  { prefix: "08:00:27", vendor: "Oracle VirtualBox" },
  { prefix: "52:54:00", vendor: "QEMU/KVM" },
  { prefix: "3C:84:6A", vendor: "Ubiquiti" },
  { prefix: "F4:F2:6D", vendor: "TP-Link" },
  { prefix: "FC:FB:FB", vendor: "Google/Nest" },
];

function detectVendor(mac: string): string {
  const upper = mac.toUpperCase();
  for (const hint of ouiVendorHints) {
    if (upper.startsWith(hint.prefix)) {
      return hint.vendor;
    }
  }
  return "Unknown";
}

function classifyRisk(device: ScannedDevice): { riskLevel: RiskLevel; riskReason: string } {
  if (!device.online) {
    return { riskLevel: "low", riskReason: "Device is currently offline." };
  }
  if (device.latencyMs != null && device.latencyMs >= 140) {
    return { riskLevel: "high", riskReason: "High latency could indicate congestion or unstable route." };
  }
  if (device.latencyMs != null && device.latencyMs >= 85) {
    return { riskLevel: "medium", riskReason: "Elevated latency observed on local network." };
  }
  return { riskLevel: "low", riskReason: "Latency and reachability look normal." };
}

export function enrichDevices(devices: ScannedDevice[], namesByIp: Map<string, string>): EnrichedDevice[] {
  return devices.map((device) => {
    const risk = classifyRisk(device);
    return {
      ...device,
      name: namesByIp.get(device.ip),
      vendor: detectVendor(device.mac),
      riskLevel: risk.riskLevel,
      riskReason: risk.riskReason,
    };
  });
}

const OUI_PREFIX_VENDOR: Record<string, string> = {
  "00:50:56": "VMware",
  "08:00:27": "Oracle VirtualBox",
  "52:54:00": "QEMU/KVM",
  "3C:84:6A": "Ubiquiti",
  "F4:F2:6D": "TP-Link",
  "FC:FB:FB": "Google/Nest",
  "B8:27:EB": "Raspberry Pi",
  "D8:BB:C1": "Apple",
  "DC:A6:32": "Apple",
  "FC:34:97": "Cisco",
};

function normalizeMac(mac: string): string {
  return mac.replace(/-/g, ":").toUpperCase();
}

export function lookupVendorByMac(mac: string): string {
  const normalized = normalizeMac(mac);
  const prefix = normalized.slice(0, 8);
  return OUI_PREFIX_VENDOR[prefix] || "Unknown Vendor";
}

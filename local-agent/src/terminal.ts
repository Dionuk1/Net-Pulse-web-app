import { runCommand } from "./utils.js";
import { isHostname, isIPv4Address } from "./utils.js";

export type AllowedTerminalCommand = "ping" | "tracert" | "ipconfig" | "netstat" | "arp" | "nslookup";

export type TerminalRunInput = {
  cmd: AllowedTerminalCommand;
  args: string;
};

const ALLOWED_COMMANDS: AllowedTerminalCommand[] = ["ping", "tracert", "ipconfig", "netstat", "arp", "nslookup"];

function hasUnsafeCharacters(input: string): boolean {
  return /[;&|`$<>]/.test(input);
}

function parseSingleTarget(rawArgs: string): string | null {
  const tokens = rawArgs.trim().split(/\s+/).filter(Boolean);
  if (tokens.length !== 1) return null;
  const target = tokens[0];
  if (isIPv4Address(target) || isHostname(target)) {
    return target;
  }
  return null;
}

export function parseTerminalInput(body: Record<string, unknown>): TerminalRunInput {
  const cmdRaw = typeof body.cmd === "string" ? body.cmd.trim().toLowerCase() : "";
  const args = typeof body.args === "string" ? body.args.trim() : "";

  if (!ALLOWED_COMMANDS.includes(cmdRaw as AllowedTerminalCommand)) {
    throw new Error("Command not allowed.");
  }
  if (hasUnsafeCharacters(args)) {
    throw new Error("Unsafe characters in args.");
  }

  return {
    cmd: cmdRaw as AllowedTerminalCommand,
    args,
  };
}

export function resolveTerminalCommand(input: TerminalRunInput): { file: string; args: string[] } {
  const { cmd, args } = input;

  if (cmd === "ipconfig") {
    if (args.length > 0) throw new Error("ipconfig does not accept custom args.");
    return { file: "ipconfig", args: ["/all"] };
  }

  if (cmd === "netstat") {
    if (args.length > 0) throw new Error("netstat does not accept custom args.");
    return { file: "netstat", args: ["-ano"] };
  }

  if (cmd === "arp") {
    if (args.length > 0) throw new Error("arp does not accept custom args.");
    return { file: "arp", args: ["-a"] };
  }

  const target = parseSingleTarget(args);
  if (!target) {
    throw new Error("Use exactly one target (IPv4 or hostname).");
  }

  if (cmd === "ping") {
    return { file: "ping", args: ["-n", "4", "-w", "1000", target] };
  }
  if (cmd === "tracert") {
    return { file: "tracert", args: ["-d", "-h", "10", target] };
  }
  return { file: "nslookup", args: [target] };
}

export async function runTerminalCommand(input: TerminalRunInput): Promise<{ ok: boolean; output: string }> {
  const resolved = resolveTerminalCommand(input);
  return runCommand(resolved.file, resolved.args, 10000);
}

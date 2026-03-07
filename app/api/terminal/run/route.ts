import { NextRequest, NextResponse } from "next/server";
import { agentPost } from "@/lib/agentProxy";

type CommandPayload = {
  cmd?: unknown;
  args?: unknown;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CommandPayload;
    const cmd = typeof body.cmd === "string" ? body.cmd : "";
    const args = typeof body.args === "string" ? body.args : "";
    const result = await agentPost<{ ok: boolean; output: string }>("/terminal/run", { cmd, args });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Terminal command failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

const AGENT_URL = process.env.NETPULSE_AGENT_URL || "http://127.0.0.1:5055";
const AGENT_TOKEN = process.env.NETPULSE_TOKEN || "change-me-local-token";

export async function agentGet<T>(path: string): Promise<T> {
  const response = await fetch(`${AGENT_URL}${path}`, {
    method: "GET",
    headers: {
      "X-NETPULSE-TOKEN": AGENT_TOKEN,
    },
    cache: "no-store",
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : { error: await response.text() };

  if (!response.ok) {
    const message = payload && typeof payload.error === "string" ? payload.error : `Agent request failed: ${response.status}`;
    throw new Error(message);
  }

  return payload as T;
}

export async function agentPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${AGENT_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-NETPULSE-TOKEN": AGENT_TOKEN,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : { error: await response.text() };

  if (!response.ok) {
    const message = payload && typeof payload.error === "string" ? payload.error : `Agent request failed: ${response.status}`;
    throw new Error(message);
  }

  return payload as T;
}

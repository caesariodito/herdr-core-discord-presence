import { execFile } from "node:child_process";

const statuses = new Set(["working", "idle", "done", "blocked", "error"]);
export interface Counts { total: number; working: number }

export function countAgents(value: unknown): Counts {
  if (!value || typeof value !== "object" || !Array.isArray((value as Record<string, unknown>).terminals))
    throw new Error("invalid hc terminal list");
  let total = 0, working = 0;
  for (const row of (value as { terminals: unknown[] }).terminals) {
    if (!row || typeof row !== "object") throw new Error("invalid hc terminal");
    const t = row as Record<string, unknown>;
    if (typeof t.address !== "string" || !/^(?:[^/]+\/)?t[a-z0-9]+$/.test(t.address) ||
        !["live", "finished"].includes(String(t.state))) throw new Error("invalid hc terminal identity");
    if (t.address.includes("/") || t.state !== "live") continue;
    if (t.status == null) continue;
    if (typeof t.status !== "string" || !statuses.has(t.status)) throw new Error("invalid hc status");
    total++;
    if (t.status === "working") working++;
  }
  return { total, working };
}

export async function fetchCounts(): Promise<Counts> {
  const stdout = await new Promise<string>((resolve, reject) => {
    execFile(process.env.HC_BIN ?? "hc", ["ls", "--json"],
      { encoding: "utf8", timeout: 10_000, maxBuffer: 16 * 1024 * 1024 },
      (error, stdout) => error ? reject(new Error("hc list failed")) : resolve(stdout));
  });
  return countAgents(JSON.parse(stdout));
}

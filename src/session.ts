import { setTimeout as sleep } from "node:timers/promises";
import type { Counts } from "./herdr.js";
import { Publisher, type ActivitySink } from "./presence.js";

export async function bounded<T>(request: Promise<T>, ms = 2_000): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([request, new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("RPC timeout")), ms);
    })]);
  } finally { clearTimeout(timer); }
}

export interface RpcClient {
  user?: ActivitySink;
  once(event: "disconnected", listener: () => void): unknown;
  login(): Promise<unknown>;
  destroy(): Promise<unknown>;
}

export async function runPresence(
  createClient: () => RpcClient,
  fetchCounts: () => Promise<Counts>,
  signal: AbortSignal,
  pause = (ms: number) => sleep(ms, undefined, { signal }).catch(() => {}),
): Promise<void> {
  const startTimestamp = Date.now();
  while (!signal.aborted) {
    const client = createClient();
    let disconnected = false;
    client.once("disconnected", () => { disconnected = true; });
    try {
      await bounded(client.login(), 10_000);
      if (!client.user) throw new Error("Discord user unavailable");
      console.log("presence connected");
      const user = client.user;
      let acknowledged = false;
      const publisher = new Publisher({
        setActivity: activity => bounded(user.setActivity(activity)),
        clearActivity: () => bounded(user.clearActivity()),
      }, startTimestamp);
      while (!signal.aborted && !disconnected) {
        let counts = null;
        try { counts = await fetchCounts(); }
        catch { console.error("core unavailable or invalid; clearing presence"); }
        if (signal.aborted || disconnected) break;
        await publisher.update(counts, Date.now());
        if (!acknowledged) {
          console.log("presence activity acknowledged");
          acknowledged = true;
        }
        await pause(5_000);
      }
    } catch {
      if (!signal.aborted) console.error("presence connection failed; retrying");
    } finally {
      // Disconnected IPC silently drops new requests; never await an unbounded clear.
      if (!disconnected) await bounded(client.user?.clearActivity() ?? Promise.resolve()).catch(() => {});
      await bounded(client.destroy()).catch(() => {});
    }
    if (!signal.aborted) await pause(10_000);
  }
}

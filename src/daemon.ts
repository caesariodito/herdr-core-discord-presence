import { Client, type SetActivity } from "@xhayper/discord-rpc";
import { loadConfig, type Config } from "./config.js";
import { fetchSnapshot } from "./herdr.js";
import { acquireLock, releaseLock } from "./lock.js";
import { buildActivity } from "./presence.js";

const RECONNECT_MS = 10_000;
const MIN_UPDATE_INTERVAL_MS = 15_000;

async function main(): Promise<void> {
  if (!acquireLock()) {
    console.log("another presence daemon is already running; exiting");
    return;
  }

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  const config = loadConfig();
  if (!config) {
    console.error(
      "DISCORD_CLIENT_ID is not set. Edit the .env file printed by " +
        "`herdr plugin config-dir herdr-discord-presence`, then start again."
    );
    releaseLock();
    process.exit(1);
  }

  console.log(`daemon started (pid ${process.pid})`);

  let herdrUpSince: number | null = null;
  let lastKey = "";
  let lastSentAt = 0;

  for (;;) {
    const client = new Client({ clientId: config.clientId });
    let connected = false;
    try {
      await client.login();
      connected = true;
      console.log("connected to Discord RPC");

      const disconnected = new Promise<void>((resolve) =>
        client.once("disconnected", () => resolve())
      );

      for (;;) {
        let activity: SetActivity | null = null;
        try {
          const snapshot = await fetchSnapshot();
          herdrUpSince ??= Date.now();
          activity = buildActivity(snapshot, config, herdrUpSince);
        } catch {
          if (herdrUpSince !== null) {
            herdrUpSince = null;
            lastKey = "";
            await client.user?.clearActivity().catch(() => {});
            console.log("herdr server unreachable; cleared presence");
          }
          if (await raceSleep(config.pollSeconds * 1000, disconnected)) break;
          continue;
        }

        const key = JSON.stringify(activity);
        const now = Date.now();
        if (key !== lastKey && now - lastSentAt >= MIN_UPDATE_INTERVAL_MS) {
          try {
            if (activity) await client.user?.setActivity(activity);
            else await client.user?.clearActivity();
            lastKey = key;
            lastSentAt = now;
          } catch (err) {
            console.log(
              `setActivity failed: ${err instanceof Error ? err.message : String(err)}`
            );
          }
        }

        if (await raceSleep(config.pollSeconds * 1000, disconnected)) break;
      }
    } catch (err) {
      console.log(
        `Discord RPC not reachable: ${err instanceof Error ? err.message : String(err)}`
      );
    } finally {
      if (connected) await client.destroy().catch(() => {});
    }
    await sleep(RECONNECT_MS);
  }
}

function shutdown(): void {
  releaseLock();
  process.exit(0);
}

async function raceSleep(ms: number, signal: Promise<void>): Promise<boolean> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<"timeout">((resolve) => {
    timer = setTimeout(() => resolve("timeout"), ms);
  });
  const winner = await Promise.race([
    timeout,
    signal.then(() => "signal" as const),
  ]);
  if (timer) clearTimeout(timer);
  return winner === "signal";
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((err) => {
  console.error(err);
  releaseLock();
  process.exit(1);
});

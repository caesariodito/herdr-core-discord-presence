import { Client } from "@xhayper/discord-rpc";
import { clientId } from "./config.js";
import { fetchCounts } from "./herdr.js";
import { runPresence } from "./session.js";

async function main(): Promise<void> {
  if (process.argv.includes("--dry-run")) {
    const counts = await fetchCounts();
    console.log(JSON.stringify(counts));
    return;
  }
  const id = clientId();
  const abort = new AbortController();
  const stop = () => abort.abort();
  process.once("SIGTERM", stop);
  process.once("SIGINT", stop);
  await runPresence(() => new Client({ clientId: id }), fetchCounts, abort.signal);
}
main().catch(() => { console.error("presence failed; check hc and DISCORD_CLIENT_ID"); process.exitCode = 1; });

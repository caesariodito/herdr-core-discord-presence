import fs from "node:fs";
import path from "node:path";
import { loadConfig } from "./config.js";
import { liveDaemonPid } from "./lock.js";
import { pluginConfigDir, pluginStateDir } from "./paths.js";

const pid = liveDaemonPid();
const config = loadConfig();

console.log(pid !== null ? `daemon: running (pid ${pid})` : "daemon: stopped");
console.log(
  config
    ? `config: DISCORD_CLIENT_ID set (${config.clientId.slice(0, 6)}…)`
    : "config: DISCORD_CLIENT_ID missing"
);
console.log(`config dir: ${pluginConfigDir()}`);
console.log(`state dir:  ${pluginStateDir()}`);

const logFile = path.join(pluginStateDir(), "daemon.log");
if (fs.existsSync(logFile)) {
  const lines = fs.readFileSync(logFile, "utf8").trim().split("\n");
  console.log("\nlast log lines:");
  for (const line of lines.slice(-5)) console.log(`  ${line}`);
}

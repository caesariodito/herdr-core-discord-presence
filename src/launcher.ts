import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { liveDaemonPid } from "./lock.js";
import { pluginStateDir } from "./paths.js";

const here = path.dirname(fileURLToPath(import.meta.url));

const existing = liveDaemonPid();
if (existing !== null) {
  console.log(`discord presence daemon already running (pid ${existing})`);
  process.exit(0);
}

const stateDir = pluginStateDir();
fs.mkdirSync(stateDir, { recursive: true });
const logFd = fs.openSync(path.join(stateDir, "daemon.log"), "a");

const child = spawn(process.execPath, [path.join(here, "daemon.js")], {
  detached: true,
  stdio: ["ignore", logFd, logFd],
  env: process.env,
});
child.unref();
fs.closeSync(logFd);

console.log(`discord presence daemon launched (pid ${child.pid ?? "?"})`);

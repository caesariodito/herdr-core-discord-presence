import fs from "node:fs";
import path from "node:path";
import { pluginStateDir } from "./paths.js";

export function pidFilePath(): string {
  return path.join(pluginStateDir(), "daemon.pid");
}

export function readPid(): number | null {
  try {
    const raw = fs.readFileSync(pidFilePath(), "utf8").trim();
    const pid = Number.parseInt(raw, 10);
    return Number.isFinite(pid) && pid > 0 ? pid : null;
  } catch {
    return null;
  }
}

export function isRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return (err as NodeJS.ErrnoException).code === "EPERM";
  }
}

export function liveDaemonPid(): number | null {
  const pid = readPid();
  return pid !== null && isRunning(pid) ? pid : null;
}

export function acquireLock(): boolean {
  const existing = liveDaemonPid();
  if (existing !== null && existing !== process.pid) return false;
  fs.mkdirSync(pluginStateDir(), { recursive: true });
  fs.writeFileSync(pidFilePath(), String(process.pid));
  return true;
}

export function releaseLock(): void {
  const pid = readPid();
  if (pid === process.pid) {
    try {
      fs.unlinkSync(pidFilePath());
    } catch {
      // already gone
    }
  }
}

export function stopDaemon(): number | null {
  const pid = liveDaemonPid();
  if (pid === null) return null;
  try {
    process.kill(pid, "SIGTERM");
  } catch {
    // already gone
  }
  return pid;
}

import { stopDaemon } from "./lock.js";

const pid = stopDaemon();
if (pid === null) {
  console.log("discord presence daemon is not running");
} else {
  console.log(`discord presence daemon stopped (pid ${pid})`);
}

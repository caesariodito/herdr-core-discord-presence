import os from "node:os";
import path from "node:path";

export function pluginConfigDir(): string {
  return (
    process.env.HERDR_PLUGIN_CONFIG_DIR ??
    path.join(os.homedir(), ".config", "herdr", "herdr-discord-presence")
  );
}

export function pluginStateDir(): string {
  return (
    process.env.HERDR_PLUGIN_STATE_DIR ??
    path.join(os.homedir(), ".config", "herdr", "herdr-discord-presence", "state")
  );
}

export function herdrBin(): string {
  return process.env.HERDR_BIN_PATH ?? "herdr";
}

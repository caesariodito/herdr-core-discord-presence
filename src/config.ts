import fs from "node:fs";
import path from "node:path";
import { pluginConfigDir } from "./paths.js";

export interface Config {
  clientId: string;
  pollSeconds: number;
  largeImageKey: string;
  largeImageUrl: string;
  largeImageText: string;
  buttonLabel: string;
  buttonUrl: string;
}

const TEMPLATE = `# Discord application client ID (required).
# Create an app at https://discord.com/developers/applications and paste its
# Application ID here. The app name is what shows as "Playing <name>".
DISCORD_CLIENT_ID=

# Optional overrides
# POLL_SECONDS=5
# Uploaded asset key (Rich Presence > Art Assets in the dev portal).
# Takes priority over LARGE_IMAGE_URL when set.
# LARGE_IMAGE_KEY=herdr
# LARGE_IMAGE_URL=https://github.com/herdrdev.png
# LARGE_IMAGE_TEXT=Herdr
# BUTTON_LABEL=Herdr
# BUTTON_URL=https://herdr.dev
`;

export function loadConfig(): Config | null {
  const dir = pluginConfigDir();
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, ".env");
  if (!fs.existsSync(file)) fs.writeFileSync(file, TEMPLATE);

  const values = new Map<string, string>();
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    values.set(trimmed.slice(0, eq).trim(), trimmed.slice(eq + 1).trim());
  }

  const clientId = values.get("DISCORD_CLIENT_ID") ?? "";
  if (!clientId) return null;

  return {
    clientId,
    pollSeconds: clampInt(values.get("POLL_SECONDS"), 2, 60, 5),
    largeImageKey: values.get("LARGE_IMAGE_KEY") ?? "",
    largeImageUrl:
      values.get("LARGE_IMAGE_URL") ?? "https://github.com/herdrdev.png",
    largeImageText: values.get("LARGE_IMAGE_TEXT") ?? "Herdr",
    buttonLabel: values.get("BUTTON_LABEL") ?? "Herdr",
    buttonUrl: values.get("BUTTON_URL") ?? "https://herdr.dev",
  };
}

function clampInt(
  raw: string | undefined,
  min: number,
  max: number,
  fallback: number
): number {
  const n = Number.parseInt(raw ?? "", 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

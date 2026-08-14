import type { SetActivity } from "@xhayper/discord-rpc";
import type { HerdrSnapshot, HerdrAgent } from "./herdr.js";
import type { Config } from "./config.js";

export function buildActivity(
  snapshot: HerdrSnapshot,
  config: Config,
  startTimestamp: number
): SetActivity | null {
  const agents = snapshot.agents ?? [];

  let project: string;
  let state: string;

  if (agents.length === 0) {
    project = "Herdr";
    const n = snapshot.workspaces?.length ?? 0;
    state = n > 0 ? `running · ${n} workspaces` : "running";
  } else {
    const working = agents.filter((a) => a.agent_status === "working").length;
    const total = agents.length;
    const focused =
      agents.find((a) => a.focused) ??
      agents.find((a) => a.agent_status === "working") ??
      agents[0];
    project = projectName(snapshot, focused);
    state = buildState(agents, focused, working, total);
  }

  const activity: SetActivity = {
    details: clip(project, 128),
    state: clip(state, 128),
    startTimestamp,
    instance: false,
  };

  if (config.largeImageKey) {
    activity.largeImageKey = config.largeImageKey;
  } else if (config.largeImageUrl) {
    activity.largeImageUrl = config.largeImageUrl;
  }
  if ((activity.largeImageKey || activity.largeImageUrl) && config.largeImageText)
    activity.largeImageText = clip(config.largeImageText, 128);

  if (config.buttonLabel && config.buttonUrl) {
    activity.buttons = [
      { label: clip(config.buttonLabel, 32), url: config.buttonUrl },
    ];
  }

  return activity;
}

function projectName(snapshot: HerdrSnapshot, agent: HerdrAgent): string {
  if (agent.workspace_id) {
    const ws = snapshot.workspaces.find(
      (w) => w.workspace_id === agent.workspace_id
    );
    if (ws?.label && ws.label !== "~") return ws.label;
  }
  if (agent.cwd) {
    const base = agent.cwd.split("/").filter(Boolean).pop();
    if (base) return base;
  }
  return "Herdr";
}

function buildState(
  agents: HerdrAgent[],
  focused: HerdrAgent,
  working: number,
  total: number
): string {
  const status = humanStatus(focused.agent_status);
  const name = focused.agent || "agent";
  if (total === 1) return `${name} · ${status}`;
  return `${name} · ${status} · ${working}/${total} working`;
}

function humanStatus(status: string): string {
  switch (status) {
    case "working":
      return "working";
    case "blocked":
      return "blocked";
    case "done":
      return "done";
    case "idle":
      return "idle";
    default:
      return "running";
  }
}

function clip(text: string, max: number): string {
  return text.length > max ? text.slice(0, max - 1) + "…" : text;
}

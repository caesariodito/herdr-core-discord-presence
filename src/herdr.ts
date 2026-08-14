import { execFile } from "node:child_process";
import { herdrBin } from "./paths.js";

export type AgentStatus =
  | "working"
  | "idle"
  | "blocked"
  | "done"
  | "unknown"
  | string;

export interface HerdrAgent {
  agent: string;
  agent_status: AgentStatus;
  cwd?: string;
  focused?: boolean;
  terminal_title_stripped?: string;
  workspace_id?: string;
  pane_id?: string;
}

export interface HerdrWorkspace {
  workspace_id: string;
  label?: string;
  agent_status?: AgentStatus;
  focused?: boolean;
}

export interface HerdrSnapshot {
  agents: HerdrAgent[];
  workspaces: HerdrWorkspace[];
  focused_workspace_id?: string;
  focused_pane_id?: string;
}

export async function fetchSnapshot(): Promise<HerdrSnapshot> {
  const bin = herdrBin();
  const stdout = await run(bin, ["api", "snapshot"]);
  const parsed = JSON.parse(stdout) as {
    result?: { snapshot?: HerdrSnapshot };
  };
  const snapshot = parsed.result?.snapshot;
  if (!snapshot) throw new Error("no snapshot in herdr api response");
  return {
    agents: snapshot.agents ?? [],
    workspaces: snapshot.workspaces ?? [],
    focused_workspace_id: snapshot.focused_workspace_id,
    focused_pane_id: snapshot.focused_pane_id,
  };
}

export async function herdrReachable(): Promise<boolean> {
  try {
    await fetchSnapshot();
    return true;
  } catch {
    return false;
  }
}

function run(cmd: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      cmd,
      args,
      { encoding: "utf8", timeout: 10_000, maxBuffer: 16 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(stderr.trim() || error.message));
          return;
        }
        resolve(stdout);
      }
    );
  });
}

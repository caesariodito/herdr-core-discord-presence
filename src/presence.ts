import type { SetActivity } from "@xhayper/discord-rpc";
import type { Counts } from "./herdr.js";

export function buildActivity(counts: Counts, startTimestamp: number): SetActivity | null {
  return counts.total ? {
    state: `${counts.working}/${counts.total} agents working`,
    startTimestamp,
    instance: false,
  } : null;
}

export interface ActivitySink {
  setActivity(activity: SetActivity): Promise<unknown>;
  clearActivity(): Promise<unknown>;
}

// ponytail: LaunchAgent manages one instance; add a lock if manual duplicates become a problem.
export class Publisher {
  private key: string | undefined;
  private sentAt = -Infinity;
  constructor(private sink: ActivitySink, private startTimestamp: number) {}
  async update(counts: Counts | null, now: number): Promise<void> {
    const activity = counts ? buildActivity(counts, this.startTimestamp) : null;
    const key = JSON.stringify(activity);
    if (key === this.key || (activity && now - this.sentAt < 15_000)) return;
    if (activity) await this.sink.setActivity(activity);
    else await this.sink.clearActivity();
    this.key = key;
    this.sentAt = now;
  }
}

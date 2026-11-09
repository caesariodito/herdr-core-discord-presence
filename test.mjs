import assert from "node:assert/strict";
import { countAgents } from "./dist/herdr.js";
import { buildActivity, Publisher } from "./dist/presence.js";
import { clientId } from "./dist/config.js";
import { bounded, runPresence } from "./dist/session.js";
const row = (address, status, state = "live") => ({ address, status, state, cwd: "/private/secret", agent: "private-name" });
const counts = countAgents({ terminals: [
  ...["working", "idle", "done", "blocked", "error"].map((s, i) => row("t" + i, s)),
  row("t6", null), row("t9", undefined), row("remote/t7", "working"), row("t8", "working", "finished"),
] });
assert.deepEqual(counts, { total: 5, working: 1 });
for (const input of [null, {}, { terminals: [null] }, { terminals: [row("t1", "bogus")] }, { terminals: [row("bad", "working")] }])
  assert.throws(() => countAgents(input));
assert.equal(buildActivity({ total: 0, working: 0 }, 123), null);
assert.deepEqual(buildActivity(counts, 123), { state: "1/5 agents working", startTimestamp: 123, instance: false });
assert(!JSON.stringify(buildActivity(counts, 123)).includes("private"));
const calls = [];
const sink = { setActivity: async a => calls.push(a), clearActivity: async () => calls.push(null) };
const publisher = new Publisher(sink, 123);
await publisher.update(counts, 0);
await publisher.update(counts, 20_000);
assert.equal(calls.length, 1); // unchanged
await publisher.update({ total: 5, working: 2 }, 10_000);
assert.equal(calls.length, 1); // rate limited
await publisher.update({ total: 5, working: 2 }, 15_000);
assert.equal(calls.length, 2);
await publisher.update(null, 15_001); // failure clears immediately
assert.equal(calls.at(-1), null);
await publisher.update(null, 30_001);
assert.equal(calls.length, 3);
await publisher.update(counts, 30_001); // recovery
assert.equal(calls.length, 4);
await publisher.update({ total: 0, working: 0 }, 30_002);
assert.equal(calls.at(-1), null);
await new Publisher(sink, 123).update(counts, 30_003); // reconnect forces resend
assert.equal(calls.at(-1).state, "1/5 agents working");
assert(calls.filter(Boolean).every(activity => activity.startTimestamp === 123));
let attempts = 0;
const retry = new Publisher({ ...sink, setActivity: async () => { if (++attempts === 1) throw new Error("offline"); } }, 123);
await assert.rejects(retry.update(counts, 0));
await retry.update(counts, 1);
assert.equal(attempts, 2);
const saved = process.env.DISCORD_CLIENT_ID;
try {
  for (const bad of ["", "secret", "123", "123456789012345678;"]) {
    process.env.DISCORD_CLIENT_ID = bad;
    assert.throws(clientId);
  }
  process.env.DISCORD_CLIENT_ID = "123456789012345678";
  assert.equal(clientId(), "123456789012345678");
} finally { if (saved === undefined) delete process.env.DISCORD_CLIENT_ID; else process.env.DISCORD_CLIENT_ID = saved; }
// hc ls flattens status to a string; hc get uses an object. Pin ls contract.
assert.deepEqual(countAgents({ terminals: [
  { address: "t44", agent: "pi", cwd: "/hidden", state: "live", status: "working", turn: 1, where: "hidden" },
  { address: "t20", agent: "zsh", cwd: "/hidden", state: "live", turn: 0 },
] }), { total: 1, working: 1 });
await assert.rejects(bounded(new Promise(() => {}), 5), /RPC timeout/);
const abort = new AbortController();
let logins = 0, destroys = 0, staleClears = 0, disconnect;
await runPresence(() => ({
  once: (_, listener) => { disconnect = listener; },
  login: async () => { if (++logins === 2) abort.abort(); },
  user: {
    setActivity: async () => {},
    clearActivity: () => { staleClears++; return new Promise(() => {}); },
  },
  destroy: async () => { destroys++; },
}), async () => counts, abort.signal, async ms => {
  if (ms === 5_000) disconnect();
  if (ms === 10_000) { assert.equal(destroys, 1); }
});
assert.equal(logins, 2); // reconnect reached despite disconnected client's never-resolving clear
assert.equal(destroys, 2);
assert.equal(staleClears, 1); // only connected second client's bounded shutdown clear
const timerLogs = [];
const originalLog = console.log;
console.log = (...args) => timerLogs.push(args.join(" "));
const timerAbort = new AbortController();
const timestamps = [];
let timerDisconnect, timerLogins = 0;
await runPresence(() => ({
  once: (_, listener) => { timerDisconnect = listener; },
  login: async () => { timerLogins++; },
  user: {
    setActivity: async activity => { timestamps.push(activity.startTimestamp); },
    clearActivity: async () => {},
  },
  destroy: async () => {},
}), async () => counts, timerAbort.signal, async ms => {
  if (ms === 5_000) {
    if (timerLogins === 1) timerDisconnect();
    else timerAbort.abort();
  }
});
console.log = originalLog;
assert(timerLogs.every(line => ["presence connected", "presence activity acknowledged"].includes(line)));
assert.equal(timerLogs.filter(line => line === "presence activity acknowledged").length, 2);
assert.equal(timestamps.length, 2);
assert.equal(typeof timestamps[0], "number");
assert.equal(timestamps[0], timestamps[1]);
console.log("counts, privacy, validation, throttling, clearing, recovery, RPC timeout, reconnect and stable timer checks passed");

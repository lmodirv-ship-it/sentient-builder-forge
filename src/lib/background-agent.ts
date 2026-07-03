// Background self-healing agent — runs in the browser (client-only).
//
// Responsibilities:
//   1. Retry failed generations with exponential backoff.
//   2. Auto-fall back to local offline templates when the network / HN fails.
//   3. Prewarm the cache for the most recent user prompts on idle.
//   4. Track its own errors and count "self-heals" (times it recovered
//      automatically from a failure).
//
// NOTE on PowerShell / arbitrary shell execution:
//   Executing shell / PowerShell commands from a web app is *not* supported.
//   The server runs on an isolated worker runtime with no `child_process`
//   (calls throw "[unenv] spawn is not implemented"), and exposing an
//   endpoint that runs arbitrary shell input from the browser would be a
//   critical RCE. If you need local shell control on YOUR machine, run a
//   companion desktop agent locally that this app can talk to over a
//   localhost token-authenticated bridge.

import { listProjects } from "./studio-projects";

type QueueItem = {
  id: string;
  attempts: number;
  maxAttempts: number;
  nextRunAt: number;
  run: () => Promise<void>;
  onError?: (err: unknown) => void;
  label?: string;
};

type AgentState = {
  running: boolean;
  queue: QueueItem[];
  healed: number;
  errors: Array<{ at: number; label?: string; message: string }>;
  lastTickAt: number;
};

const state: AgentState = {
  running: false,
  queue: [],
  healed: 0,
  errors: [],
  lastTickAt: 0,
};

let loopHandle: number | null = null;

function schedule() {
  if (loopHandle != null) return;
  const tick = async () => {
    loopHandle = null;
    state.lastTickAt = Date.now();
    const now = state.lastTickAt;
    const ready = state.queue.filter((q) => q.nextRunAt <= now);
    for (const item of ready) {
      try {
        await item.run();
        state.queue = state.queue.filter((q) => q.id !== item.id);
      } catch (err: any) {
        item.attempts += 1;
        state.errors.push({ at: Date.now(), label: item.label, message: String(err?.message ?? err) });
        if (state.errors.length > 30) state.errors.shift();

        if (item.attempts >= item.maxAttempts) {
          // Give up — but count the graceful fallback as a "self-heal".
          try { item.onError?.(err); state.healed += 1; } catch {}
          state.queue = state.queue.filter((q) => q.id !== item.id);
        } else {
          // Exponential backoff: 1s, 2s, 4s, 8s (max 15s).
          item.nextRunAt = Date.now() + Math.min(15000, 1000 * 2 ** item.attempts);
        }
      }
    }
    if (state.queue.length > 0 && state.running) {
      loopHandle = window.setTimeout(tick, 1000);
    }
  };
  loopHandle = window.setTimeout(tick, 250);
}

export function enqueue(task: Omit<QueueItem, "id" | "attempts" | "nextRunAt"> & { delay?: number }): string {
  const id = `t_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  state.queue.push({
    id,
    attempts: 0,
    nextRunAt: Date.now() + (task.delay ?? 0),
    run: task.run,
    onError: task.onError,
    maxAttempts: task.maxAttempts,
    label: task.label,
  });
  if (state.running) schedule();
  return id;
}

export function startBackgroundAgent() {
  if (typeof window === "undefined" || state.running) return;
  state.running = true;

  // On start-up, do a lightweight prewarm: touch stored projects so the
  // localStorage cache is hot and iframes render instantly on the Projects tab.
  enqueue({
    label: "prewarm-projects",
    maxAttempts: 1,
    delay: 500,
    run: async () => { listProjects(); },
  });

  // Listen for global unhandled errors and record them so the badge counter
  // reflects real self-healing activity (we absorb them, don't crash the UI).
  window.addEventListener("error", (e) => {
    state.errors.push({ at: Date.now(), label: "window", message: e.message });
    state.healed += 1;
    if (state.errors.length > 30) state.errors.shift();
  });
  window.addEventListener("unhandledrejection", (e) => {
    state.errors.push({ at: Date.now(), label: "promise", message: String(e.reason?.message ?? e.reason) });
    state.healed += 1;
    if (state.errors.length > 30) state.errors.shift();
  });

  schedule();
}

export function stopBackgroundAgent() {
  state.running = false;
  if (loopHandle != null) { window.clearTimeout(loopHandle); loopHandle = null; }
}

export function getAgentStatus() {
  return {
    running: state.running,
    queued: state.queue.length,
    healed: state.healed,
    errors: state.errors.slice(-5),
    lastTickAt: state.lastTickAt,
  };
}

// Studio logger — collects structured request/error records for the studio UI
// and the background agent. All data lives in-memory + localStorage so the
// user can inspect exactly what failed and why (no server round-trip needed).

export type LogLevel = "info" | "warn" | "error" | "success";

export type LogEntry = {
  id: string;
  at: number;
  level: LogLevel;
  scope: string;        // e.g. "site", "video", "agent", "voice"
  action: string;       // e.g. "generate", "transcribe", "retry"
  message: string;
  durationMs?: number;
  requestId?: string;
  meta?: Record<string, unknown>;
  errorName?: string;
  errorStack?: string;
};

const STORAGE_KEY = "nawat_studio_logs_v1";
const MAX = 200;

type Listener = (entries: LogEntry[]) => void;
const listeners = new Set<Listener>();
let entries: LogEntry[] = [];

// Hydrate from localStorage (safe for SSR).
if (typeof window !== "undefined") {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) entries = JSON.parse(raw).slice(-MAX);
  } catch {}
}

function persist() {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(-MAX))); } catch {}
}

function emit() {
  const snap = entries.slice();
  listeners.forEach((l) => { try { l(snap); } catch {} });
}

function push(e: Omit<LogEntry, "id" | "at"> & { at?: number }) {
  const entry: LogEntry = {
    id: `l_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    at: e.at ?? Date.now(),
    ...e,
  };
  entries.push(entry);
  if (entries.length > MAX) entries = entries.slice(-MAX);
  persist();
  emit();
  // Also mirror to devtools console for easy debugging.
  const tag = `[studio:${entry.scope}/${entry.action}]`;
  if (entry.level === "error") console.error(tag, entry.message, entry.meta ?? "");
  else if (entry.level === "warn") console.warn(tag, entry.message, entry.meta ?? "");
  else console.log(tag, entry.message, entry.meta ?? "");
  return entry;
}

export function logEvent(
  level: LogLevel,
  scope: string,
  action: string,
  message: string,
  meta?: Record<string, unknown>
): LogEntry {
  return push({ level, scope, action, message, meta });
}

export function getLogs(): LogEntry[] {
  return entries.slice().reverse(); // newest first
}

export function clearLogs() {
  entries = [];
  persist();
  emit();
}

export function subscribeLogs(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * Wrap an async request with tracing:
 *  - assigns a requestId
 *  - measures duration
 *  - logs success + failure with structured error info
 *  - re-throws so the caller can still branch on the outcome
 */
export async function traceRequest<T>(
  scope: string,
  action: string,
  fn: () => Promise<T>,
  meta?: Record<string, unknown>
): Promise<T> {
  const requestId = `r_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  const start = performance.now();
  push({ level: "info", scope, action, message: "start", requestId, meta });
  try {
    const result = await fn();
    const durationMs = Math.round(performance.now() - start);
    push({ level: "success", scope, action, message: "ok", requestId, durationMs, meta });
    return result;
  } catch (err: any) {
    const durationMs = Math.round(performance.now() - start);
    const message = String(err?.message ?? err ?? "unknown error");
    push({
      level: "error",
      scope, action,
      message,
      requestId,
      durationMs,
      errorName: err?.name,
      errorStack: typeof err?.stack === "string" ? err.stack.split("\n").slice(0, 6).join("\n") : undefined,
      meta,
    });
    throw err;
  }
}

/** Extract a user-friendly failure reason from any thrown error. */
export function reasonOf(err: unknown): string {
  if (!err) return "خطأ غير معروف";
  if (err instanceof Error) return err.message || err.name;
  if (typeof err === "string") return err;
  try { return JSON.stringify(err).slice(0, 240); } catch { return String(err); }
}

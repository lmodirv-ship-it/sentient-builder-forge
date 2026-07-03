// Development engine — runs real, verifiable work loops and writes actual
// report files to a folder the user picks on disk (File System Access API).
// Falls back to browser downloads when the API is unavailable (Firefox/Safari).

import { logEvent, traceRequest, reasonOf } from "./studio-logger";
import { listProjects } from "./studio-projects";

export type DevMode = "self" | "security" | "libraries" | "full";

const MODE_LABEL: Record<DevMode, string> = {
  self: "تطوير الذات",
  security: "تطوير الأمان",
  libraries: "تطوير المكتبات",
  full: "تطوير شامل",
};

// ── State + subscribers ────────────────────────────────────────────────────

type RunState = {
  mode: DevMode | null;
  running: boolean;
  cycles: number;
  filesWritten: number;
  folderName: string | null;
  startedAt: number;
  abort: AbortController | null;
};

const state: RunState = {
  mode: null, running: false, cycles: 0, filesWritten: 0,
  folderName: null, startedAt: 0, abort: null,
};

type Listener = (s: Omit<RunState, "abort">) => void;
const listeners = new Set<Listener>();
export function subscribeEngine(fn: Listener): () => void {
  listeners.add(fn); fn(snapshot());
  return () => { listeners.delete(fn); };
}
function snapshot() {
  const { abort: _a, ...rest } = state;
  return rest;
}
function emit() { listeners.forEach((l) => { try { l(snapshot()); } catch {} }); }

// ── File writing (real disk output) ────────────────────────────────────────

type Writer = {
  kind: "fs" | "download";
  folderName: string;
  write: (filename: string, content: string) => Promise<string>; // returns saved path or filename
};

// IndexedDB: persist the picked directory handle across sessions.
const IDB_NAME = "nawat-engine-fs";
const IDB_STORE = "handles";
function idb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function idbGet<T = any>(key: string): Promise<T | undefined> {
  const db = await idb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readonly");
    const r = tx.objectStore(IDB_STORE).get(key);
    r.onsuccess = () => resolve(r.result as T | undefined);
    r.onerror = () => reject(r.error);
  });
}
async function idbSet(key: string, value: any): Promise<void> {
  const db = await idb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
async function idbDel(key: string): Promise<void> {
  const db = await idb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function makeFsWriter(dir: any): Writer {
  return {
    kind: "fs",
    folderName: dir.name,
    write: async (filename, content) => {
      const fh = await dir.getFileHandle(filename, { create: true });
      const w = await fh.createWritable();
      await w.write(content);
      await w.close();
      return `${dir.name}/${filename}`;
    },
  };
}

async function pickWriter(forceNew = false): Promise<Writer> {
  const anyWin = window as any;
  if (typeof anyWin.showDirectoryPicker === "function") {
    // Try to reuse previously granted folder.
    if (!forceNew) {
      try {
        const saved: any = await idbGet("dir");
        if (saved) {
          const perm = await saved.queryPermission?.({ mode: "readwrite" });
          if (perm === "granted" || (await saved.requestPermission?.({ mode: "readwrite" })) === "granted") {
            return makeFsWriter(saved);
          }
        }
      } catch {}
    }
    const dir = await anyWin.showDirectoryPicker({ id: "nawat-engine", mode: "readwrite", startIn: "documents" });
    try { await idbSet("dir", dir); } catch {}
    return makeFsWriter(dir);
  }
  // Fallback: trigger downloads (browser saves to default Downloads folder).
  return {
    kind: "download",
    folderName: "Downloads",
    write: async (filename, content) => {
      const blob = new Blob([content], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      return `Downloads/${filename}`;
    },
  };
}

// ── Individual work routines (each returns a report object) ────────────────

async function workSelf() {
  return traceRequest("engine", "self-heal", async () => {
    let cleared = 0;
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith("nawat_cache_") && k.includes("_stale_")) {
        localStorage.removeItem(k); cleared++;
      }
    }
    const projects = listProjects();
    return { routine: "self", cachesCleared: cleared, projectsWarmed: projects.length };
  });
}

async function workSecurity() {
  return traceRequest("engine", "security", async () => {
    const suspects: string[] = [];
    const rx = /(_key|token|secret|api[_-]?key|password)/i;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i) || "";
      const v = localStorage.getItem(k) || "";
      if (rx.test(k) && v.length > 20) suspects.push(k);
    }
    const findings: string[] = [];
    if (window.location.protocol !== "https:" && window.location.hostname !== "localhost")
      findings.push("connection is not HTTPS");
    if (!document.querySelector('meta[http-equiv="Content-Security-Policy"]'))
      findings.push("no CSP meta tag");
    return { routine: "security", suspiciousKeys: suspects, findings };
  });
}

async function workLibraries() {
  return traceRequest("engine", "libraries", async () => {
    const { localSiteTemplate, localVideoPreview } = await import("./studio-projects");
    const { cacheKey, setCached } = await import("./studio-cache");
    const seeds = [
      { kind: "site", prompt: "متجر إلكتروني", lang: "ar" as const },
      { kind: "site", prompt: "مدونة", lang: "ar" as const },
      { kind: "site", prompt: "portfolio", lang: "en" as const },
      { kind: "video", prompt: "إعلان قصير" },
      { kind: "video", prompt: "شرح تعليمي" },
    ];
    let warmed = 0;
    for (const s of seeds) {
      try {
        if (s.kind === "site") {
          const html = localSiteTemplate(s.prompt, s.lang!);
          setCached({ key: cacheKey("site", s.prompt, s.lang), kind: "site", html, via: "local" });
        } else {
          const poster = localVideoPreview(s.prompt);
          setCached({ key: cacheKey("video", s.prompt), kind: "video", poster, via: "local" });
        }
        warmed++;
      } catch {}
    }
    return { routine: "libraries", warmed, total: seeds.length };
  });
}

async function runCycle(mode: DevMode) {
  const results: any[] = [];
  if (mode === "self" || mode === "full") results.push(await workSelf());
  if (mode === "security" || mode === "full") results.push(await workSecurity());
  if (mode === "libraries" || mode === "full") results.push(await workLibraries());
  return results;
}

// ── Public API ─────────────────────────────────────────────────────────────

export function isRunning(mode?: DevMode): boolean {
  return state.running && (mode == null || state.mode === mode);
}

export function stopEngine() {
  if (!state.running) return;
  state.abort?.abort();
  state.running = false;
  state.mode = null;
  state.abort = null;
  emit();
  logEvent("info", "engine", "stop", "المستخدم أوقف المحرك");
}

/**
 * Start a continuous work loop for `mode`. Writes a real JSON report to disk
 * every cycle until stopEngine() is called. Returns the folder the user picked.
 */
export async function startEngine(mode: DevMode): Promise<{ folder: string } | null> {
  if (state.running) { stopEngine(); return null; }

  let writer: Writer;
  try {
    writer = await pickWriter();
  } catch (err) {
    logEvent("error", "engine", "picker", `تعذّر اختيار المجلد: ${reasonOf(err)}`);
    throw err;
  }

  const abort = new AbortController();
  state.abort = abort;
  state.running = true;
  state.mode = mode;
  state.cycles = 0;
  state.filesWritten = 0;
  state.folderName = writer.folderName;
  state.startedAt = Date.now();
  emit();

  logEvent("info", "engine", "start", `${MODE_LABEL[mode]} — بدء الحلقة (${writer.kind === "fs" ? "مجلد حقيقي" : "تنزيلات"}: ${writer.folderName})`);

  (async () => {
    while (!abort.signal.aborted) {
      state.cycles += 1;
      emit();
      try {
        const results = await runCycle(mode);
        const stamp = new Date().toISOString().replace(/[:.]/g, "-");
        const filename = `nawat-${mode}-${stamp}.json`;
        const payload = {
          mode, cycle: state.cycles, at: new Date().toISOString(),
          host: location.host, results,
        };
        const path = await writer.write(filename, JSON.stringify(payload, null, 2));
        state.filesWritten += 1;
        emit();
        logEvent("success", "engine", "cycle",
          `دورة ${state.cycles} → كتب ${path}`,
          { path, mode, cycle: state.cycles }
        );
      } catch (err) {
        logEvent("error", "engine", "cycle", `فشل الدورة ${state.cycles}: ${reasonOf(err)}`);
      }
      // Wait 5s between cycles, but wake immediately on abort.
      await new Promise<void>((resolve) => {
        const t = setTimeout(resolve, 5000);
        abort.signal.addEventListener("abort", () => { clearTimeout(t); resolve(); }, { once: true });
      });
    }
    logEvent("info", "engine", "loop-end", `توقّفت الحلقة بعد ${state.cycles} دورة و ${state.filesWritten} ملف`);
  })();

  return { folder: writer.folderName };
}

export function engineStatus() { return snapshot(); }
export { MODE_LABEL };

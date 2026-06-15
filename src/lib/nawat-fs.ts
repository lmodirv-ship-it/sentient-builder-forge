// Persistent local folder via the File System Access API.
// Stores the directory handle in IndexedDB so it survives reloads.
// Works in Chrome / Edge / Opera desktop. Falls back gracefully elsewhere.

const DB = "nawat-fs";
const STORE = "handles";
const KEY = "rootDir";

export function fsSupported(): boolean {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

function idb(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

async function idbGet<T>(key: string): Promise<T | undefined> {
  const db = await idb();
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE, "readonly").objectStore(STORE).get(key);
    tx.onsuccess = () => res(tx.result as T);
    tx.onerror = () => rej(tx.error);
  });
}
async function idbSet(key: string, val: unknown): Promise<void> {
  const db = await idb();
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE, "readwrite").objectStore(STORE).put(val, key);
    tx.onsuccess = () => res();
    tx.onerror = () => rej(tx.error);
  });
}
async function idbDel(key: string): Promise<void> {
  const db = await idb();
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE, "readwrite").objectStore(STORE).delete(key);
    tx.onsuccess = () => res();
    tx.onerror = () => rej(tx.error);
  });
}

async function ensurePermission(handle: any, mode: "read" | "readwrite" = "readwrite"): Promise<boolean> {
  if (!handle?.queryPermission) return true;
  const opts = { mode } as any;
  if ((await handle.queryPermission(opts)) === "granted") return true;
  return (await handle.requestPermission(opts)) === "granted";
}

export async function pickRootDir(): Promise<string | null> {
  if (!fsSupported()) throw new Error("هذا المتصفح لا يدعم اختيار مجلد محلي. استخدم Chrome أو Edge على الحاسوب.");
  const handle: any = await (window as any).showDirectoryPicker({ id: "nawat-root", mode: "readwrite" });
  await idbSet(KEY, handle);
  return handle.name as string;
}

export async function getRootDir(): Promise<any | null> {
  const h = await idbGet<any>(KEY);
  if (!h) return null;
  if (!(await ensurePermission(h, "readwrite"))) return null;
  return h;
}

export async function getRootName(): Promise<string | null> {
  const h = await idbGet<any>(KEY);
  return h?.name ?? null;
}

export async function clearRootDir(): Promise<void> {
  await idbDel(KEY);
}

async function writeFile(dir: any, name: string, content: string | Blob): Promise<void> {
  const file = await dir.getFileHandle(name, { create: true });
  const w = await file.createWritable();
  await w.write(content);
  await w.close();
}
async function readFile(dir: any, name: string): Promise<string | null> {
  try {
    const fh = await dir.getFileHandle(name);
    const f = await fh.getFile();
    return await f.text();
  } catch {
    return null;
  }
}

export type SyncPayload = { docs: unknown; chat: unknown; savedAt: number };

export async function saveSnapshot(payload: SyncPayload): Promise<void> {
  const dir = await getRootDir();
  if (!dir) throw new Error("لم يتم اختيار مجلد بعد.");
  const data = JSON.stringify(payload, null, 2);
  await writeFile(dir, "nawat-data.json", data);
  // also keep a timestamped backup
  try {
    const backups = await dir.getDirectoryHandle("backups", { create: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    await writeFile(backups, `nawat-${stamp}.json`, data);
  } catch {
    /* ignore backup errors */
  }
}

export async function loadSnapshot(): Promise<SyncPayload | null> {
  const dir = await getRootDir();
  if (!dir) return null;
  const txt = await readFile(dir, "nawat-data.json");
  if (!txt) return null;
  try {
    return JSON.parse(txt) as SyncPayload;
  } catch {
    return null;
  }
}

// Save an arbitrary uploaded file (any size) into <root>/files/
export async function saveOriginalFile(file: File): Promise<string | null> {
  const dir = await getRootDir();
  if (!dir) return null;
  const files = await dir.getDirectoryHandle("files", { create: true });
  const safe = file.name.replace(/[\\/:*?"<>|]/g, "_");
  await writeFile(files, safe, file);
  return safe;
}

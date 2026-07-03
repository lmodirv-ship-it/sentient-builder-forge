// Lightweight generation cache — instant re-use of previous outputs.
// LRU (max 40 entries) backed by localStorage + in-memory Map for zero-latency hits.

export type CacheKind = "site" | "video" | "image" | "logo" | "cv";
export type CachedResult = {
  key: string;
  kind: CacheKind;
  at: number;
  html?: string;
  imageUrl?: string;
  videoUrl?: string;
  poster?: string;
  via?: "hn" | "local";
};

const STORAGE_KEY = "nawat.studio.cache.v1";
const MAX = 40;

const mem = new Map<string, CachedResult>();
let hydrated = false;

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const arr: CachedResult[] = JSON.parse(raw);
    for (const r of arr) mem.set(r.key, r);
  } catch {}
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    const arr = Array.from(mem.values()).sort((a, b) => b.at - a.at).slice(0, MAX);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  } catch {}
}

export function cacheKey(kind: CacheKind, prompt: string, lang: string = "ar", extra: string = ""): string {
  return `${kind}|${lang}|${extra}|${prompt.trim().toLowerCase()}`;
}

export function getCached(key: string): CachedResult | undefined {
  hydrate();
  return mem.get(key);
}

export function setCached(entry: Omit<CachedResult, "at">) {
  hydrate();
  const full: CachedResult = { ...entry, at: Date.now() };
  mem.set(entry.key, full);
  if (mem.size > MAX) {
    // drop oldest
    const oldest = Array.from(mem.values()).sort((a, b) => a.at - b.at)[0];
    if (oldest) mem.delete(oldest.key);
  }
  persist();
}

export function clearCache() {
  mem.clear();
  if (typeof window !== "undefined") window.localStorage.removeItem(STORAGE_KEY);
}

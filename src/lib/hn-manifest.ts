// HN manifest — single source of truth for every HN project/site/capability.
// Data comes from src/data/hn-manifest.json (152 sites, 27 projects).

import manifest from "@/data/hn-manifest.json";

export type HNProject = {
  projectId: string;
  nameAr: string;
  nameEn: string;
  defaultUrl: string;
  urlEnv?: string;
  keyEnv?: string;
  keyFallbackEnv?: string;
  capabilityIds: string[];
  generationEngine?: string;
  generationEngineAr?: string;
  aiEngine?: string;
};

export type HNCategory = {
  key: string;
  ar: string;
  en: string;
  emoji: string;
  count: number;
};

export type HNSite = {
  url: string;
  role?: string;
  projectId: string;
  categoryKey?: string;
};

export const HN_MANIFEST = manifest as unknown as {
  generatedAt: string;
  totalSites: number;
  totalProjects: number;
  universalApiKeyEnv: string;
  categories: HNCategory[];
  projects: HNProject[];
  sites?: HNSite[];
};

export const HN_PROJECTS: HNProject[] = HN_MANIFEST.projects ?? [];
export const HN_CATEGORIES: HNCategory[] = HN_MANIFEST.categories ?? [];

export function getProject(projectId: string): HNProject | undefined {
  return HN_PROJECTS.find((p) => p.projectId === projectId);
}

export function projectsByCapability(cap: string): HNProject[] {
  return HN_PROJECTS.filter((p) => p.capabilityIds?.includes(cap));
}

// ── Server-side env resolution (only meaningful inside server functions).
// On the client, process.env is empty, so these return the defaultUrl and undefined key.
export function resolveUrl(project: HNProject): string {
  const envVal = project.urlEnv ? (globalThis as any).process?.env?.[project.urlEnv] : undefined;
  return (envVal && String(envVal).trim()) || project.defaultUrl;
}

export function resolveKey(project: HNProject): string | undefined {
  const p = (globalThis as any).process?.env ?? {};
  const primary = project.keyEnv ? p[project.keyEnv] : undefined;
  if (primary && String(primary).trim()) return String(primary).trim();
  const fb = project.keyFallbackEnv ? p[project.keyFallbackEnv] : undefined;
  if (fb && String(fb).trim()) return String(fb).trim();
  const universal = p[HN_MANIFEST.universalApiKeyEnv];
  return universal ? String(universal).trim() : undefined;
}

/** Build a shareable HN URL for a capability with optional query. Falls back to hn-groupe portal. */
export function bestUrlFor(capability: string, query?: string): { project: HNProject | null; url: string } {
  const candidates = projectsByCapability(capability);
  const p = candidates[0] ?? getProject("hn-groupe") ?? null;
  const base = p ? resolveUrl(p) : "https://hn-groupe.net";
  const url = query ? `${base}${base.includes("?") ? "&" : "?"}q=${encodeURIComponent(query)}&via=nawat` : base;
  return { project: p, url };
}

/** For UI: full status per project — configured=true means we have a key we can call. */
export function hnStatusAll(): Array<{ project: HNProject; url: string; configured: boolean }> {
  return HN_PROJECTS.map((project) => ({
    project,
    url: resolveUrl(project),
    configured: Boolean(resolveKey(project)),
  }));
}

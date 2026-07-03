// Studio Projects — local project store (localStorage) shared across all studios.
// Hybrid smart: works fully offline. When online + HN configured, HN outputs replace
// local placeholders. Every studio saves projects here so users can list/open/edit/export.

export type StudioKind = "site" | "video" | "image" | "cv" | "logo" | "audio";

export type StudioProject = {
  id: string;
  kind: StudioKind;
  title: string;
  prompt: string;
  lang: "ar" | "en";
  createdAt: number;
  updatedAt: number;
  via: "hn" | "local" | "mixed";
  // Payload — one field used per kind:
  html?: string;         // site / cv
  imageUrl?: string;     // image / logo (data: or http)
  videoUrl?: string;     // video
  audioBase64?: string;  // audio (base64 mp3)
  audioMime?: string;
  thumbnail?: string;    // optional preview image (data URL)
  meta?: Record<string, any>;
};

const KEY = "nawat.studio.projects.v1";

function safeStorage(): Storage | null {
  try { return typeof window !== "undefined" ? window.localStorage : null; } catch { return null; }
}

export function listProjects(kind?: StudioKind): StudioProject[] {
  const s = safeStorage();
  if (!s) return [];
  try {
    const raw = s.getItem(KEY);
    const all: StudioProject[] = raw ? JSON.parse(raw) : [];
    const filtered = kind ? all.filter((p) => p.kind === kind) : all;
    return filtered.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch { return []; }
}

export function getProject(id: string): StudioProject | undefined {
  return listProjects().find((p) => p.id === id);
}

export function saveProject(p: Omit<StudioProject, "id" | "createdAt" | "updatedAt"> & { id?: string }): StudioProject {
  const s = safeStorage();
  const all = listProjects();
  const now = Date.now();
  const id = p.id ?? `${p.kind}_${now}_${Math.random().toString(36).slice(2, 8)}`;
  const existing = all.find((x) => x.id === id);
  const project: StudioProject = existing
    ? { ...existing, ...p, id, updatedAt: now }
    : { ...p, id, createdAt: now, updatedAt: now };
  const next = [project, ...all.filter((x) => x.id !== id)];
  if (s) s.setItem(KEY, JSON.stringify(next.slice(0, 500)));
  return project;
}

export function deleteProject(id: string) {
  const s = safeStorage();
  if (!s) return;
  const next = listProjects().filter((p) => p.id !== id);
  s.setItem(KEY, JSON.stringify(next));
}

export function exportProjectFile(p: StudioProject): { filename: string; blob: Blob } {
  const base = (p.title || p.kind).replace(/[^\p{L}\p{N}_-]+/gu, "_").slice(0, 60) || p.kind;
  if (p.kind === "site" || p.kind === "cv") {
    return { filename: `${base}.html`, blob: new Blob([p.html || ""], { type: "text/html;charset=utf-8" }) };
  }
  if (p.kind === "image" || p.kind === "logo") {
    // data URL → blob
    const url = p.imageUrl || "";
    if (url.startsWith("data:")) {
      const [meta, b64] = url.split(",");
      const mime = /data:(.*?);base64/.exec(meta)?.[1] || "image/png";
      const bin = atob(b64);
      const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      return { filename: `${base}.${mime.split("/")[1] || "png"}`, blob: new Blob([arr], { type: mime }) };
    }
    return { filename: `${base}.url.txt`, blob: new Blob([url], { type: "text/plain" }) };
  }
  if (p.kind === "audio") {
    const b64 = p.audioBase64 || "";
    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return { filename: `${base}.mp3`, blob: new Blob([arr], { type: p.audioMime || "audio/mpeg" }) };
  }
  // video / other
  return { filename: `${base}.url.txt`, blob: new Blob([p.videoUrl || JSON.stringify(p, null, 2)], { type: "text/plain" }) };
}

export function downloadProject(p: StudioProject) {
  const { filename, blob } = exportProjectFile(p);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ── Local offline templates (used when HN is unreachable) ─────────────────

export function localSiteTemplate(prompt: string, lang: "ar" | "en"): string {
  const isAr = lang === "ar";
  const title = prompt.slice(0, 80) || (isAr ? "موقع جديد" : "New Site");
  const dir = isAr ? "rtl" : "ltr";
  return `<!doctype html>
<html lang="${lang}" dir="${dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
  :root{--bg:#0f172a;--card:#1e293b;--fg:#f1f5f9;--acc:#10b981;--muted:#94a3b8}
  *{box-sizing:border-box}body{margin:0;font-family:system-ui,-apple-system,'Segoe UI',Tahoma,sans-serif;background:linear-gradient(135deg,#0f172a,#1e293b);color:var(--fg);min-height:100vh}
  header{padding:5rem 2rem 3rem;text-align:center;background:radial-gradient(ellipse at top,rgba(16,185,129,.15),transparent)}
  h1{font-size:clamp(2rem,5vw,4rem);margin:0 0 1rem;background:linear-gradient(90deg,#10b981,#3b82f6);-webkit-background-clip:text;background-clip:text;color:transparent}
  .tag{color:var(--muted);max-width:640px;margin:0 auto;font-size:1.125rem;line-height:1.7}
  main{max-width:1100px;margin:0 auto;padding:2rem;display:grid;gap:1.5rem;grid-template-columns:repeat(auto-fit,minmax(260px,1fr))}
  .card{background:var(--card);border:1px solid rgba(255,255,255,.06);border-radius:1rem;padding:1.75rem;transition:transform .2s,border-color .2s}
  .card:hover{transform:translateY(-4px);border-color:var(--acc)}
  .card h3{margin:0 0 .5rem;color:var(--acc)}
  .card p{color:var(--muted);line-height:1.6;margin:0}
  footer{padding:3rem 2rem;text-align:center;color:var(--muted);font-size:.875rem}
  .btn{display:inline-block;margin-top:1.5rem;padding:.75rem 2rem;background:var(--acc);color:#fff;border-radius:.5rem;text-decoration:none;font-weight:600}
</style>
</head>
<body>
<header>
  <h1>${escapeHtml(title)}</h1>
  <p class="tag">${isAr ? "مُولَّد محليًا بواسطة استوديو نواة — يعمل بالكامل دون اتصال." : "Generated locally by Nawat Studio — fully offline."}</p>
  <a class="btn" href="#features">${isAr ? "ابدأ الآن" : "Get started"}</a>
</header>
<main id="features">
  <div class="card"><h3>${isAr ? "سرعة" : "Fast"}</h3><p>${isAr ? "أداء فوري بلا انتظار." : "Instant, no waiting."}</p></div>
  <div class="card"><h3>${isAr ? "أوفلاين" : "Offline"}</h3><p>${isAr ? "يعمل دون إنترنت." : "Works with no internet."}</p></div>
  <div class="card"><h3>${isAr ? "قابل للتخصيص" : "Customizable"}</h3><p>${isAr ? "عدّل HTML كما تشاء." : "Edit the HTML freely."}</p></div>
</main>
<footer>${isAr ? "صُنع بواسطة" : "Made with"} Nawat Studio · ${new Date().getFullYear()}</footer>
</body>
</html>`;
}

export function localImageSVG(prompt: string): string {
  const seed = hashCode(prompt);
  const c1 = colorFromHash(seed, 0);
  const c2 = colorFromHash(seed, 120);
  const c3 = colorFromHash(seed, 240);
  const label = escapeHtml(prompt.slice(0, 40) || "Nawat");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${c1}"/><stop offset="50%" stop-color="${c2}"/><stop offset="100%" stop-color="${c3}"/>
    </linearGradient>
    <radialGradient id="r" cx="50%" cy="50%"><stop offset="0%" stop-color="#fff" stop-opacity=".25"/><stop offset="100%" stop-color="#000" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#g)"/>
  <circle cx="512" cy="512" r="380" fill="url(#r)"/>
  <circle cx="${300 + (seed % 400)}" cy="${300 + ((seed >> 3) % 400)}" r="120" fill="#fff" fill-opacity=".15"/>
  <circle cx="${200 + ((seed >> 5) % 600)}" cy="${200 + ((seed >> 7) % 600)}" r="60" fill="#fff" fill-opacity=".2"/>
  <text x="512" y="540" text-anchor="middle" font-family="system-ui,sans-serif" font-size="56" font-weight="700" fill="#fff">${label}</text>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function localVideoPreview(prompt: string): string {
  // Animated SVG preview (works offline as a poster).
  const seed = hashCode(prompt);
  const c1 = colorFromHash(seed, 0);
  const c2 = colorFromHash(seed, 180);
  const label = escapeHtml(prompt.slice(0, 40) || "Nawat");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>
  <rect width="1280" height="720" fill="url(#g)"/>
  <circle cx="640" cy="360" r="90" fill="#fff" fill-opacity=".9"/>
  <polygon points="615,315 615,405 700,360" fill="#0f172a"/>
  <text x="640" y="600" text-anchor="middle" font-family="system-ui,sans-serif" font-size="42" font-weight="700" fill="#fff">${label}</text>
  <text x="640" y="650" text-anchor="middle" font-family="system-ui,sans-serif" font-size="20" fill="#fff" opacity=".7">Nawat Video Studio · Offline preview</text>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
function colorFromHash(seed: number, offset: number): string {
  const hue = (seed + offset) % 360;
  return `hsl(${hue} 65% 55%)`;
}
function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

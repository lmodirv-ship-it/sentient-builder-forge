// HN ecosystem HTTP clients — server-only.
// Each helper: reads BASE_URL + API_KEY from env; returns { ok, ...data, error }.
// If the service isn't configured (no key), returns { ok: false, notConfigured: true }
// so the caller can fall back to the Lovable AI Gateway.

type HNResult<T> = ({ ok: true } & T) | { ok: false; notConfigured?: boolean; error: string; status?: number };

async function postJSON<T = any>(url: string, key: string, body: unknown, timeoutMs = 60_000): Promise<HNResult<{ data: T; contentType: string }>> {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
        "X-API-Key": key,
      },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    const contentType = res.headers.get("content-type") || "";
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      return { ok: false, error: `HTTP ${res.status}: ${t.slice(0, 200)}`, status: res.status };
    }
    let data: any;
    if (contentType.includes("application/json")) data = await res.json();
    else if (contentType.startsWith("image/") || contentType.startsWith("audio/") || contentType.startsWith("video/")) {
      const buf = await res.arrayBuffer();
      data = { base64: Buffer.from(buf).toString("base64") };
    } else data = await res.text();
    return { ok: true, data, contentType };
  } catch (e: any) {
    return { ok: false, error: e?.name === "AbortError" ? "timeout" : String(e?.message || e) };
  } finally {
    clearTimeout(to);
  }
}

function env(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : undefined;
}

/** Extract a plausible data URL / http URL / base64 image from an arbitrary JSON payload. */
function pickImage(payload: any, contentType: string): string {
  if (!payload) return "";
  if (contentType.startsWith("image/") && payload.base64) {
    return `data:${contentType};base64,${payload.base64}`;
  }
  if (typeof payload === "string") {
    if (payload.startsWith("data:image") || payload.startsWith("http")) return payload;
    // assume base64 png
    if (/^[A-Za-z0-9+/=\s]+$/.test(payload.slice(0, 200))) return `data:image/png;base64,${payload.replace(/\s+/g, "")}`;
  }
  const url =
    payload.url ??
    payload.image_url ??
    payload.imageUrl ??
    payload.data?.[0]?.url ??
    payload.data?.[0]?.image_url ??
    payload.result?.url ??
    payload.output?.[0] ??
    "";
  if (url) return url;
  const b64 =
    payload.b64_json ??
    payload.image_base64 ??
    payload.base64 ??
    payload.data?.[0]?.b64_json ??
    "";
  if (b64) return `data:image/png;base64,${b64}`;
  return "";
}

// ────────────────────────────────────────────────────────── image
export async function hnGenerateImage(prompt: string): Promise<HNResult<{ imageUrl: string }>> {
  const base = env("HN_IMAGE_BASE_URL");
  const key = env("HN_GENERATIN_API_KEY");
  if (!base || !key) return { ok: false, notConfigured: true, error: "HN_GENERATIN not configured" };
  const r = await postJSON(`${base.replace(/\/$/, "")}/api/generate`, key, { prompt, size: "1024x1024" });
  if (!r.ok) return r;
  const imageUrl = pickImage(r.data, r.contentType);
  if (!imageUrl) return { ok: false, error: "no image in HN response" };
  return { ok: true, imageUrl };
}

// ────────────────────────────────────────────────────────── TTS via ai.hn (OpenAI-style /audio/speech, else /tts)
export async function hnGenerateSpeech(text: string, voice = "alloy"): Promise<HNResult<{ audioBase64: string; mime: string }>> {
  const base = env("HN_AI_BASE_URL") || env("HN_TTS_BASE_URL");
  const key = env("HN_API_KEY");
  if (!base || !key) return { ok: false, notConfigured: true, error: "HN_AI not configured" };
  const paths = ["/v1/audio/speech", "/audio/speech", "/api/tts", "/tts"];
  let lastErr = "no endpoint";
  for (const p of paths) {
    const r = await postJSON(`${base.replace(/\/$/, "")}${p}`, key, {
      model: "hn-tts",
      input: text,
      text,
      voice,
      response_format: "mp3",
    });
    if (r.ok) {
      const ct = r.contentType || "audio/mpeg";
      if (ct.startsWith("audio/") && (r.data as any).base64) {
        return { ok: true, audioBase64: (r.data as any).base64, mime: ct };
      }
      const b64 = (r.data as any)?.audio ?? (r.data as any)?.audio_base64 ?? (r.data as any)?.base64 ?? "";
      if (b64) return { ok: true, audioBase64: b64, mime: "audio/mpeg" };
      lastErr = "no audio in response";
    } else if (r.status && r.status !== 404) {
      return r; // real error, stop trying
    } else {
      lastErr = r.error;
    }
  }
  return { ok: false, error: lastErr };
}

// ────────────────────────────────────────────────────────── site
export async function hnGenerateSite(prompt: string, lang: "ar" | "en"): Promise<HNResult<{ html: string }>> {
  const base = env("HN_SITE_BUILDER_URL");
  const key = env("HN_SITE_BUILDER_API_KEY");
  if (!base || !key) return { ok: false, notConfigured: true, error: "HN_SITE_BUILDER not configured" };
  const r = await postJSON(`${base.replace(/\/$/, "")}/api/build`, key, { prompt, lang, format: "html" });
  if (!r.ok) return r;
  const p: any = r.data;
  const html = (typeof p === "string" ? p : p.html ?? p.output ?? p.data?.html) || "";
  if (!html || !/<html|<!doctype/i.test(html)) return { ok: false, error: "no HTML in response" };
  return { ok: true, html };
}

// ────────────────────────────────────────────────────────── video
export async function hnGenerateVideo(prompt: string): Promise<HNResult<{ videoUrl: string; jobId?: string }>> {
  const base = env("HN_VIDEO_BASE_URL");
  const key = env("HN_STUDIO_API_KEY");
  if (!base || !key) return { ok: false, notConfigured: true, error: "HN_STUDIO not configured" };
  const r = await postJSON(`${base.replace(/\/$/, "")}/api/video`, key, { prompt });
  if (!r.ok) return r;
  const p: any = r.data;
  const videoUrl = p.url ?? p.video_url ?? p.data?.url ?? "";
  const jobId = p.job_id ?? p.id;
  if (!videoUrl && !jobId) return { ok: false, error: "no video in response" };
  return { ok: true, videoUrl, jobId };
}

// ────────────────────────────────────────────────────────── cv
export async function hnBuildCV(prompt: string, lang: "ar" | "en"): Promise<HNResult<{ html: string; pdfUrl?: string }>> {
  const base = env("HN_BUILDCV_BASE_URL");
  const key = env("HN_BUILDCV_API_KEY");
  if (!base || !key) return { ok: false, notConfigured: true, error: "HN_BUILDCV not configured" };
  const r = await postJSON(`${base.replace(/\/$/, "")}/api/cv`, key, { prompt, lang, format: "html" });
  if (!r.ok) return r;
  const p: any = r.data;
  const html = (typeof p === "string" ? p : p.html ?? p.output) || "";
  const pdfUrl = p.pdf_url ?? p.pdfUrl;
  if (!html && !pdfUrl) return { ok: false, error: "no CV in response" };
  return { ok: true, html, pdfUrl };
}

export function hnServicesStatus() {
  return {
    image: Boolean(env("HN_IMAGE_BASE_URL") && env("HN_GENERATIN_API_KEY")),
    ai: Boolean(env("HN_AI_BASE_URL") && env("HN_API_KEY")),
    site: Boolean(env("HN_SITE_BUILDER_URL") && env("HN_SITE_BUILDER_API_KEY")),
    video: Boolean(env("HN_VIDEO_BASE_URL") && env("HN_STUDIO_API_KEY")),
    cv: Boolean(env("HN_BUILDCV_BASE_URL") && env("HN_BUILDCV_API_KEY")),
  };
}

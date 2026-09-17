// عميل محرك نواة على خادم VPS.
// عند ضبط VITE_ENGINE_URL تصبح هذه الواجهة عرضًا فقط: كل إنشاء وتخزين على الخادم.

const BASE = (import.meta.env.VITE_ENGINE_URL as string | undefined)?.replace(/\/$/, "") ?? "";

export function engineEnabled(): boolean {
  return BASE.length > 0;
}

export type EngineAsk =
  | { route: "template"; code: string; answer: string }
  | { route: "model"; answer: string; model?: string; node?: string; sources?: string[] }
  | { route: "tool"; tool: string; result: unknown }
  | { route: "job"; job: EngineJob }
  | { route: "empty"; answer: string };

export type EngineJob = {
  id: string;
  kind: string;
  status: "pending" | "running" | "done" | "failed";
  result?: unknown;
  file_path?: string | null;
  error?: string | null;
};

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  if (!engineEnabled()) throw new Error("لم يُضبط عنوان المحرك");
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`المحرك رد ${res.status}`);
  return (await res.json()) as T;
}

export function engineAsk(text: string, token?: string) {
  return call<EngineAsk>("/v1/ask", {
    method: "POST",
    body: JSON.stringify({ text }),
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
}

export function engineCreateJob(kind: string, input: Record<string, unknown>, token?: string) {
  return call<EngineJob>("/v1/jobs", {
    method: "POST",
    body: JSON.stringify({ kind, input }),
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
}

export function engineGetJob(id: string) {
  return call<EngineJob>(`/v1/jobs/${id}`);
}

/** يتابع المهمة حتى تنتهي ثم يعيد نتيجتها. */
export async function engineWaitJob(id: string, onTick?: (job: EngineJob) => void): Promise<EngineJob> {
  for (let i = 0; i < 600; i += 1) {
    const job = await engineGetJob(id);
    onTick?.(job);
    if (job.status === "done" || job.status === "failed") return job;
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new Error("طالت مدة المهمة");
}

export function engineTemplates() {
  return call<{ templates: Array<{ code: string; title: string; body: string; archived: boolean }> }>("/v1/templates");
}

export function engineSaveTemplate(code: string, title: string, body: string) {
  return call<{ code: string }>(`/v1/templates/${code}`, {
    method: "PUT",
    body: JSON.stringify({ title, body }),
  });
}

export function engineHealth() {
  return call<{ ok: boolean; time: string }>("/v1/health");
}

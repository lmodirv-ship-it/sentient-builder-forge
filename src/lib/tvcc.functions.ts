import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/** ربط النواة بمنصة TVCC — مركز قيادة المواقع (https://agent.hn-dbpro.com) */

const MCP_URL = "https://agent.hn-dbpro.com/mcp";
const TVCC_AUTH = "https://hjiqsrlzgkmhghnwetam.supabase.co/auth/v1";

let cached: { token: string; exp: number } | null = null;

/** الحصول على رمز دخول صالح لمنصة TVCC (تسجيل دخول بالبريد وكلمة السر وتجديد تلقائي). */
async function tvccToken(): Promise<{ ok: true; token: string } | { ok: false; error: string }> {
  const now = Date.now();
  if (cached && cached.exp > now + 60_000) return { ok: true, token: cached.token };

  const direct = process.env["TVCC_ACCESS_TOKEN"];
  if (direct) return { ok: true, token: direct };

  const key = process.env["TVCC_SUPABASE_KEY"];
  const email = process.env["TVCC_EMAIL"];
  const password = process.env["TVCC_PASSWORD"];
  if (!key || !email || !password) return { ok: false, error: "بيانات دخول TVCC غير مضبوطة" };

  const res = await fetch(`${TVCC_AUTH}/token?grant_type=password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}` },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) return { ok: false, error: `تعذر تسجيل الدخول إلى TVCC (${res.status})` };
  const j = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!j.access_token) return { ok: false, error: "لم يصل رمز دخول من TVCC" };
  cached = { token: j.access_token, exp: now + (j.expires_in ?? 3600) * 1000 };
  return { ok: true, token: j.access_token };
}

type McpContent = { type?: string; text?: string };
type McpResult = { content?: McpContent[]; isError?: boolean };

async function callTool(tool: string, args: Record<string, unknown>) {
  const auth = await tvccToken();
  if (!auth.ok) return { ok: false as const, error: auth.error };

  const res = await fetch(MCP_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      Authorization: `Bearer ${auth.token}`,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name: tool, arguments: args },
    }),
  });

  const raw = await res.text();
  if (res.status === 401) {
    cached = null;
    return { ok: false as const, error: "انتهت صلاحية الدخول إلى TVCC" };
  }
  if (!res.ok) return { ok: false as const, error: `تعذر الاتصال بـ TVCC (${res.status})` };

  const body = raw.startsWith("event:") || raw.startsWith("data:")
    ? raw.split("\n").filter((l) => l.startsWith("data:")).map((l) => l.slice(5).trim()).join("")
    : raw;
  let payload: unknown = null;
  try { payload = JSON.parse(body); } catch { return { ok: false as const, error: "رد غير مفهوم من TVCC" }; }

  const obj = payload as { error?: { message?: string }; result?: McpResult };
  if (obj.error) return { ok: false as const, error: obj.error.message ?? "خطأ من TVCC" };
  const text = (obj.result?.content ?? []).map((c) => c.text ?? "").join("\n").trim();
  return { ok: true as const, text };
}

const TOOLS: { re: RegExp; tool: string; args: Record<string, unknown> }[] = [
  { re: /(احصائ|إحصائ|لوحة|ملخص|dashboard)/i, tool: "get_dashboard_stats", args: {} },
  { re: /(سيرفر|خادم|خوادم|server)/i, tool: "list_servers", args: {} },
  { re: /(نطاق|منتهي|انتهاء|domain)/i, tool: "list_expiring_domains", args: { days: 60 } },
  { re: /(مجموع|group)/i, tool: "list_site_groups", args: {} },
  { re: /(ربط|روابط|خدمات متبادلة|service link)/i, tool: "list_service_links", args: {} },
  { re: /(موقع|مواقع|site|website)/i, tool: "list_websites", args: {} },
];

/** هل السؤال موجّه لمنصة TVCC؟ */
export function isTvccQuestion(text: string): boolean {
  if (/tvcc|مركز قيادة/i.test(text)) return true;
  return /(مواقعي|مواقعنا|كم موقع|عدد المواقع|حالة السيرفرات|السيرفرات|النطاقات المنتهية)/i.test(text);
}

/** سؤال النواة لمنصة TVCC وإرجاع الجواب نصاً. */
export const tvccAsk = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ question: z.string().min(1).max(500) }).parse(i))
  .handler(async ({ data }) => {
    const hit = TOOLS.find((t) => t.re.test(data.question));
    if (!hit) return { ok: false as const, error: "لا توجد أداة مطابقة في TVCC" };
    const r = await callTool(hit.tool, hit.args);
    if (!r.ok) return r;
    return { ok: true as const, tool: hit.tool, text: r.text };
  });

/** تنفيذ أداة TVCC مباشرة بالاسم. */
export const tvccTool = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) =>
    z.object({ tool: z.string().min(1), args: z.record(z.string(), z.unknown()).default({}) }).parse(i),
  )
  .handler(async ({ data }) => callTool(data.tool, data.args));

// ربط النواة بقاعدة بيانات منصة TVCC (مركز قيادة المواقع) على نفس الخادم — قراءة فقط.

import pg from "pg";

let pool = null;

function tvccDb() {
  if (!pool) {
    if (!process.env.TVCC_DATABASE_URL) return null;
    pool = new pg.Pool({ connectionString: process.env.TVCC_DATABASE_URL, max: 4, idleTimeoutMillis: 30_000 });
  }
  return pool;
}

async function tq(text, params = []) {
  const p = tvccDb();
  if (!p) return null;
  const res = await p.query(text, params);
  return res.rows;
}

export function isTvccQuestion(text = "") {
  const t = String(text);
  if (/tvcc|مركز قيادة/i.test(t)) return true;
  return /(مواقعي|مواقعنا|كم موقع|عدد المواقع|قائمة المواقع|حالة السيرفرات|السيرفرات|الخوادم|النطاقات المنتهية|مجموعات المواقع)/i.test(t);
}

const HANDLERS = [
  {
    re: /(احصائ|إحصائ|لوحة|ملخص|كم موقع|عدد المواقع|dashboard)/i,
    async run() {
      const rows = await tq(`
        SELECT (SELECT count(*) FROM websites) AS sites,
               (SELECT count(*) FROM websites WHERE is_active) AS active,
               (SELECT count(*) FROM servers) AS servers,
               (SELECT count(*) FROM domains) AS domains,
               (SELECT count(*) FROM site_groups) AS groups`);
      const r = rows?.[0];
      if (!r) return null;
      return `عدد المواقع ${r.sites} منها نشطة ${r.active} وعدد السيرفرات ${r.servers} وعدد النطاقات ${r.domains} وعدد المجموعات ${r.groups}`;
    },
  },
  {
    re: /(سيرفر|خادم|خوادم|server)/i,
    async run() {
      const rows = await tq(`SELECT name, COALESCE(status,'') AS status, COALESCE(os,'') AS os FROM servers ORDER BY name LIMIT 30`);
      if (!rows?.length) return null;
      return rows.map((s) => `${s.name} ${s.status} ${s.os}`.trim()).join("\n");
    },
  },
  {
    re: /(نطاق|منتهي|انتهاء|domain)/i,
    async run() {
      const rows = await tq(
        `SELECT domain, to_char(expires_at,'YYYY-MM-DD') AS exp FROM domains
         WHERE expires_at IS NOT NULL AND expires_at < now() + interval '60 days'
         ORDER BY expires_at LIMIT 30`,
      );
      if (!rows) return null;
      if (!rows.length) return "لا توجد نطاقات تنتهي خلال ستين يوما";
      return rows.map((d) => `${d.domain} ينتهي في ${d.exp}`).join("\n");
    },
  },
  {
    re: /(مجموع|group)/i,
    async run() {
      const rows = await tq(`SELECT name FROM site_groups ORDER BY sort_order NULLS LAST, name LIMIT 60`);
      if (!rows?.length) return null;
      return rows.map((g) => g.name).join("\n");
    },
  },
  {
    re: /(موقع|مواقع|site|website)/i,
    async run() {
      const rows = await tq(
        `SELECT COALESCE(name, domain) AS name, COALESCE(domain,'') AS domain FROM websites ORDER BY created_at DESC LIMIT 40`,
      );
      if (!rows?.length) return null;
      return rows.map((w) => `${w.name} ${w.domain}`.trim()).join("\n");
    },
  },
];

/** جواب النواة عن أسئلة منصة TVCC من قاعدتها مباشرة. */
export async function tvccAnswer(text) {
  if (!tvccDb()) return null;
  const hit = HANDLERS.find((h) => h.re.test(text));
  if (!hit) return null;
  try {
    return await hit.run();
  } catch {
    return null;
  }
}

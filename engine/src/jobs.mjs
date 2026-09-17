// طابور المهام: كل إنشاء وظيفة لها حالة ونتيجة وملف.

import { q, log } from "./db.mjs";
import { writeStoredFile } from "./runtime.mjs";
import { chat } from "./models.mjs";

const HN_BASE = process.env.HN_AI_BASE_URL || "";
const HN_KEY = process.env.HN_API_KEY || "";

async function hn(path, payload) {
  if (!HN_BASE) throw new Error("لم يُضبط عنوان خدمة HN");
  const res = await fetch(`${HN_BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${HN_KEY}` },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`خدمة HN ردت ${res.status}`);
  return res.json();
}

const HANDLERS = {
  image: (input) => hn("/v1/images", { prompt: input.prompt }),
  tts: (input) => hn("/v1/tts", { text: input.text, voice: input.voice }),
  video: (input) => hn("/v1/videos", { prompt: input.prompt }),
  vision: (input) => hn("/v1/vision", { image: input.dataUrl, prompt: input.prompt }),
  cv: (input) => hn("/v1/cv", { data: input.data }),
  site: async (input) => {
    const { text } = await chat({
      model: process.env.CODE_MODEL || process.env.DEFAULT_MODEL || "llama3.1",
      messages: [
        { role: "system", content: "انت مولد مواقع اكتب ملف App.tsx واحد فقط" },
        { role: "user", content: String(input.prompt || "") },
      ],
    });
    const path = `sites/${Date.now()}-App.tsx`;
    await writeStoredFile(path, text);
    return { file: path, code: text };
  },
};

export async function createJob(userId, kind, input) {
  const rows = await q(
    "INSERT INTO jobs (user_id, kind, input) VALUES ($1,$2,$3) RETURNING id, status, kind",
    [userId || null, kind, JSON.stringify(input || {})],
  );
  const job = rows[0];
  runJob(job.id).catch(() => {});
  return job;
}

export async function getJob(id) {
  const rows = await q("SELECT id, kind, status, result, file_path, error, created_at FROM jobs WHERE id = $1", [id]);
  return rows[0] || null;
}

async function runJob(id) {
  const rows = await q("SELECT id, kind, input FROM jobs WHERE id = $1", [id]);
  const job = rows[0];
  if (!job) return;
  const handler = HANDLERS[job.kind];
  await q("UPDATE jobs SET status = 'running', updated_at = now() WHERE id = $1", [id]);

  if (!handler) {
    await q("UPDATE jobs SET status='failed', error=$2, updated_at=now() WHERE id=$1", [id, `نوع غير مدعوم: ${job.kind}`]);
    return;
  }

  try {
    const result = await handler(job.input || {});
    await q("UPDATE jobs SET status='done', result=$2, file_path=$3, updated_at=now() WHERE id=$1", [
      id,
      JSON.stringify(result),
      result?.file || null,
    ]);
    await log("jobs", `اكتملت مهمة ${job.kind}`, { id });
  } catch (error) {
    await q("UPDATE jobs SET status='failed', error=$2, updated_at=now() WHERE id=$1", [id, String(error)]);
    await log("jobs", `فشلت مهمة ${job.kind}`, { id, error: String(error) }, "error");
  }
}

export async function resumePending() {
  const rows = await q("SELECT id FROM jobs WHERE status IN ('pending','running') ORDER BY created_at LIMIT 20");
  for (const r of rows) runJob(r.id).catch(() => {});
}

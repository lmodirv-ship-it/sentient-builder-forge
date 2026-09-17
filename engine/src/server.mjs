// خادم المحرك: نقاط العقد v1 التي تتحدث بها الواجهة وتطبيق الهاتف.

import http from "node:http";
import { readFile } from "node:fs/promises";
import { ask } from "./agent.mjs";
import { createJob, getJob, resumePending } from "./jobs.mjs";
import { listTemplates, saveTemplate, createTemplate } from "./templates.mjs";
import { listTools, runTool } from "./tools.mjs";
import { q, log } from "./db.mjs";

const PORT = Number(process.env.PORT || 8787);
const ORIGIN = process.env.ALLOWED_ORIGIN || "*";

function cors(res) {
  res.setHeader("access-control-allow-origin", ORIGIN);
  res.setHeader("access-control-allow-headers", "content-type, authorization");
  res.setHeader("access-control-allow-methods", "GET, POST, PUT, OPTIONS");
}

function json(res, status, body) {
  cors(res);
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

async function body(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return {};
  }
}

function userOf(req) {
  const auth = req.headers.authorization || "";
  return auth.startsWith("Bearer ") ? auth.slice(7, 60) : null;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;

  if (req.method === "OPTIONS") {
    cors(res);
    res.writeHead(204);
    return res.end();
  }

  try {
    if (path === "/v1/health") return json(res, 200, { ok: true, time: new Date().toISOString() });

    if (path === "/v1/ask" && req.method === "POST") {
      const payload = await body(req);
      const result = await ask({ userId: userOf(req), text: payload.text });
      return json(res, 200, result);
    }

    if (path === "/v1/jobs" && req.method === "POST") {
      const payload = await body(req);
      const job = await createJob(userOf(req), payload.kind, payload.input);
      return json(res, 201, job);
    }

    if (path.startsWith("/v1/jobs/") && req.method === "GET") {
      const job = await getJob(path.split("/")[3]);
      return job ? json(res, 200, job) : json(res, 404, { error: "غير موجود" });
    }

    if (path === "/v1/tools" && req.method === "GET") return json(res, 200, { tools: listTools() });

    if (path.startsWith("/v1/tools/") && path.endsWith("/run") && req.method === "POST") {
      const id = path.split("/")[3];
      const payload = await body(req);
      return json(res, 200, await runTool(id, payload.input || {}));
    }

    if (path === "/v1/templates" && req.method === "GET") return json(res, 200, { templates: await listTemplates() });

    if (path === "/v1/templates" && req.method === "POST") {
      const payload = await body(req);
      return json(res, 201, await createTemplate(payload.title, payload.body, payload.kind));
    }

    if (path.startsWith("/v1/templates/") && req.method === "PUT") {
      const code = path.split("/")[3];
      const payload = await body(req);
      const saved = await saveTemplate(code, payload.title, payload.body);
      return saved ? json(res, 200, saved) : json(res, 404, { error: "غير موجود" });
    }

    if (path === "/v1/admin/overview" && req.method === "GET") {
      const [jobs] = await q("SELECT count(*)::int AS total FROM jobs");
      const [templates] = await q("SELECT count(*)::int AS total FROM templates WHERE archived = FALSE");
      const [memory] = await q("SELECT count(*)::int AS total FROM memory");
      return json(res, 200, { jobs: jobs.total, templates: templates.total, memory: memory.total });
    }

    if (path === "/v1/admin/logs" && req.method === "GET") {
      const rows = await q("SELECT level, area, message, created_at FROM logs ORDER BY created_at DESC LIMIT 200");
      return json(res, 200, { logs: rows });
    }

    return json(res, 404, { error: "نقطة غير موجودة" });
  } catch (error) {
    await log("http", `خطأ في ${path}`, { error: String(error) }, "error");
    return json(res, 500, { error: String(error?.message || error) });
  }
});

server.listen(PORT, () => {
  console.log(`محرك نواة يعمل على المنفذ ${PORT}`);
  resumePending().catch(() => {});
});

export { server, readFile };

// اختيار عقدة النموذج: عدة أجهزة Ollama + بديل من نفس العائلة عند غياب النموذج.

const NODES = (process.env.OLLAMA_NODES || "http://127.0.0.1:11434")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const cache = { at: 0, map: new Map() };

async function tagsOf(node) {
  const res = await fetch(`${node}/api/tags`, { signal: AbortSignal.timeout(4000) });
  if (!res.ok) throw new Error(`عقدة غير متاحة: ${node}`);
  const json = await res.json();
  return (json.models || []).map((m) => m.name);
}

export async function refreshNodes() {
  const map = new Map();
  await Promise.all(
    NODES.map(async (node) => {
      try {
        map.set(node, await tagsOf(node));
      } catch {
        map.set(node, []);
      }
    }),
  );
  cache.map = map;
  cache.at = Date.now();
  return map;
}

async function nodeMap() {
  if (Date.now() - cache.at > 60_000) await refreshNodes();
  return cache.map;
}

export async function pickNode(model) {
  const map = await nodeMap();
  const family = String(model).split(":")[0];

  for (const [node, models] of map) if (models.includes(model)) return { node, model };
  for (const [node, models] of map) {
    const same = models.find((m) => m.startsWith(family));
    if (same) return { node, model: same };
  }
  for (const [node, models] of map) if (models.length) return { node, model: models[0] };
  return null;
}

export async function chat({ model, messages, onToken }) {
  const picked = await pickNode(model || process.env.DEFAULT_MODEL || "llama3.1");
  if (!picked) throw new Error("لا توجد عقدة نماذج متاحة");

  const res = await fetch(`${picked.node}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ model: picked.model, messages, stream: Boolean(onToken) }),
  });
  if (!res.ok) throw new Error(`فشل النموذج: ${res.status}`);

  if (!onToken) {
    const json = await res.json();
    return { text: json.message?.content ?? "", node: picked.node, model: picked.model };
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const piece = JSON.parse(line);
        const chunk = piece.message?.content || "";
        if (chunk) {
          text += chunk;
          onToken(chunk);
        }
      } catch {
        // سطر غير مكتمل
      }
    }
  }
  return { text, node: picked.node, model: picked.model };
}

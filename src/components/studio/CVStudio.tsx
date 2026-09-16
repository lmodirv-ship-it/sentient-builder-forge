import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ResultFeedback } from "@/components/ResultFeedback";
import { FileText, Wand2, Loader2, Download, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { generateCV } from "@/lib/nawat-cv.functions";
import { saveProject } from "@/lib/studio-projects";
import { cacheKey, getCached, setCached } from "@/lib/studio-cache";
import { downloadBlob } from "./shared";
import { VoiceControls } from "@/components/VoiceControls";

function localCVTemplate(prompt: string, lang: "ar" | "en"): string {
  const isAr = lang === "ar";
  const dir = isAr ? "rtl" : "ltr";
  const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
  const lines = prompt.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const fields: Record<string, string> = {};
  for (const l of lines) { const m = /^([^:：]{1,40})[:：]\s*(.+)$/.exec(l); if (m) fields[m[1].trim()] = m[2].trim(); }
  const name = fields[isAr ? "الاسم" : "Name"] || (isAr ? "الاسم الكامل" : "Full Name");
  const role = fields[isAr ? "الوظيفة المستهدفة" : "Role"] || (isAr ? "الوظيفة المستهدفة" : "Target Role");
  const section = (title: string, key: string) => { const v = fields[key]; return v ? `<section><h2>${esc(title)}</h2><p>${esc(v)}</p></section>` : ""; };
  return `<!doctype html><html lang="${lang}" dir="${dir}"><head><meta charset="utf-8"><title>${esc(name)} — CV</title>
<style>body{font-family:system-ui,sans-serif;max-width:820px;margin:2rem auto;padding:2rem;color:#1e293b;line-height:1.7}header{border-bottom:3px solid #10b981;padding-bottom:1rem;margin-bottom:2rem}h1{margin:0;font-size:2.5rem}.role{color:#10b981;font-size:1.25rem;font-weight:600}h2{color:#10b981;border-bottom:1px solid #e2e8f0;font-size:1.125rem}</style></head><body>
<header><h1>${esc(name)}</h1><div class="role">${esc(role)}</div></header>
${section(isAr ? "الخبرات" : "Experience", isAr ? "الخبرات" : "Experience")}
${section(isAr ? "التعليم" : "Education", isAr ? "التعليم" : "Education")}
${section(isAr ? "المهارات" : "Skills", isAr ? "المهارات" : "Skills")}</body></html>`;
}

export default function CVStudio({ online }: { online: boolean }) {
  const runCV = useServerFn(generateCV);
  const [prompt, setPrompt] = useState("");
  const [title, setTitle] = useState("");
  const [lang, setLang] = useState<"ar" | "en">("ar");
  const [html, setHtml] = useState("");
  const [busy, setBusy] = useState(false);
  const [via, setVia] = useState<"hn" | "local" | "">("");
  const [fromCache, setFromCache] = useState(false);

  async function generate() {
    if (prompt.trim().length < 10) return toast.error("أعطني بيانات كافية");
    const key = cacheKey("cv", prompt, lang);
    const c = getCached(key);
    if (c?.html) { setHtml(c.html); setVia(c.via || "local"); setFromCache(true); toast.success("من الكاش — فوري"); return; }
    setBusy(true); setHtml(""); setVia(""); setFromCache(false);
    try {
      if (online) {
        const r: any = await runCV({ data: { prompt, lang } });
        if (r?.html) { setHtml(r.html); setVia("hn"); setCached({ key, kind: "cv", html: r.html, via: "hn" }); toast.success("تم إنشاء السيرة"); return; }
      }
      const t = localCVTemplate(prompt, lang);
      setHtml(t); setVia("local"); setCached({ key, kind: "cv", html: t, via: "local" });
      toast.success("قالب سيرة محلي فوري");
    } catch {
      const t = localCVTemplate(prompt, lang);
      setHtml(t); setVia("local"); setCached({ key, kind: "cv", html: t, via: "local" });
    } finally { setBusy(false); }
  }

  function save() {
    if (!html) return;
    saveProject({ kind: "cv", title: title || "سيرة ذاتية", prompt, lang, via: via || "local", html });
    toast.success("تم حفظ المشروع");
  }

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2"><FileText className="h-5 w-5 text-emerald-500" /><h2 className="font-bold">استوديو السيرة الذاتية</h2></div>
        <Input placeholder="عنوان المشروع (اختياري)" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Textarea rows={8} placeholder="الاسم: ...&#10;الوظيفة المستهدفة: ...&#10;الخبرات: ...&#10;التعليم: ...&#10;المهارات: ... (أو تحدّث)" value={prompt} onChange={(e) => setPrompt(e.target.value)} />
        <VoiceControls onTranscript={(t) => setPrompt((p) => (p ? p + "\n" + t : t))} speakText={prompt} lang={lang} />
        <div className="flex gap-2">
          <Button variant={lang === "ar" ? "default" : "outline"} size="sm" onClick={() => setLang("ar")}>العربية</Button>
          <Button variant={lang === "en" ? "default" : "outline"} size="sm" onClick={() => setLang("en")}>English</Button>
        </div>
        <div className="flex gap-2">
          <Button onClick={generate} disabled={busy} className="flex-1">
            {busy ? <Loader2 className="h-4 w-4 ml-1 animate-spin" /> : <Wand2 className="h-4 w-4 ml-1" />}
            توليد السيرة
          </Button>
          <Button variant="outline" onClick={save} disabled={!html}>حفظ</Button>
          <ResultFeedback intent="cv" prompt={prompt} />
        </div>
        {via && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            {fromCache && <Zap className="h-3 w-3 text-amber-500" />}
            المصدر: {fromCache ? "كاش فوري" : via === "hn" ? "BuildCV AI" : "قالب محلي"}
          </p>
        )}
      </Card>

      <Card className="p-3">
        <div className="flex items-center justify-between mb-2 px-2">
          <span className="text-sm font-medium">المعاينة</span>
          {html && <Button size="sm" variant="ghost" onClick={() => downloadBlob(html, "cv.html", "text/html")}><Download className="h-4 w-4 ml-1" />HTML</Button>}
        </div>
        {html ? (
          <iframe title="cv" srcDoc={html} className="w-full h-[560px] rounded border bg-white" loading="lazy" />
        ) : (
          <div className="h-[560px] flex items-center justify-center text-muted-foreground text-sm">أدخل بياناتك واضغط «توليد السيرة»</div>
        )}
      </Card>
    </div>
  );
}

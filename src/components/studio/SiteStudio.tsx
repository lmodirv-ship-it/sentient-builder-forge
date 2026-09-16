import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ResultFeedback } from "@/components/ResultFeedback";
import { Globe, Wand2, Loader2, Download, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { generateSiteHtml } from "@/lib/nawat-site-design.functions";
import { saveProject, localSiteTemplate } from "@/lib/studio-projects";
import { cacheKey, getCached, setCached } from "@/lib/studio-cache";
import { downloadBlob } from "./shared";
import { VoiceControls } from "@/components/VoiceControls";

export default function SiteStudio({ online }: { online: boolean }) {
  const runSite = useServerFn(generateSiteHtml);
  const [prompt, setPrompt] = useState("");
  const [title, setTitle] = useState("");
  const [lang, setLang] = useState<"ar" | "en">("ar");
  const [html, setHtml] = useState("");
  const [busy, setBusy] = useState(false);
  const [via, setVia] = useState<"hn" | "local" | "">("");
  const [fromCache, setFromCache] = useState(false);

  // Instant preview from cache as user types (debounced).
  useEffect(() => {
    if (prompt.trim().length < 3) return;
    const t = setTimeout(() => {
      const c = getCached(cacheKey("site", prompt, lang));
      if (c?.html && !busy) {
        setHtml(c.html); setVia(c.via || "local"); setFromCache(true);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [prompt, lang, busy]);

  async function generate() {
    if (prompt.trim().length < 3) return toast.error("اكتب وصف الموقع أولًا");
    const key = cacheKey("site", prompt, lang);
    const cached = getCached(key);
    if (cached?.html) {
      setHtml(cached.html); setVia(cached.via || "local"); setFromCache(true);
      toast.success("من الكاش — فوري");
      return;
    }
    setBusy(true); setHtml(""); setVia(""); setFromCache(false);
    try {
      if (online) {
        const r = await runSite({ data: { prompt, lang } });
        if (r.html) {
          setHtml(r.html); setVia("hn");
          setCached({ key, kind: "site", html: r.html, via: "hn" });
          toast.success("تم توليد الموقع");
          return;
        }
      }
      const local = localSiteTemplate(prompt, lang);
      setHtml(local); setVia("local");
      setCached({ key, kind: "site", html: local, via: "local" });
      toast.success("قالب محلي فوري");
    } catch {
      const local = localSiteTemplate(prompt, lang);
      setHtml(local); setVia("local");
      setCached({ key, kind: "site", html: local, via: "local" });
    } finally { setBusy(false); }
  }

  function save() {
    if (!html) return;
    saveProject({ kind: "site", title: title || prompt.slice(0, 60) || "موقع", prompt, lang, via: via || "local", html });
    toast.success("تم حفظ المشروع");
  }

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2"><Globe className="h-5 w-5 text-emerald-500" /><h2 className="font-bold">استوديو المواقع</h2></div>
        <Input placeholder="عنوان المشروع (اختياري)" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Textarea rows={6} placeholder="صف الموقع: الفكرة، الجمهور، الأقسام، والألوان... (أو اضغط «تحدّث»)" value={prompt} onChange={(e) => setPrompt(e.target.value)} />
        <VoiceControls onTranscript={(t) => setPrompt((p) => (p ? p + " " + t : t))} speakText={prompt} lang={lang} />
        <div className="flex gap-2">
          <Button variant={lang === "ar" ? "default" : "outline"} size="sm" onClick={() => setLang("ar")}>العربية</Button>
          <Button variant={lang === "en" ? "default" : "outline"} size="sm" onClick={() => setLang("en")}>English</Button>
        </div>
        <div className="flex gap-2">
          <Button onClick={generate} disabled={busy} className="flex-1">
            {busy ? <Loader2 className="h-4 w-4 ml-1 animate-spin" /> : <Wand2 className="h-4 w-4 ml-1" />}
            توليد الموقع
          </Button>
          <Button variant="outline" onClick={save} disabled={!html}>حفظ</Button>
          <ResultFeedback intent="site" prompt={prompt} />
        </div>
        {via && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            {fromCache && <Zap className="h-3 w-3 text-amber-500" />}
            المصدر: {fromCache ? "كاش فوري" : via === "hn" ? "HN Site Builder" : "قالب محلي"}
          </p>
        )}
      </Card>

      <Card className="p-3 overflow-hidden">
        <div className="flex items-center justify-between mb-2 px-2">
          <span className="text-sm font-medium">معاينة حية</span>
          {html && <Button size="sm" variant="ghost" onClick={() => downloadBlob(html, "site.html", "text/html")}><Download className="h-4 w-4 ml-1" />HTML</Button>}
        </div>
        {html ? (
          <iframe title="preview" srcDoc={html} className="w-full h-[560px] rounded border bg-white" sandbox="allow-scripts" loading="lazy" />
        ) : (
          <div className="h-[560px] flex items-center justify-center text-muted-foreground text-sm">اكتب وصفًا واضغط «توليد الموقع»</div>
        )}
      </Card>
    </div>
  );
}

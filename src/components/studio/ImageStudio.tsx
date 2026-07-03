import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Image as ImageIcon, Wand2, Loader2, Download, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { generateImage } from "@/lib/nawat-image.functions";
import { saveProject, localImageSVG } from "@/lib/studio-projects";
import { cacheKey, getCached, setCached } from "@/lib/studio-cache";
import { VoiceControls } from "@/components/VoiceControls";

export default function ImageStudio({ online }: { online: boolean }) {
  const runImage = useServerFn(generateImage);
  const [prompt, setPrompt] = useState("");
  const [title, setTitle] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [via, setVia] = useState<"hn" | "local" | "">("");
  const [kind, setKind] = useState<"image" | "logo">("image");
  const [fromCache, setFromCache] = useState(false);

  async function generate() {
    if (prompt.trim().length < 3) return toast.error("اكتب وصف الصورة أولًا");
    const key = cacheKey(kind, prompt);
    const c = getCached(key);
    if (c?.imageUrl) {
      setImageUrl(c.imageUrl); setVia(c.via || "local"); setFromCache(true);
      toast.success("من الكاش — فوري"); return;
    }
    setBusy(true); setImageUrl(""); setVia(""); setFromCache(false);
    try {
      if (online) {
        const r = await runImage({ data: { prompt } });
        if (r.imageUrl) {
          setImageUrl(r.imageUrl); setVia("hn");
          setCached({ key, kind, imageUrl: r.imageUrl, via: "hn" });
          toast.success("تم توليد الصورة");
          return;
        }
      }
      const svg = localImageSVG(prompt);
      setImageUrl(svg); setVia("local");
      setCached({ key, kind, imageUrl: svg, via: "local" });
      toast.success("صورة محلية فورية");
    } catch {
      const svg = localImageSVG(prompt);
      setImageUrl(svg); setVia("local");
      setCached({ key, kind, imageUrl: svg, via: "local" });
    } finally { setBusy(false); }
  }

  function save() {
    if (!imageUrl) return;
    saveProject({ kind, title: title || prompt.slice(0, 60) || (kind === "logo" ? "شعار" : "صورة"), prompt, lang: "ar", via: via || "local", imageUrl, thumbnail: imageUrl });
    toast.success("تم حفظ المشروع");
  }

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2"><ImageIcon className="h-5 w-5 text-emerald-500" /><h2 className="font-bold">استوديو الصور والشعارات</h2></div>
        <div className="flex gap-2">
          <Button variant={kind === "image" ? "default" : "outline"} size="sm" onClick={() => setKind("image")}>صورة</Button>
          <Button variant={kind === "logo" ? "default" : "outline"} size="sm" onClick={() => setKind("logo")}>شعار</Button>
        </div>
        <Input placeholder="عنوان المشروع (اختياري)" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Textarea rows={5} placeholder={kind === "logo" ? "شعار لـ ... (أو تحدّث)" : "وصف الصورة (أو تحدّث)"} value={prompt} onChange={(e) => setPrompt(e.target.value)} />
        <VoiceControls onTranscript={(t) => setPrompt((p) => (p ? p + " " + t : t))} speakText={prompt} lang="ar" />
        <div className="flex gap-2">
          <Button onClick={generate} disabled={busy} className="flex-1">
            {busy ? <Loader2 className="h-4 w-4 ml-1 animate-spin" /> : <Wand2 className="h-4 w-4 ml-1" />}
            توليد
          </Button>
          <Button variant="outline" onClick={save} disabled={!imageUrl}>حفظ</Button>
        </div>
        {via && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            {fromCache && <Zap className="h-3 w-3 text-amber-500" />}
            المصدر: {fromCache ? "كاش فوري" : via === "hn" ? "HN AI Generation" : "مولد SVG محلي"}
          </p>
        )}
      </Card>

      <Card className="p-3">
        <div className="flex items-center justify-between mb-2 px-2">
          <span className="text-sm font-medium">المعاينة</span>
          {imageUrl && <a href={imageUrl} download={`nawat-${kind}.png`} className="text-xs inline-flex items-center gap-1 text-emerald-600"><Download className="h-3 w-3" />تنزيل</a>}
        </div>
        {imageUrl ? (
          <img src={imageUrl} alt="preview" loading="lazy" className="w-full rounded border aspect-square object-cover bg-muted" />
        ) : (
          <div className="aspect-square flex items-center justify-center text-muted-foreground text-sm">اكتب وصفًا واضغط «توليد»</div>
        )}
      </Card>
    </div>
  );
}

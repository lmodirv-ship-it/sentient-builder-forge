import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Film, Wand2, Loader2, ExternalLink, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { generateVideo } from "@/lib/nawat-video.functions";
import { saveProject, localVideoPreview } from "@/lib/studio-projects";
import { cacheKey, getCached, setCached } from "@/lib/studio-cache";
import { VoiceControls } from "@/components/VoiceControls";

export default function VideoStudio({ online }: { online: boolean }) {
  const runVideo = useServerFn(generateVideo);
  const [prompt, setPrompt] = useState("");
  const [title, setTitle] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [poster, setPoster] = useState("");
  const [busy, setBusy] = useState(false);
  const [via, setVia] = useState<"hn" | "local" | "">("");
  const [fromCache, setFromCache] = useState(false);

  async function generate() {
    if (prompt.trim().length < 3) return toast.error("اكتب وصف الفيديو أولًا");
    const key = cacheKey("video", prompt);
    const c = getCached(key);
    if (c && (c.videoUrl || c.poster)) {
      setVideoUrl(c.videoUrl || ""); setPoster(c.poster || ""); setVia(c.via || "local"); setFromCache(true);
      toast.success("من الكاش — فوري");
      return;
    }
    setBusy(true); setVideoUrl(""); setPoster(""); setVia(""); setFromCache(false);
    try {
      if (online) {
        const r = await runVideo({ data: { prompt } });
        if (r.videoUrl) {
          setVideoUrl(r.videoUrl); setVia("hn");
          setCached({ key, kind: "video", videoUrl: r.videoUrl, via: "hn" });
          toast.success("تم توليد الفيديو");
          return;
        }
      }
      const p = localVideoPreview(prompt);
      setPoster(p); setVia("local");
      setCached({ key, kind: "video", poster: p, via: "local" });
      toast.success("معاينة محلية فورية");
    } catch {
      const p = localVideoPreview(prompt);
      setPoster(p); setVia("local");
      setCached({ key, kind: "video", poster: p, via: "local" });
    } finally { setBusy(false); }
  }

  function save() {
    if (!videoUrl && !poster) return;
    saveProject({ kind: "video", title: title || prompt.slice(0, 60) || "فيديو", prompt, lang: "ar", via: via || "local", videoUrl: videoUrl || "", thumbnail: poster });
    toast.success("تم حفظ المشروع");
  }

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2"><Film className="h-5 w-5 text-emerald-500" /><h2 className="font-bold">استوديو الفيديو</h2></div>
        <Input placeholder="عنوان المشروع (اختياري)" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Textarea rows={6} placeholder="صف الفيديو: الموضوع، النبرة، المدة، المشاهد... (أو اضغط «تحدّث»)" value={prompt} onChange={(e) => setPrompt(e.target.value)} />
        <VoiceControls onTranscript={(t) => setPrompt((p) => (p ? p + " " + t : t))} speakText={prompt} lang="ar" />
        <div className="flex gap-2">
          <Button onClick={generate} disabled={busy} className="flex-1">
            {busy ? <Loader2 className="h-4 w-4 ml-1 animate-spin" /> : <Wand2 className="h-4 w-4 ml-1" />}
            توليد الفيديو
          </Button>
          <Button variant="outline" onClick={save} disabled={!videoUrl && !poster}>حفظ</Button>
        </div>
        {via && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            {fromCache && <Zap className="h-3 w-3 text-amber-500" />}
            المصدر: {fromCache ? "كاش فوري" : via === "hn" ? "HN Video Studio" : "معاينة محلية"}
          </p>
        )}
      </Card>

      <Card className="p-3">
        <div className="flex items-center justify-between mb-2 px-2">
          <span className="text-sm font-medium">المعاينة</span>
          {videoUrl && <a href={videoUrl} target="_blank" rel="noreferrer" className="text-xs inline-flex items-center gap-1 text-emerald-600"><ExternalLink className="h-3 w-3" />فتح</a>}
        </div>
        {videoUrl ? (
          <video src={videoUrl} controls poster={poster} preload="metadata" className="w-full rounded border bg-black aspect-video" />
        ) : poster ? (
          <img src={poster} alt="preview" loading="lazy" className="w-full rounded border aspect-video object-cover" />
        ) : (
          <div className="h-[315px] flex items-center justify-center text-muted-foreground text-sm">اكتب وصفًا واضغط «توليد الفيديو»</div>
        )}
      </Card>
    </div>
  );
}

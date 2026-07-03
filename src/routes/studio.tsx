import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Sparkles, Globe, Film, Image as ImageIcon, FileText, FolderOpen,
  Download, Trash2, Loader2, Wand2, ArrowLeft, ExternalLink, RefreshCw, Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

import { generateImage } from "@/lib/nawat-image.functions";
import { generateSiteHtml } from "@/lib/nawat-site-design.functions";
import { generateVideo } from "@/lib/nawat-video.functions";
import { generateCV } from "@/lib/nawat-cv.functions";
import {
  listProjects, saveProject, deleteProject, downloadProject,
  localSiteTemplate, localImageSVG, localVideoPreview,
  type StudioProject, type StudioKind,
} from "@/lib/studio-projects";

export const Route = createFileRoute("/studio")({
  head: () => ({
    meta: [
      { title: "استوديو نواة — Nawat Studio" },
      { name: "description", content: "استوديو موحّد لتصميم المواقع والفيديو والصور والسيرة الذاتية — يعمل هجينًا (محلي + HN)." },
      { property: "og:title", content: "استوديو نواة — Nawat Studio" },
      { property: "og:description", content: "لوحة موحّدة لكل استوديوهات نواة." },
    ],
  }),
  component: StudioPage,
});

type TabKey = "sites" | "videos" | "images" | "cv" | "projects";

function StudioPage() {
  const [tab, setTab] = useState<TabKey>("sites");
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20" dir="rtl">
      <header className="border-b bg-background/80 backdrop-blur sticky top-0 z-20">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-3">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> الرئيسية
          </Link>
          <div className="flex items-center gap-2 mr-auto">
            <Sparkles className="h-5 w-5 text-emerald-500" />
            <h1 className="font-bold text-lg">استوديو نواة</h1>
          </div>
          <Badge variant={online ? "default" : "secondary"} className={online ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" : "bg-amber-500/15 text-amber-600 border-amber-500/30"}>
            {online ? "متصل — هجين ذكي" : "دون اتصال — محلي فقط"}
          </Badge>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
          <TabsList className="grid grid-cols-5 mb-6 w-full max-w-3xl mx-auto">
            <TabsTrigger value="sites"><Globe className="h-4 w-4 ml-1" />مواقع</TabsTrigger>
            <TabsTrigger value="videos"><Film className="h-4 w-4 ml-1" />فيديو</TabsTrigger>
            <TabsTrigger value="images"><ImageIcon className="h-4 w-4 ml-1" />صور</TabsTrigger>
            <TabsTrigger value="cv"><FileText className="h-4 w-4 ml-1" />سيرة</TabsTrigger>
            <TabsTrigger value="projects"><FolderOpen className="h-4 w-4 ml-1" />مشاريعي</TabsTrigger>
          </TabsList>

          <TabsContent value="sites"><SiteStudio online={online} /></TabsContent>
          <TabsContent value="videos"><VideoStudio online={online} /></TabsContent>
          <TabsContent value="images"><ImageStudio online={online} /></TabsContent>
          <TabsContent value="cv"><CVStudio online={online} /></TabsContent>
          <TabsContent value="projects"><ProjectsList onOpen={(p) => setTab(kindToTab(p.kind))} /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function kindToTab(k: StudioKind): TabKey {
  return k === "site" ? "sites" : k === "video" ? "videos" : k === "cv" ? "cv" : "images";
}

// ═════════════════════════════════ Sites ═════════════════════════════════
function SiteStudio({ online }: { online: boolean }) {
  const runSite = useServerFn(generateSiteHtml);
  const [prompt, setPrompt] = useState("");
  const [title, setTitle] = useState("");
  const [lang, setLang] = useState<"ar" | "en">("ar");
  const [html, setHtml] = useState("");
  const [busy, setBusy] = useState(false);
  const [via, setVia] = useState<"hn" | "local" | "">("");

  async function generate() {
    if (prompt.trim().length < 3) return toast.error("اكتب وصف الموقع أولًا");
    setBusy(true); setHtml(""); setVia("");
    try {
      if (online) {
        const r = await runSite({ data: { prompt, lang } });
        if (r.html) {
          setHtml(r.html); setVia("hn");
          toast.success("تم توليد الموقع عبر HN");
          return;
        }
        toast.message("HN غير متاح — استخدام قالب محلي");
      }
      const local = localSiteTemplate(prompt, lang);
      setHtml(local); setVia("local");
      toast.success("تم توليد قالب محلي أوفلاين");
    } catch (e: any) {
      const local = localSiteTemplate(prompt, lang);
      setHtml(local); setVia("local");
      toast.warning("فشل HN — تم استخدام قالب محلي");
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
        <Textarea
          rows={6}
          placeholder="صف الموقع: الفكرة، الجمهور، الأقسام، والألوان..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
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
        </div>
        {via && <p className="text-xs text-muted-foreground">المصدر: {via === "hn" ? "HN Site Builder" : "قالب محلي (أوفلاين)"}</p>}
      </Card>

      <Card className="p-3 overflow-hidden">
        <div className="flex items-center justify-between mb-2 px-2">
          <span className="text-sm font-medium">معاينة حية</span>
          {html && <Button size="sm" variant="ghost" onClick={() => downloadBlob(html, "site.html", "text/html")}><Download className="h-4 w-4 ml-1" />HTML</Button>}
        </div>
        {html ? (
          <iframe title="preview" srcDoc={html} className="w-full h-[560px] rounded border bg-white" sandbox="allow-scripts" />
        ) : (
          <div className="h-[560px] flex items-center justify-center text-muted-foreground text-sm">اكتب وصفًا واضغط «توليد الموقع»</div>
        )}
      </Card>
    </div>
  );
}

// ═════════════════════════════════ Videos ═════════════════════════════════
function VideoStudio({ online }: { online: boolean }) {
  const runVideo = useServerFn(generateVideo);
  const [prompt, setPrompt] = useState("");
  const [title, setTitle] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [poster, setPoster] = useState("");
  const [busy, setBusy] = useState(false);
  const [via, setVia] = useState<"hn" | "local" | "">("");

  async function generate() {
    if (prompt.trim().length < 3) return toast.error("اكتب وصف الفيديو أولًا");
    setBusy(true); setVideoUrl(""); setPoster(""); setVia("");
    try {
      if (online) {
        const r = await runVideo({ data: { prompt } });
        if (r.videoUrl) {
          setVideoUrl(r.videoUrl); setVia("hn");
          toast.success("تم توليد الفيديو عبر HN");
          return;
        }
        toast.message("HN غير متاح — إنشاء معاينة محلية");
      }
      setPoster(localVideoPreview(prompt));
      setVia("local");
      toast.success("تم إنشاء معاينة محلية (Storyboard)");
    } catch {
      setPoster(localVideoPreview(prompt));
      setVia("local");
      toast.warning("فشل HN — تم إنشاء معاينة محلية");
    } finally { setBusy(false); }
  }

  function save() {
    if (!videoUrl && !poster) return;
    saveProject({
      kind: "video",
      title: title || prompt.slice(0, 60) || "فيديو",
      prompt, lang: "ar",
      via: via || "local",
      videoUrl: videoUrl || "",
      thumbnail: poster,
    });
    toast.success("تم حفظ المشروع");
  }

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2"><Film className="h-5 w-5 text-emerald-500" /><h2 className="font-bold">استوديو الفيديو</h2></div>
        <Input placeholder="عنوان المشروع (اختياري)" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Textarea
          rows={6}
          placeholder="صف الفيديو: الموضوع، النبرة، المدة، اللغة، والمشاهد الرئيسية..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
        <div className="flex gap-2">
          <Button onClick={generate} disabled={busy} className="flex-1">
            {busy ? <Loader2 className="h-4 w-4 ml-1 animate-spin" /> : <Wand2 className="h-4 w-4 ml-1" />}
            توليد الفيديو
          </Button>
          <Button variant="outline" onClick={save} disabled={!videoUrl && !poster}>حفظ</Button>
        </div>
        {via && <p className="text-xs text-muted-foreground">المصدر: {via === "hn" ? "HN Video Studio" : "معاينة محلية (أوفلاين)"}</p>}
      </Card>

      <Card className="p-3">
        <div className="flex items-center justify-between mb-2 px-2">
          <span className="text-sm font-medium">المعاينة</span>
          {videoUrl && <a href={videoUrl} target="_blank" rel="noreferrer" className="text-xs inline-flex items-center gap-1 text-emerald-600"><ExternalLink className="h-3 w-3" />فتح</a>}
        </div>
        {videoUrl ? (
          <video src={videoUrl} controls poster={poster} className="w-full rounded border bg-black aspect-video" />
        ) : poster ? (
          <img src={poster} alt="preview" className="w-full rounded border aspect-video object-cover" />
        ) : (
          <div className="h-[315px] flex items-center justify-center text-muted-foreground text-sm">اكتب وصفًا واضغط «توليد الفيديو»</div>
        )}
      </Card>
    </div>
  );
}

// ═════════════════════════════════ Images ═════════════════════════════════
function ImageStudio({ online }: { online: boolean }) {
  const runImage = useServerFn(generateImage);
  const [prompt, setPrompt] = useState("");
  const [title, setTitle] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [via, setVia] = useState<"hn" | "local" | "">("");
  const [kind, setKind] = useState<"image" | "logo">("image");

  async function generate() {
    if (prompt.trim().length < 3) return toast.error("اكتب وصف الصورة أولًا");
    setBusy(true); setImageUrl(""); setVia("");
    try {
      if (online) {
        const r = await runImage({ data: { prompt } });
        if (r.imageUrl) {
          setImageUrl(r.imageUrl); setVia("hn");
          toast.success("تم توليد الصورة عبر HN");
          return;
        }
        toast.message("HN غير متاح — استخدام مولد محلي");
      }
      setImageUrl(localImageSVG(prompt));
      setVia("local");
      toast.success("تم إنشاء صورة SVG محلية");
    } catch {
      setImageUrl(localImageSVG(prompt));
      setVia("local");
    } finally { setBusy(false); }
  }

  function save() {
    if (!imageUrl) return;
    saveProject({
      kind, title: title || prompt.slice(0, 60) || (kind === "logo" ? "شعار" : "صورة"),
      prompt, lang: "ar", via: via || "local", imageUrl, thumbnail: imageUrl,
    });
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
        <Textarea
          rows={5}
          placeholder={kind === "logo" ? "شعار لـ ... (الاسم، المجال، الألوان، النبرة)" : "وصف الصورة (المشهد، الأسلوب، الألوان)"}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
        <div className="flex gap-2">
          <Button onClick={generate} disabled={busy} className="flex-1">
            {busy ? <Loader2 className="h-4 w-4 ml-1 animate-spin" /> : <Wand2 className="h-4 w-4 ml-1" />}
            توليد
          </Button>
          <Button variant="outline" onClick={save} disabled={!imageUrl}>حفظ</Button>
        </div>
        {via && <p className="text-xs text-muted-foreground">المصدر: {via === "hn" ? "HN AI Generation" : "مولد SVG محلي (أوفلاين)"}</p>}
      </Card>

      <Card className="p-3">
        <div className="flex items-center justify-between mb-2 px-2">
          <span className="text-sm font-medium">المعاينة</span>
          {imageUrl && <a href={imageUrl} download={`nawat-${kind}.png`} className="text-xs inline-flex items-center gap-1 text-emerald-600"><Download className="h-3 w-3" />تنزيل</a>}
        </div>
        {imageUrl ? (
          <img src={imageUrl} alt="preview" className="w-full rounded border aspect-square object-cover bg-muted" />
        ) : (
          <div className="aspect-square flex items-center justify-center text-muted-foreground text-sm">اكتب وصفًا واضغط «توليد»</div>
        )}
      </Card>
    </div>
  );
}

// ═════════════════════════════════ CV ═════════════════════════════════
function CVStudio({ online }: { online: boolean }) {
  const runCV = useServerFn(generateCV);
  const [prompt, setPrompt] = useState("");
  const [title, setTitle] = useState("");
  const [lang, setLang] = useState<"ar" | "en">("ar");
  const [html, setHtml] = useState("");
  const [busy, setBusy] = useState(false);
  const [via, setVia] = useState<"hn" | "local" | "">("");

  async function generate() {
    if (prompt.trim().length < 10) return toast.error("أعطني بيانات كافية: الاسم، الوظيفة، الخبرات...");
    setBusy(true); setHtml(""); setVia("");
    try {
      if (online) {
        const r: any = await runCV({ data: { prompt, lang } });
        if (r?.html) { setHtml(r.html); setVia("hn"); toast.success("تم إنشاء السيرة عبر HN"); return; }
        toast.message("HN غير متاح — استخدام قالب محلي");
      }
      setHtml(localCVTemplate(prompt, lang)); setVia("local");
      toast.success("تم إنشاء سيرة بقالب محلي أوفلاين");
    } catch {
      setHtml(localCVTemplate(prompt, lang)); setVia("local");
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
        <Textarea
          rows={8}
          placeholder="الاسم: ...&#10;الوظيفة المستهدفة: ...&#10;الخبرات: ...&#10;التعليم: ...&#10;المهارات: ..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
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
        </div>
        {via && <p className="text-xs text-muted-foreground">المصدر: {via === "hn" ? "BuildCV AI" : "قالب محلي (أوفلاين)"}</p>}
      </Card>

      <Card className="p-3">
        <div className="flex items-center justify-between mb-2 px-2">
          <span className="text-sm font-medium">المعاينة</span>
          {html && <Button size="sm" variant="ghost" onClick={() => downloadBlob(html, "cv.html", "text/html")}><Download className="h-4 w-4 ml-1" />HTML</Button>}
        </div>
        {html ? (
          <iframe title="cv" srcDoc={html} className="w-full h-[560px] rounded border bg-white" />
        ) : (
          <div className="h-[560px] flex items-center justify-center text-muted-foreground text-sm">أدخل بياناتك واضغط «توليد السيرة»</div>
        )}
      </Card>
    </div>
  );
}

// ═════════════════════════════════ Projects ═════════════════════════════════
function ProjectsList({ onOpen }: { onOpen: (p: StudioProject) => void }) {
  const [items, setItems] = useState<StudioProject[]>([]);
  const [filter, setFilter] = useState<"all" | StudioKind>("all");
  const [tick, setTick] = useState(0);

  useEffect(() => { setItems(listProjects()); }, [tick]);

  const shown = useMemo(
    () => filter === "all" ? items : items.filter((p) => p.kind === filter),
    [items, filter]
  );

  function remove(id: string) {
    if (!confirm("حذف هذا المشروع؟")) return;
    deleteProject(id);
    setTick((t) => t + 1);
    toast.success("تم الحذف");
  }

  const filters: Array<{ key: "all" | StudioKind; label: string }> = [
    { key: "all", label: "الكل" },
    { key: "site", label: "مواقع" },
    { key: "video", label: "فيديو" },
    { key: "image", label: "صور" },
    { key: "logo", label: "شعارات" },
    { key: "cv", label: "سيرة" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {filters.map((f) => (
          <Button key={f.key} size="sm" variant={filter === f.key ? "default" : "outline"} onClick={() => setFilter(f.key)}>
            {f.label}
          </Button>
        ))}
        <Button size="sm" variant="ghost" className="mr-auto" onClick={() => setTick((t) => t + 1)}>
          <RefreshCw className="h-4 w-4 ml-1" />تحديث
        </Button>
      </div>

      {shown.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">
          <FolderOpen className="h-10 w-10 mx-auto mb-2 opacity-50" />
          لا مشاريع محفوظة بعد. ابدأ من أحد الاستوديوهات أعلاه واضغط «حفظ».
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {shown.map((p) => (
            <Card key={p.id} className="overflow-hidden group">
              <div className="aspect-video bg-muted flex items-center justify-center overflow-hidden">
                {p.thumbnail || p.imageUrl ? (
                  <img src={p.thumbnail || p.imageUrl} alt="" className="w-full h-full object-cover" />
                ) : p.html ? (
                  <iframe title={p.id} srcDoc={p.html} className="w-full h-full pointer-events-none scale-[0.6] origin-top-left" style={{ width: "166%", height: "166%" }} />
                ) : (
                  <span className="text-muted-foreground text-sm">{kindLabel(p.kind)}</span>
                )}
              </div>
              <div className="p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <h3 className="font-semibold text-sm line-clamp-1 flex-1">{p.title}</h3>
                  <Badge variant="secondary" className="text-[10px]">{kindLabel(p.kind)}</Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{p.prompt}</p>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>{new Date(p.updatedAt).toLocaleString("ar")}</span>
                  <span>{p.via === "hn" ? "HN" : "محلي"}</span>
                </div>
                <div className="flex gap-1 pt-1">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => downloadProject(p)}>
                    <Download className="h-3 w-3 ml-1" />تنزيل
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(p.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function kindLabel(k: StudioKind): string {
  return { site: "موقع", video: "فيديو", image: "صورة", logo: "شعار", cv: "سيرة", audio: "صوت" }[k];
}

function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ── Local CV template ──────────────────────────────────────────────────────
function localCVTemplate(prompt: string, lang: "ar" | "en"): string {
  const isAr = lang === "ar";
  const dir = isAr ? "rtl" : "ltr";
  const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
  // Naive parse of key: value lines
  const lines = prompt.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const fields: Record<string, string> = {};
  for (const l of lines) {
    const m = /^([^:：]{1,40})[:：]\s*(.+)$/.exec(l);
    if (m) fields[m[1].trim()] = m[2].trim();
  }
  const name = fields[isAr ? "الاسم" : "Name"] || fields["Name"] || fields["الاسم"] || (isAr ? "الاسم الكامل" : "Full Name");
  const role = fields[isAr ? "الوظيفة المستهدفة" : "Role"] || fields["Role"] || (isAr ? "الوظيفة المستهدفة" : "Target Role");
  const section = (title: string, key: string) => {
    const v = fields[key];
    if (!v) return "";
    return `<section><h2>${esc(title)}</h2><p>${esc(v)}</p></section>`;
  };
  return `<!doctype html><html lang="${lang}" dir="${dir}"><head><meta charset="utf-8">
<title>${esc(name)} — CV</title>
<style>
  body{font-family:'Segoe UI',Tahoma,system-ui,sans-serif;max-width:820px;margin:2rem auto;padding:2rem;color:#1e293b;line-height:1.7}
  header{border-bottom:3px solid #10b981;padding-bottom:1rem;margin-bottom:2rem}
  h1{margin:0;font-size:2.5rem;color:#0f172a}
  .role{color:#10b981;font-size:1.25rem;font-weight:600;margin-top:.25rem}
  section{margin:1.5rem 0}
  h2{color:#10b981;border-bottom:1px solid #e2e8f0;padding-bottom:.25rem;font-size:1.125rem}
  @media print{body{margin:0;padding:1rem}}
</style></head><body>
<header><h1>${esc(name)}</h1><div class="role">${esc(role)}</div></header>
${section(isAr ? "الخبرات" : "Experience", isAr ? "الخبرات" : "Experience")}
${section(isAr ? "التعليم" : "Education", isAr ? "التعليم" : "Education")}
${section(isAr ? "المهارات" : "Skills", isAr ? "المهارات" : "Skills")}
${section(isAr ? "لغات" : "Languages", isAr ? "لغات" : "Languages")}
${section(isAr ? "روابط" : "Links", isAr ? "روابط" : "Links")}
</body></html>`;
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Sparkles, Globe, Film, Image as ImageIcon, FileText, FolderOpen,
  Download, Trash2, Loader2, ArrowLeft, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  listProjects, deleteProject, downloadProject,
  type StudioProject, type StudioKind,
} from "@/lib/studio-projects";
import { startBackgroundAgent, getAgentStatus } from "@/lib/background-agent";
import { kindLabel } from "@/components/studio/shared";
import { DevEnginePanel } from "@/components/DevEnginePanel";

// Lazy-load each studio tab so only the visible one is downloaded/parsed.
const SiteStudio = lazy(() => import("@/components/studio/SiteStudio"));
const VideoStudio = lazy(() => import("@/components/studio/VideoStudio"));
const ImageStudio = lazy(() => import("@/components/studio/ImageStudio"));
const CVStudio = lazy(() => import("@/components/studio/CVStudio"));

export const Route = createFileRoute("/studio")({
  head: () => ({
    meta: [
      { title: "استوديو نواة — Nawat Studio" },
      { name: "description", content: "استوديو موحّد لتصميم المواقع والفيديو والصور والسيرة الذاتية — كاش فوري + تحميل تدريجي." },
      { property: "og:title", content: "استوديو نواة — Nawat Studio" },
      { property: "og:description", content: "لوحة موحّدة لكل استوديوهات نواة." },
      { property: "og:url", content: "https://chat.hn-chat.com/studio" },
    ],
    links: [{ rel: "canonical", href: "https://chat.hn-chat.com/studio" }],
  }),
  component: StudioPage,
});

type TabKey = "sites" | "videos" | "images" | "cv" | "projects";

// Prefetch a lazy chunk on hover / focus — makes tab switches feel instant.
const prefetchers: Record<TabKey, () => Promise<unknown>> = {
  sites: () => import("@/components/studio/SiteStudio"),
  videos: () => import("@/components/studio/VideoStudio"),
  images: () => import("@/components/studio/ImageStudio"),
  cv: () => import("@/components/studio/CVStudio"),
  projects: () => Promise.resolve(),
};

function StudioPage() {
  const [tab, setTab] = useState<TabKey>("sites");
  const [online, setOnline] = useState(true); // real value set after mount (SSR-safe)
  const [agentTick, setAgentTick] = useState(0);

  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    // Kick off the self-healing background agent once per session.
    startBackgroundAgent();
    const t = setInterval(() => setAgentTick((x) => x + 1), 3000);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
      clearInterval(t);
    };
  }, []);

  const agent = useMemo(() => getAgentStatus(), [agentTick]);

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
          <Badge variant="secondary" className="bg-sky-500/15 text-sky-600 border-sky-500/30" title={`الوكيل الخلفي: ${agent.queued} في الانتظار · ${agent.healed} إصلاحات ذاتية`}>
            وكيل خلفي • {agent.queued}/{agent.healed}
          </Badge>
          <Badge variant={online ? "default" : "secondary"} className={online ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" : "bg-amber-500/15 text-amber-600 border-amber-500/30"}>
            {online ? "متصل — هجين ذكي" : "دون اتصال — محلي فقط"}
          </Badge>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
          <TabsList className="grid grid-cols-5 mb-6 w-full max-w-3xl mx-auto">
            {(["sites", "videos", "images", "cv", "projects"] as TabKey[]).map((k) => (
              <TabsTrigger
                key={k}
                value={k}
                onMouseEnter={() => prefetchers[k]()}
                onFocus={() => prefetchers[k]()}
              >
                {k === "sites" && <><Globe className="h-4 w-4 ml-1" />مواقع</>}
                {k === "videos" && <><Film className="h-4 w-4 ml-1" />فيديو</>}
                {k === "images" && <><ImageIcon className="h-4 w-4 ml-1" />صور</>}
                {k === "cv" && <><FileText className="h-4 w-4 ml-1" />سيرة</>}
                {k === "projects" && <><FolderOpen className="h-4 w-4 ml-1" />مشاريعي</>}
              </TabsTrigger>
            ))}
          </TabsList>

          <Suspense fallback={<TabFallback />}>
            <TabsContent value="sites" forceMount={tab === "sites" ? true : undefined} hidden={tab !== "sites"}>
              {tab === "sites" && <SiteStudio online={online} />}
            </TabsContent>
            <TabsContent value="videos" hidden={tab !== "videos"}>
              {tab === "videos" && <VideoStudio online={online} />}
            </TabsContent>
            <TabsContent value="images" hidden={tab !== "images"}>
              {tab === "images" && <ImageStudio online={online} />}
            </TabsContent>
            <TabsContent value="cv" hidden={tab !== "cv"}>
              {tab === "cv" && <CVStudio online={online} />}
            </TabsContent>
            <TabsContent value="projects" hidden={tab !== "projects"}>
              <ProjectsList onOpen={(p) => setTab(kindToTab(p.kind))} />
            </TabsContent>
          </Suspense>
        </Tabs>
      </main>
      <DevEnginePanel />
    </div>
  );
}

function TabFallback() {
  return (
    <div className="flex items-center justify-center py-24 text-muted-foreground">
      <Loader2 className="h-6 w-6 animate-spin ml-2" />
      جارٍ التحميل...
    </div>
  );
}

function kindToTab(k: StudioKind): TabKey {
  return k === "site" ? "sites" : k === "video" ? "videos" : k === "cv" ? "cv" : "images";
}

// ═════════════════════════════════ Projects ═════════════════════════════════
function ProjectsList({ onOpen: _onOpen }: { onOpen: (p: StudioProject) => void }) {
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
          لا مشاريع محفوظة بعد.
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {shown.map((p) => (
            <Card key={p.id} className="overflow-hidden group">
              <div className="aspect-video bg-muted flex items-center justify-center overflow-hidden">
                {p.thumbnail || p.imageUrl ? (
                  <img src={p.thumbnail || p.imageUrl} alt="" loading="lazy" className="w-full h-full object-cover" />
                ) : p.html ? (
                  <iframe title={p.id} srcDoc={p.html} loading="lazy" className="w-full h-full pointer-events-none scale-[0.6] origin-top-left" style={{ width: "166%", height: "166%" }} />
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

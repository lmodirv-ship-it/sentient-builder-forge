import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ExternalLink, Search, ChevronDown, ChevronRight, Network } from "lucide-react";
import {
  HN_PROJECTS, CATEGORY_LABEL, HN_PROJECT_COUNT, HN_INTERFACE_COUNT,
  suggestedHooks, HOOK_LABEL, type HNCategory, type HNProject,
} from "@/lib/hn-ecosystem";

type Lang = "ar" | "en";

export function EcosystemBrowser({ lang }: { lang: Lang }) {
  const t = (ar: string, en: string) => (lang === "ar" ? ar : en);
  const [q, setQ] = useState("");
  const [activeCat, setActiveCat] = useState<HNCategory | "all">("all");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const cats = useMemo(() => {
    const map = new Map<HNCategory, number>();
    HN_PROJECTS.forEach((p) => map.set(p.category, (map.get(p.category) ?? 0) + 1));
    return Array.from(map.entries()); // [cat, count]
  }, []);

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return HN_PROJECTS.filter((p) => {
      if (activeCat !== "all" && p.category !== activeCat) return false;
      if (!ql) return true;
      const hay = [
        p.name, p.nameEn, p.summary, p.summaryEn, p.primary,
        ...p.interfaces.map((i) => `${i.url} ${i.role ?? ""}`),
        ...(p.aliases ?? []),
      ].join(" ").toLowerCase();
      return hay.includes(ql);
    });
  }, [q, activeCat]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="p-5 bg-card/40 backdrop-blur-md border-border/50">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="p-3 rounded-2xl bg-primary/15 border border-primary/30">
            <Network className="size-6 text-primary" />
          </div>
          <div className="flex-1 min-w-[240px]">
            <h2 className="text-xl font-bold">{t("شبكة HN — منظومتك الكاملة", "HN Network — Full Ecosystem")}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {t(
                `${HN_PROJECT_COUNT} مشروعاً أُماً · ${HN_INTERFACE_COUNT} واجهة · مصنّفة ومربوطة بالنواة`,
                `${HN_PROJECT_COUNT} parent projects · ${HN_INTERFACE_COUNT} interfaces · classified & linked to Nawat`
              )}
            </p>
          </div>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("ابحث في المشاريع…", "Search projects…")}
              className="pl-9"
            />
          </div>
        </div>

        {/* Category chips */}
        <div className="flex flex-wrap gap-2 mt-4">
          <Button
            variant={activeCat === "all" ? "default" : "outline"}
            size="sm"
            className="rounded-full h-8"
            onClick={() => setActiveCat("all")}
          >
            {t("الكل", "All")} · {HN_PROJECT_COUNT}
          </Button>
          {cats.map(([cat, count]) => {
            const info = CATEGORY_LABEL[cat];
            const active = activeCat === cat;
            return (
              <Button
                key={cat}
                variant={active ? "default" : "outline"}
                size="sm"
                className="rounded-full h-8 gap-1.5"
                onClick={() => setActiveCat(cat)}
              >
                <span>{info.icon}</span>
                <span>{t(info.ar, info.en)}</span>
                <span className="opacity-70">· {count}</span>
              </Button>
            );
          })}
        </div>
      </Card>

      {/* Projects grid */}
      <div className="grid md:grid-cols-2 gap-3">
        {filtered.map((p) => (
          <ProjectCard
            key={p.id}
            project={p}
            lang={lang}
            open={!!expanded[p.id]}
            onToggle={() => setExpanded((s) => ({ ...s, [p.id]: !s[p.id] }))}
          />
        ))}
        {filtered.length === 0 && (
          <Card className="p-6 text-center text-muted-foreground col-span-full">
            {t("لا نتائج.", "No results.")}
          </Card>
        )}
      </div>
    </div>
  );
}

function ProjectCard({
  project: p, lang, open, onToggle,
}: { project: HNProject; lang: Lang; open: boolean; onToggle: () => void }) {
  const t = (ar: string, en: string) => (lang === "ar" ? ar : en);
  const info = CATEGORY_LABEL[p.category];
  const hooks = suggestedHooks(p);

  return (
    <Card className="p-4 bg-card/40 backdrop-blur-md border-border/50 hover:border-primary/40 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-lg">{info.icon}</span>
            <h3 className="font-semibold truncate">{t(p.name, p.nameEn)}</h3>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{t(p.summary, p.summaryEn)}</p>
        </div>
        <Badge variant="outline" className="shrink-0 font-mono text-[10px]">
          {p.interfaces.length} {t("واجهة", "iface")}
        </Badge>
      </div>

      {/* Primary + hooks */}
      <div className="flex items-center gap-2 mt-3 flex-wrap">
        <a
          href={p.primary}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-primary hover:underline inline-flex items-center gap-1 font-mono truncate max-w-full"
        >
          <ExternalLink className="size-3" /> {p.primary.replace(/^https?:\/\//, "")}
        </a>
      </div>
      <div className="flex flex-wrap gap-1.5 mt-2">
        {hooks.map((h) => (
          <Badge key={h} variant="secondary" className="text-[10px]">
            {t(HOOK_LABEL[h].ar, HOOK_LABEL[h].en)}
          </Badge>
        ))}
      </div>

      {/* Toggle interfaces */}
      <button
        onClick={onToggle}
        className="mt-3 text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
      >
        {open ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
        {t(`عرض كل الواجهات (${p.interfaces.length})`, `Show all interfaces (${p.interfaces.length})`)}
      </button>
      {open && (
        <ul className="mt-2 grid sm:grid-cols-2 gap-1.5 border-t border-border/40 pt-2">
          {p.interfaces.map((i) => (
            <li key={i.url} className="text-[11px] flex items-center gap-1.5 min-w-0">
              {i.role && (
                <span className="font-mono px-1.5 py-0.5 rounded bg-muted/60 text-[9px] shrink-0">
                  {i.role}
                </span>
              )}
              <a
                href={i.url}
                target="_blank"
                rel="noreferrer"
                className="text-primary/90 hover:underline truncate"
              >
                {i.url.replace(/^https?:\/\//, "")}
              </a>
            </li>
          ))}
          {p.aliases && p.aliases.length > 0 && (
            <li className="col-span-full text-[10px] text-muted-foreground mt-1">
              {t("مرادفات: ", "Aliases: ")}
              {p.aliases.map((a) => a.replace(/^https?:\/\//, "")).join(" · ")}
            </li>
          )}
        </ul>
      )}
    </Card>
  );
}
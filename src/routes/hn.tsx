import { createFileRoute, Link } from "@tanstack/react-router";
import { HN_CATEGORIES, HN_PROJECTS, HN_MANIFEST } from "@/lib/hn-manifest";
import { ExternalLink, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/hn")({
  head: () => ({
    meta: [
      { title: "منظومة HN — نواة" },
      { name: "description", content: "خريطة كاملة لمنظومة HN: 27 مشروع، 152 موقع، وواجهات نواة إلى كل خدمة." },
      { property: "og:title", content: "منظومة HN — نواة" },
      { property: "og:description", content: "خريطة كاملة لمنظومة HN: 27 مشروع و152 موقع." },
      { property: "og:url", content: "https://chat.hn-chat.com/hn" },
    ],
    links: [{ rel: "canonical", href: "https://chat.hn-chat.com/hn" }],
  }),
  component: HNPage,
});

function HNPage() {
  const projectsByCategory = new Map<string, typeof HN_PROJECTS>();
  for (const p of HN_PROJECTS) {
    // best-effort: map by first capability into any matching category via id contains
    const catKey =
      HN_CATEGORIES.find((c) => p.capabilityIds?.some((cap) => cap.includes(c.key.split("-")[0])))?.key ||
      "groupe-createur";
    if (!projectsByCategory.has(catKey)) projectsByCategory.set(catKey, []);
    projectsByCategory.get(catKey)!.push(p);
  }

  return (
    <div className="min-h-screen bg-background text-foreground" dir="rtl">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">🌐 منظومة HN</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              المصدر الحصري لنواة — {HN_MANIFEST.totalProjects} مشروع · {HN_MANIFEST.totalSites} موقع
            </p>
          </div>
          <Link
            to="/"
            className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent"
          >
            <ArrowLeft className="size-4" />
            <span>عودة إلى نواة</span>
          </Link>
        </div>

        <div className="mb-6 rounded-lg border border-border bg-card/50 p-4 text-sm">
          <div className="font-semibold mb-1">🔑 الإعداد</div>
          <p className="text-muted-foreground leading-relaxed">
            يكفي مفتاح موحّد <code className="rounded bg-muted px-1">HN_API_KEY</code> في <code>.env</code> بجانب
            التطبيق. كل مشروع يقبل مفتاحاً خاصاً به (مثل <code>HN_GENERATIN_API_KEY</code>) ويقع على المفتاح
            الموحّد إن لم يوجد.
          </p>
        </div>

        {HN_CATEGORIES.map((cat) => {
          const list = projectsByCategory.get(cat.key) || [];
          if (!list.length) return null;
          return (
            <section key={cat.key} className="mb-8">
              <h2 className="mb-3 text-lg font-semibold">
                <span className="mr-2">{cat.emoji}</span>
                {cat.ar}
                <span className="mr-2 text-xs font-normal text-muted-foreground">({list.length})</span>
              </h2>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {list.map((p) => (
                  <a
                    key={p.projectId}
                    href={p.defaultUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="group rounded-lg border border-border bg-card p-3 hover:border-primary/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-sm truncate">{p.nameAr}</div>
                        <div className="text-[11px] text-muted-foreground truncate">{p.nameEn}</div>
                      </div>
                      <ExternalLink className="size-3.5 opacity-40 group-hover:opacity-100" />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {p.capabilityIds?.slice(0, 4).map((c) => (
                        <span
                          key={c}
                          className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                    {p.keyEnv && (
                      <div className="mt-2 text-[10px] text-muted-foreground font-mono truncate">
                        {p.keyEnv}
                      </div>
                    )}
                  </a>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

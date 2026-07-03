import { Link } from "@tanstack/react-router";
import { HN_MANIFEST } from "@/lib/hn-manifest";
import { Network } from "lucide-react";

export function HNStatusPill({ isAr }: { isAr: boolean }) {
  const total = HN_MANIFEST.totalProjects ?? 0;
  const sites = HN_MANIFEST.totalSites ?? 0;
  return (
    <Link
      to="/hn"
      className="hidden lg:inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/60 backdrop-blur px-2.5 py-1 text-[11px] font-semibold hover:bg-primary/10 transition-colors"
      title={isAr ? `منظومة HN — ${total} مشروع / ${sites} موقع` : `HN ecosystem — ${total} projects / ${sites} sites`}
      aria-label={isAr ? "منظومة HN" : "HN ecosystem"}
    >
      <span className="inline-block size-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_theme(colors.emerald.500)]" />
      <Network className="size-3 opacity-70" />
      <span className="hidden xl:inline">HN · {total} · {sites}</span>
    </Link>
  );
}

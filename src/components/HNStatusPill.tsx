import { HN_PILLARS } from "@/lib/hn-ecosystem";
import { ShieldCheck, Database, Cloud } from "lucide-react";

export function HNStatusPill({ isAr }: { isAr: boolean }) {
  const items = [
    { key: "trust", label: HN_PILLARS.trust.name,  url: HN_PILLARS.trust.url,  Icon: ShieldCheck, title: isAr ? HN_PILLARS.trust.purposeAr : HN_PILLARS.trust.purposeEn },
    { key: "data",  label: HN_PILLARS.data.name,   url: HN_PILLARS.data.url,   Icon: Database,    title: isAr ? HN_PILLARS.data.purposeAr  : HN_PILLARS.data.purposeEn  },
    { key: "files", label: HN_PILLARS.files.name,  url: HN_PILLARS.files.url,  Icon: Cloud,       title: isAr ? HN_PILLARS.files.purposeAr : HN_PILLARS.files.purposeEn },
  ];
  return (
    <div
      className="hidden lg:inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/60 backdrop-blur px-1.5 py-1"
      aria-label={isAr ? "حالة منظومة HN" : "HN infrastructure status"}
    >
      {items.map(({ key, label, url, Icon, title }) => (
        <a
          key={key}
          href={url}
          target="_blank"
          rel="noreferrer"
          title={`${label} — ${title}`}
          className="group inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold hover:bg-primary/10 transition-colors"
        >
          <span className="inline-block size-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_theme(colors.emerald.500)]" />
          <Icon className="size-3 opacity-70 group-hover:opacity-100" />
          <span className="hidden xl:inline">{label}</span>
        </a>
      ))}
    </div>
  );
}

import { useEffect, useState } from "react";
import { Palette, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export type NawatTheme = "nawat" | "origin" | "zen";

const THEMES: { id: NawatTheme; ar: string; en: string; swatch: string[]; desc: string }[] = [
  { id: "nawat",  ar: "نواة — بنفسجي وذهبي", en: "Nawat — Violet & Gold", swatch: ["#0d0a1f", "#7c3aed", "#e0b969"], desc: "الفخامة الهادئة" },
  { id: "origin", ar: "أصل — زمردي",         en: "Origin — Emerald",       swatch: ["#0e1a1f", "#34d399", "#94a3b8"], desc: "تقنية هادئة" },
  { id: "zen",    ar: "زِن — أحادي دافئ",     en: "Zen — Warm Mono",        swatch: ["#0e0b07", "#e0b969", "#f5f0e6"], desc: "تركيز مطلق" },
];

const STORAGE_KEY = "nawat.theme.v1";

export function useNawatTheme() {
  const [theme, setTheme] = useState<NawatTheme>("nawat");
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = (localStorage.getItem(STORAGE_KEY) as NawatTheme | null) ?? "nawat";
    setTheme(saved);
    document.documentElement.setAttribute("data-theme", saved);
  }, []);
  const change = (t: NawatTheme) => {
    setTheme(t);
    document.documentElement.setAttribute("data-theme", t);
    localStorage.setItem(STORAGE_KEY, t);
  };
  return { theme, setTheme: change };
}

export function ThemeSwitcher({ isAr = true }: { isAr?: boolean }) {
  const { theme, setTheme } = useNawatTheme();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 border-[color:var(--gold)]/40 bg-[color:var(--gold)]/5 hover:bg-[color:var(--gold)]/15 text-[color:var(--gold)]"
          title={isAr ? "تبديل الثيم" : "Switch theme"}
        >
          <Palette className="size-4" />
          <span className="hidden sm:inline text-xs font-semibold">{isAr ? "الثيم" : "Theme"}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 nawat-glass">
        <DropdownMenuLabel className="text-xs opacity-70">
          {isAr ? "اختر هوية العرض" : "Choose visual identity"}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {THEMES.map((t) => (
          <DropdownMenuItem
            key={t.id}
            onClick={() => setTheme(t.id)}
            className="flex items-center gap-3 py-2.5 cursor-pointer"
          >
            <div className="flex gap-1 shrink-0">
              {t.swatch.map((c) => (
                <span key={c} className="size-4 rounded-full border border-white/10" style={{ background: c }} />
              ))}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate">{isAr ? t.ar : t.en}</div>
              <div className="text-[10px] opacity-60 truncate">{t.desc}</div>
            </div>
            {theme === t.id && <Check className="size-4 text-[color:var(--gold)] shrink-0" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

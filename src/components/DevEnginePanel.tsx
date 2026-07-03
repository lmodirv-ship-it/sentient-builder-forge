import { useEffect, useState } from "react";
import { Shield, Wrench, Library, Sparkles, ScrollText, X, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { runDevMode, type DevMode } from "@/lib/dev-engine";
import { getLogs, subscribeLogs, clearLogs, type LogEntry } from "@/lib/studio-logger";

type BtnDef = {
  mode: DevMode;
  label: string;
  hint: string;
  color: string;      // tailwind classes
  Icon: typeof Wrench;
};

const BUTTONS: BtnDef[] = [
  { mode: "self",      label: "تطوير الذات",   hint: "إصلاح ذاتي وتوسيعات وإعدادات", color: "bg-emerald-500 hover:bg-emerald-600 text-white",       Icon: Wrench },
  { mode: "security",  label: "تطوير الأمان",  hint: "فحص المفاتيح والروابط والبيئة", color: "bg-red-500 hover:bg-red-600 text-white",               Icon: Shield },
  { mode: "libraries", label: "تطوير المكتبات",hint: "قوالب وسكربتات ومجلدات",       color: "bg-amber-400 hover:bg-amber-500 text-black",           Icon: Library },
  { mode: "full",      label: "تطوير شامل",    hint: "يجمع الثلاثة",                 color: "bg-gradient-to-br from-emerald-500 via-amber-400 to-red-500 text-white", Icon: Sparkles },
];

export function DevEnginePanel() {
  const [busy, setBusy] = useState<DevMode | null>(null);
  const [openLogs, setOpenLogs] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>(() => (typeof window !== "undefined" ? getLogs() : []));

  useEffect(() => {
    const unsub = subscribeLogs(() => setLogs(getLogs()));
    return () => { unsub(); };
  }, []);

  async function trigger(mode: DevMode) {
    if (busy) return;
    setBusy(mode);
    try { await runDevMode(mode); } finally { setBusy(null); }
  }

  const errorCount = logs.filter((l) => l.level === "error").length;

  return (
    <>
      {/* Fixed right-side vertical rail */}
      <div className="fixed right-3 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-2" dir="rtl">
        {BUTTONS.map((b) => (
          <button
            key={b.mode}
            onClick={() => trigger(b.mode)}
            disabled={busy !== null}
            title={`${b.label} — ${b.hint}`}
            className={`group relative h-12 w-12 rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-110 active:scale-95 disabled:opacity-60 ${b.color}`}
          >
            {busy === b.mode ? <Loader2 className="h-5 w-5 animate-spin" /> : <b.Icon className="h-5 w-5" />}
            <span className="pointer-events-none absolute right-full mr-2 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-md bg-background/95 border px-2 py-1 text-xs shadow opacity-0 group-hover:opacity-100 transition-opacity">
              {b.label}
            </span>
          </button>
        ))}
        <button
          onClick={() => setOpenLogs((v) => !v)}
          className="h-12 w-12 rounded-full shadow-lg flex items-center justify-center bg-background border hover:bg-muted transition-colors relative"
          title="سجل التتبع"
        >
          <ScrollText className="h-5 w-5" />
          {errorCount > 0 && (
            <span className="absolute -top-1 -left-1 h-5 w-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
              {errorCount > 9 ? "9+" : errorCount}
            </span>
          )}
        </button>
      </div>

      {/* Logs drawer */}
      {openLogs && (
        <div className="fixed inset-0 z-40 flex" dir="rtl" onClick={() => setOpenLogs(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative mr-auto h-full w-full max-w-md bg-background border-l shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 p-3 border-b">
              <ScrollText className="h-4 w-4" />
              <h3 className="font-bold text-sm">سجل التتبع</h3>
              <Badge variant="secondary" className="text-[10px]">{logs.length}</Badge>
              <Button size="sm" variant="ghost" className="mr-auto" onClick={() => { clearLogs(); }}>
                <Trash2 className="h-4 w-4 ml-1" />مسح
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setOpenLogs(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {logs.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm p-6">لا سجلات بعد.</p>
              ) : logs.map((l) => (
                <LogRow key={l.id} entry={l} />
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function LogRow({ entry }: { entry: LogEntry }) {
  const color =
    entry.level === "error"   ? "border-red-500/40 bg-red-500/5" :
    entry.level === "warn"    ? "border-amber-500/40 bg-amber-500/5" :
    entry.level === "success" ? "border-emerald-500/40 bg-emerald-500/5" :
                                "border-muted bg-muted/30";
  return (
    <div className={`text-xs border rounded px-2 py-1.5 ${color}`}>
      <div className="flex items-center gap-2">
        <span className="font-mono text-[10px] text-muted-foreground">
          {new Date(entry.at).toLocaleTimeString("ar")}
        </span>
        <span className="font-semibold">{entry.scope}/{entry.action}</span>
        {entry.durationMs != null && (
          <span className="text-[10px] text-muted-foreground">{entry.durationMs}ms</span>
        )}
      </div>
      <div className="mt-0.5 break-words">{entry.message}</div>
      {entry.errorStack && (
        <pre className="mt-1 text-[10px] text-muted-foreground whitespace-pre-wrap max-h-24 overflow-auto">{entry.errorStack}</pre>
      )}
    </div>
  );
}

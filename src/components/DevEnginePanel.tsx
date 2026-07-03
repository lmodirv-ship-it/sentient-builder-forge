import { useEffect, useState } from "react";
import { Shield, Wrench, Library, Sparkles, ScrollText, X, Trash2, Square, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  startEngine, stopEngine, subscribeEngine, engineStatus, MODE_LABEL,
  type DevMode,
} from "@/lib/dev-engine";
import { getLogs, subscribeLogs, clearLogs, reasonOf, type LogEntry } from "@/lib/studio-logger";

type BtnDef = {
  mode: DevMode;
  label: string;
  ring: string;      // glow color when active
  bg: string;        // button base color
  Icon: typeof Wrench;
};

const BUTTONS: BtnDef[] = [
  { mode: "self",      label: "تطوير الذات",    ring: "shadow-[0_0_0_4px_rgba(16,185,129,0.35),0_0_28px_10px_rgba(16,185,129,0.55)]", bg: "bg-emerald-500 hover:bg-emerald-600 text-white", Icon: Wrench },
  { mode: "security",  label: "تطوير الأمان",   ring: "shadow-[0_0_0_4px_rgba(239,68,68,0.35),0_0_28px_10px_rgba(239,68,68,0.55)]",   bg: "bg-red-500 hover:bg-red-600 text-white",         Icon: Shield },
  { mode: "libraries", label: "تطوير المكتبات", ring: "shadow-[0_0_0_4px_rgba(251,191,36,0.4),0_0_28px_10px_rgba(251,191,36,0.6)]",   bg: "bg-amber-400 hover:bg-amber-500 text-black",     Icon: Library },
  { mode: "full",      label: "تطوير شامل",     ring: "shadow-[0_0_0_4px_rgba(236,72,153,0.35),0_0_28px_10px_rgba(236,72,153,0.55)]", bg: "bg-gradient-to-br from-emerald-500 via-amber-400 to-red-500 text-white", Icon: Sparkles },
];

export function DevEnginePanel() {
  const [mounted, setMounted] = useState(false);
  const [status, setStatus] = useState(engineStatus());
  const [openLogs, setOpenLogs] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => { setMounted(true); setLogs(getLogs()); }, []);
  useEffect(() => subscribeEngine(setStatus), []);
  useEffect(() => subscribeLogs(() => setLogs(getLogs())), []);

  if (!mounted) return null;

  async function toggle(mode: DevMode) {
    // If this mode is running → stop. If another mode is running → stop it, then start new. Else start.
    if (status.running && status.mode === mode) {
      stopEngine();
      toast.success(`${MODE_LABEL[mode]} — توقف`);
      return;
    }
    if (status.running) stopEngine();
    try {
      const res = await startEngine(mode);
      if (res) {
        toast.success(`${MODE_LABEL[mode]} — بدأ`, {
          description: `يكتب التقارير في: ${res.folder} (كل 5 ثواني). اضغط الزر مرّة أخرى لإيقافه.`,
        });
      }
    } catch (err) {
      toast.error(`${MODE_LABEL[mode]} — تعذّر البدء`, { description: reasonOf(err) });
    }
  }

  const errorCount = logs.filter((l) => l.level === "error").length;

  return (
    <>
      {/* Fixed right-side vertical rail */}
      <div className="fixed right-3 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-3" dir="rtl">
        {BUTTONS.map((b) => {
          const active = status.running && status.mode === b.mode;
          return (
            <button
              key={b.mode}
              onClick={() => toggle(b.mode)}
              title={`${b.label} — ${active ? "اضغط للإيقاف" : "اضغط للبدء"}`}
              className={`group relative h-12 w-12 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 ${b.bg} ${active ? `${b.ring} animate-pulse` : "shadow-lg"}`}
            >
              {active ? <Square className="h-4 w-4 fill-current" /> : <b.Icon className="h-5 w-5" />}
              <span className="pointer-events-none absolute right-full mr-2 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-md bg-background/95 border px-2 py-1 text-xs shadow opacity-0 group-hover:opacity-100 transition-opacity">
                {b.label}{active ? " • يعمل" : ""}
              </span>
            </button>
          );
        })}
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

      {/* Running status pill */}
      {status.running && (
        <div className="fixed bottom-3 right-3 z-30 rounded-lg border bg-background/95 backdrop-blur px-3 py-2 shadow-lg text-xs flex items-center gap-2 max-w-[320px]" dir="rtl">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <div className="flex-1">
            <div className="font-semibold">{status.mode && MODE_LABEL[status.mode]} — يعمل</div>
            <div className="text-muted-foreground flex items-center gap-1 mt-0.5">
              <FolderOpen className="h-3 w-3" />
              <span className="truncate">{status.folderName}</span>
              <span>· {status.cycles} دورة · {status.filesWritten} ملف</span>
            </div>
          </div>
          <Button size="sm" variant="ghost" onClick={stopEngine}>
            <Square className="h-3 w-3 ml-1" />إيقاف
          </Button>
        </div>
      )}

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
              <Button size="sm" variant="ghost" className="mr-auto" onClick={clearLogs}>
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
  const savedPath = entry.meta && typeof entry.meta.path === "string" ? entry.meta.path : null;
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
      {savedPath && (
        <div className="mt-1 text-[10px] font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
          <FolderOpen className="h-3 w-3" />{savedPath}
        </div>
      )}
      {entry.errorStack && (
        <pre className="mt-1 text-[10px] text-muted-foreground whitespace-pre-wrap max-h-24 overflow-auto">{entry.errorStack}</pre>
      )}
    </div>
  );
}

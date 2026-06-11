import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Brain, Sparkles, Plus, Search, Trash2, MessageSquare, BookOpen, Languages,
  Upload, Download, FileUp, Flame, Tag as TagIcon,
} from "lucide-react";
import { searchTFIDF, chunkText, type Doc } from "@/lib/nawat-search";
import { extractPdfText } from "@/lib/pdf-extract";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "نواة — العقل المعرفي الذاتي | Nawat" },
      { name: "description", content: "عقل معرفي يعمل بلا إنترنت، يقرأ كتبك ويتعلم منها يومياً. Offline self-learning knowledge brain." },
      { property: "og:title", content: "نواة — العقل المعرفي الذاتي" },
      { property: "og:description", content: "اقرأ. علّمني. اسألني. يعمل كاملاً في متصفحك." },
    ],
  }),
  component: Home,
});

type ChatMsg = { id: string; role: "user" | "assistant"; text: string };
type Streak = { last: string; days: number };

const K_DOCS = "nawat.docs.v2";
const K_CHAT = "nawat.chat.v2";
const K_STREAK = "nawat.streak.v1";

const load = <T,>(k: string, fb: T): T => {
  if (typeof window === "undefined") return fb;
  try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch { return fb; }
};
const save = (k: string, v: unknown) => localStorage.setItem(k, JSON.stringify(v));

function todayISO() { return new Date().toISOString().slice(0, 10); }
function bumpStreak(s: Streak): Streak {
  const t = todayISO();
  if (s.last === t) return s;
  const y = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
  return { last: t, days: s.last === y ? s.days + 1 : 1 };
}

function Home() {
  const [lang, setLang] = useState<"ar" | "en">("ar");
  const isAr = lang === "ar";
  const t = (ar: string, en: string) => (isAr ? ar : en);

  const [docs, setDocs] = useState<Doc[]>([]);
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [streak, setStreak] = useState<Streak>({ last: "", days: 0 });
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [query, setQuery] = useState("");
  const [input, setInput] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const jsonRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDocs(load<Doc[]>(K_DOCS, []));
    setChat(load<ChatMsg[]>(K_CHAT, []));
    setStreak(load<Streak>(K_STREAK, { last: "", days: 0 }));
  }, []);
  useEffect(() => { chatRef.current?.scrollTo({ top: 1e9, behavior: "smooth" }); }, [chat]);

  const persistDocs = (next: Doc[]) => { setDocs(next); save(K_DOCS, next); const s = bumpStreak(streak); setStreak(s); save(K_STREAK, s); };
  const persistChat = (next: ChatMsg[]) => { setChat(next); save(K_CHAT, next); };

  const addManual = () => {
    if (!title.trim() && !content.trim()) return;
    const base = (content.trim() || title.trim());
    const chunks = chunkText(base);
    const tagArr = tags.split(",").map((x) => x.trim()).filter(Boolean);
    const now = Date.now();
    const newDocs: Doc[] = chunks.map((c, i) => ({
      id: crypto.randomUUID(),
      title: chunks.length > 1 ? `${title.trim() || "ملاحظة"} (${i + 1}/${chunks.length})` : (title.trim() || c.slice(0, 60)),
      content: c, tags: tagArr, createdAt: now + i,
    }));
    persistDocs([...newDocs, ...docs]);
    setTitle(""); setContent(""); setTags("");
  };

  const removeDoc = (id: string) => persistDocs(docs.filter((x) => x.id !== id));

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setImporting(true);
    try {
      const newDocs: Doc[] = [];
      for (const file of Array.from(files)) {
        let text = "";
        if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
          text = await extractPdfText(file);
        } else {
          text = await file.text();
        }
        const chunks = chunkText(text);
        const now = Date.now();
        chunks.forEach((c, i) => newDocs.push({
          id: crypto.randomUUID(),
          title: `${file.name} — ${i + 1}/${chunks.length}`,
          content: c,
          tags: ["import"],
          source: file.name,
          createdAt: now + i,
        }));
      }
      persistDocs([...newDocs, ...docs]);
    } catch (e: any) {
      alert(t("فشل الاستيراد: ", "Import failed: ") + (e?.message || e));
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify({ docs, chat, exportedAt: Date.now() }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `nawat-backup-${todayISO()}.json`; a.click();
    URL.revokeObjectURL(url);
  };
  const importJSON = async (file: File) => {
    try {
      const j = JSON.parse(await file.text());
      if (Array.isArray(j.docs)) persistDocs([...j.docs, ...docs]);
      if (Array.isArray(j.chat)) persistChat([...chat, ...j.chat]);
      alert(t("تم الاستيراد", "Imported"));
    } catch { alert(t("ملف غير صالح", "Invalid file")); }
    if (jsonRef.current) jsonRef.current.value = "";
  };

  const allTags = useMemo(() => {
    const m: Record<string, number> = {};
    for (const d of docs) for (const tg of d.tags) m[tg] = (m[tg] || 0) + 1;
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 20);
  }, [docs]);

  const visible = useMemo(() => {
    let list = docs;
    if (activeTag) list = list.filter((d) => d.tags.includes(activeTag));
    if (query.trim()) list = searchTFIDF(query, list, 100);
    return list;
  }, [docs, query, activeTag]);

  const send = () => {
    const text = input.trim();
    if (!text) return;
    const user: ChatMsg = { id: crypto.randomUUID(), role: "user", text };
    const hits = searchTFIDF(text, docs, 5);
    const reply = hits.length
      ? t(
          `وجدت ${hits.length} مقاطع ذات صلة من ذاكرتك:\n\n` +
            hits.map((h, i) => `【${i + 1}】 ${h.title}\n${h.content.slice(0, 320)}${h.content.length > 320 ? "…" : ""}`).join("\n\n") +
            `\n\nℹ️ تجميع المقاطع في إجابة مولّدة يتطلب نموذج لغة (Lovable AI). أنا الآن أعمل كاملاً داخل متصفحك.`,
          `Found ${hits.length} relevant passages in your memory:\n\n` +
            hits.map((h, i) => `【${i + 1}】 ${h.title}\n${h.content.slice(0, 320)}${h.content.length > 320 ? "…" : ""}`).join("\n\n") +
            `\n\nℹ️ Synthesizing a generated answer needs an LLM (Lovable AI). I'm running fully in your browser right now.`,
        )
      : t(
          "لا أجد شيئاً عن هذا في ذاكرتي. أضف ملاحظات أو ارفع كتاباً PDF من تبويب «الذاكرة».",
          "Nothing in my memory about this yet. Add notes or upload a PDF in the Memory tab.",
        );
    const assistant: ChatMsg = { id: crypto.randomUUID(), role: "assistant", text: reply };
    persistChat([...chat, user, assistant]);
    setInput("");
  };

  const clearChat = () => persistChat([]);

  return (
    <div dir={isAr ? "rtl" : "ltr"} className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60 backdrop-blur sticky top-0 z-10 bg-background/80">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="size-9 rounded-xl bg-gradient-to-br from-primary to-primary/40 grid place-items-center text-primary-foreground shadow-elegant">
              <Brain className="size-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">{t("نواة", "Nawat")}</h1>
              <p className="text-xs text-muted-foreground leading-tight">{t("يعمل بلا إنترنت", "Runs fully offline")}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {streak.days > 0 && (
              <Badge variant="secondary" className="gap-1"><Flame className="size-3 text-orange-500" />{streak.days} {t("يوم", "d")}</Badge>
            )}
            <Badge variant="secondary" className="gap-1"><Sparkles className="size-3" />{docs.length}</Badge>
            <Button variant="outline" size="sm" onClick={() => setLang(isAr ? "en" : "ar")}>
              <Languages className="size-4" /> {isAr ? "EN" : "ع"}
            </Button>
          </div>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-4 pt-10 pb-6 text-center">
        <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-br from-foreground to-foreground/50 bg-clip-text text-transparent">
          {t("اقرأ. علّمني. ثم اسألني.", "Read. Teach me. Then ask me.")}
        </h2>
        <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
          {t(
            "ارفع كتباً PDF أو أضف ملاحظات يومية. أُقطّعها وأفهرسها وأجد لك أهم المقاطع — كل ذلك داخل متصفحك بدون إنترنت.",
            "Upload PDFs or add daily notes. I chunk, index, and retrieve the most relevant passages — fully in your browser, no internet needed.",
          )}
        </p>
      </section>

      <main className="max-w-6xl mx-auto px-4 pb-16">
        <Tabs defaultValue="chat" className="w-full">
          <TabsList className="grid grid-cols-2 w-full max-w-md mx-auto">
            <TabsTrigger value="chat" className="gap-2"><MessageSquare className="size-4" />{t("اسأل", "Ask")}</TabsTrigger>
            <TabsTrigger value="memory" className="gap-2"><BookOpen className="size-4" />{t("الذاكرة", "Memory")}</TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="mt-6">
            <Card className="p-0 overflow-hidden">
              <div ref={chatRef} className="h-[55vh] overflow-y-auto p-4 space-y-3 bg-muted/30">
                {chat.length === 0 && (
                  <div className="h-full grid place-items-center text-center text-muted-foreground">
                    <div>
                      <Brain className="size-10 mx-auto mb-2 opacity-50" />
                      <p>{t("اسألني عن أي شيء علّمتني إياه.", "Ask me about anything you've taught me.")}</p>
                    </div>
                  </div>
                )}
                {chat.map((m) => (
                  <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed ${
                      m.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-card border border-border rounded-bl-sm"
                    }`}>{m.text}</div>
                  </div>
                ))}
              </div>
              <div className="border-t border-border p-3 flex gap-2 bg-background">
                <Input value={input} onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send()}
                  placeholder={t("اكتب سؤالك…", "Type your question…")} className="flex-1" />
                <Button onClick={send} disabled={!input.trim()}>{t("إرسال", "Send")}</Button>
                {chat.length > 0 && (
                  <Button variant="ghost" size="icon" onClick={clearChat} title={t("مسح", "Clear")}>
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="memory" className="mt-6 grid lg:grid-cols-5 gap-4">
            <Card className="p-4 lg:col-span-2 space-y-3 h-fit">
              <h3 className="font-semibold flex items-center gap-2"><Plus className="size-4" />{t("أضف معرفة", "Add knowledge")}</h3>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("العنوان", "Title")} />
              <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder={t("المحتوى / اقتباس / ملخص…", "Content / quote / summary…")} rows={6} />
              <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder={t("وسوم مفصولة بفواصل", "Comma-separated tags")} />
              <Button onClick={addManual} className="w-full" disabled={!title.trim() && !content.trim()}>
                <Plus className="size-4" /> {t("احفظ", "Save")}
              </Button>

              <div className="pt-3 border-t border-border space-y-2">
                <h4 className="text-sm font-semibold">{t("استيراد كتب وملفات", "Import books & files")}</h4>
                <input ref={fileRef} type="file" multiple accept=".pdf,.txt,.md,application/pdf,text/plain"
                  onChange={(e) => onFiles(e.target.files)} className="hidden" />
                <Button variant="secondary" className="w-full" onClick={() => fileRef.current?.click()} disabled={importing}>
                  <FileUp className="size-4" />
                  {importing ? t("جارٍ القراءة…", "Reading…") : t("رفع PDF / TXT / MD", "Upload PDF / TXT / MD")}
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={exportJSON} disabled={!docs.length}>
                    <Download className="size-4" /> {t("نسخ احتياطي", "Backup")}
                  </Button>
                  <input ref={jsonRef} type="file" accept="application/json"
                    onChange={(e) => e.target.files?.[0] && importJSON(e.target.files[0])} className="hidden" />
                  <Button variant="outline" className="flex-1" onClick={() => jsonRef.current?.click()}>
                    <Upload className="size-4" /> {t("استعادة", "Restore")}
                  </Button>
                </div>
              </div>
            </Card>

            <div className="lg:col-span-3 space-y-3">
              <div className="relative">
                <Search className="size-4 absolute top-1/2 -translate-y-1/2 start-3 text-muted-foreground" />
                <Input value={query} onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("ابحث في ذاكرتك…", "Search your memory…")} className="ps-9" />
              </div>
              {allTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant={activeTag === null ? "default" : "secondary"} className="cursor-pointer"
                    onClick={() => setActiveTag(null)}>
                    <TagIcon className="size-3" /> {t("الكل", "All")}
                  </Badge>
                  {allTags.map(([tg, n]) => (
                    <Badge key={tg} variant={activeTag === tg ? "default" : "secondary"}
                      className="cursor-pointer" onClick={() => setActiveTag(activeTag === tg ? null : tg)}>
                      {tg} <span className="opacity-60 ms-1">{n}</span>
                    </Badge>
                  ))}
                </div>
              )}
              <ScrollArea className="h-[50vh] pr-2">
                <div className="space-y-2">
                  {visible.length === 0 && (
                    <Card className="p-8 text-center text-muted-foreground">
                      {docs.length === 0
                        ? t("ذاكرتك فارغة. ارفع كتاباً أو أضف ملاحظة.", "Your memory is empty. Upload a book or add a note.")
                        : t("لا توجد نتائج.", "No results.")}
                    </Card>
                  )}
                  {visible.map((it) => (
                    <Card key={it.id} className="p-4 group">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold truncate">{it.title}</h4>
                          <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap line-clamp-4">{it.content}</p>
                          <div className="flex flex-wrap gap-1 mt-2 items-center">
                            {it.tags.map((tg) => <Badge key={tg} variant="secondary">{tg}</Badge>)}
                            <span className="text-xs text-muted-foreground ms-auto">
                              {new Date(it.createdAt).toLocaleDateString(isAr ? "ar" : "en")}
                            </span>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => removeDoc(it.id)}
                          className="opacity-0 group-hover:opacity-100 transition">
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>
        </Tabs>

        <p className="text-xs text-muted-foreground text-center mt-8">
          {t(
            "كل البيانات محفوظة في متصفحك فقط. استخدم زر «نسخ احتياطي» لحفظ ملف JSON على جهازك.",
            "All data is stored only in this browser. Use Backup to save a JSON file to your device.",
          )}
        </p>
      </main>
    </div>
  );
}

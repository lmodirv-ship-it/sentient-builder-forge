import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Brain, Sparkles, Plus, Search, Trash2, MessageSquare, BookOpen, Languages,
  Upload, Download, FileUp, Flame, Tag as TagIcon, Library,
  Mic, Square, Volume2, Copy, Image as ImageIcon, FileDown, Wand2,
} from "lucide-react";
import { searchTFIDF, chunkText, type Doc } from "@/lib/nawat-search";
import { extractPdfText } from "@/lib/pdf-extract";
import { getSeedDocs, SEED_COUNT } from "@/lib/nawat-seed";
import { useServerFn } from "@tanstack/react-start";
import { askNawat } from "@/lib/nawat-ai.functions";
import { ocrImage } from "@/lib/nawat-ocr.functions";
import { transcribeAudio } from "@/lib/nawat-transcribe.functions";
import { generateImage } from "@/lib/nawat-image.functions";

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

type ChatMsg = { id: string; role: "user" | "assistant"; text: string; imageUrl?: string };
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
  const [thinking, setThinking] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const ask = useServerFn(askNawat);
  const transcribe = useServerFn(transcribeAudio);
  const imageGen = useServerFn(generateImage);
  const chatRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const jsonRef = useRef<HTMLInputElement>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

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

  const fileToDataUrl = (file: File): Promise<string> =>
    new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result));
      r.onerror = rej;
      r.readAsDataURL(file);
    });

  const extractFromFile = async (file: File): Promise<{ text: string; tag: string }> => {
    const name = file.name.toLowerCase();
    const mime = file.type;

    // PDF
    if (mime === "application/pdf" || name.endsWith(".pdf")) {
      return { text: await extractPdfText(file), tag: "pdf" };
    }
    // Images → AI OCR
    if (mime.startsWith("image/") || /\.(png|jpe?g|webp|gif|bmp|heic)$/.test(name)) {
      const dataUrl = await fileToDataUrl(file);
      const { text, error } = await ocrImage({ data: { dataUrl, filename: file.name, lang } });
      if (error) throw new Error(error);
      return { text, tag: "image" };
    }
    // Word .docx
    if (name.endsWith(".docx") || mime.includes("officedocument.wordprocessingml")) {
      const mammoth: any = await import("mammoth/mammoth.browser");
      const buf = await file.arrayBuffer();
      const { value } = await mammoth.extractRawText({ arrayBuffer: buf });
      return { text: value, tag: "docx" };
    }
    // Audio → AI transcription
    if (mime.startsWith("audio/") || /\.(mp3|wav|m4a|ogg|webm|aac|flac)$/.test(name)) {
      const dataUrl = await fileToDataUrl(file);
      const fmt = (name.match(/\.(mp3|wav|m4a|ogg|webm|aac|flac)$/)?.[1] || "webm") as any;
      const { text, error } = await transcribe({ data: { audioBase64: dataUrl, format: fmt, lang } });
      if (error) throw new Error(error);
      return { text, tag: "audio" };
    }
    // Video → not supported
    if (mime.startsWith("video/")) {
      throw new Error(t("ملفات الفيديو غير مدعومة.", "Video files not supported."));
    }
    // Text fallback (txt, md, json, csv, html, code, etc.)
    try {
      return { text: await file.text(), tag: "text" };
    } catch {
      throw new Error(t("نوع ملف غير مدعوم.", "Unsupported file type."));
    }
  };

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setImporting(true);
    const errors: string[] = [];
    try {
      const newDocs: Doc[] = [];
      for (const file of Array.from(files)) {
        try {
          const { text, tag } = await extractFromFile(file);
          if (!text.trim()) {
            errors.push(`${file.name}: ${t("فارغ", "empty")}`);
            continue;
          }
          const chunks = chunkText(text);
          const now = Date.now();
          chunks.forEach((c, i) => newDocs.push({
            id: crypto.randomUUID(),
            title: chunks.length > 1 ? `${file.name} — ${i + 1}/${chunks.length}` : file.name,
            content: c,
            tags: ["import", tag],
            source: file.name,
            createdAt: now + i,
          }));
        } catch (e: any) {
          errors.push(`${file.name}: ${e?.message || e}`);
        }
      }
      if (newDocs.length) persistDocs([...newDocs, ...docs]);
      if (errors.length) alert(t("بعض الملفات لم تُستورد:\n", "Some files failed:\n") + errors.join("\n"));
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

  const send = async () => {
    const raw = input.trim();
    if (!raw || thinking) return;

    // Slash command: /صورة or /image — generate an image
    const imgMatch = raw.match(/^\/(?:صورة|image|img)\s+([\s\S]+)/i);
    if (imgMatch) {
      const prompt = imgMatch[1].trim();
      const user: ChatMsg = { id: crypto.randomUUID(), role: "user", text: raw };
      const baseChat = [...chat, user];
      persistChat(baseChat);
      setInput("");
      setThinking(true);
      try {
        const { imageUrl, error } = await imageGen({ data: { prompt } });
        const assistant: ChatMsg = {
          id: crypto.randomUUID(),
          role: "assistant",
          text: error ? (t("تعذّر توليد الصورة: ", "Image failed: ") + error) : t("تم توليد الصورة:", "Generated:"),
          imageUrl: error ? undefined : imageUrl,
        };
        persistChat([...baseChat, assistant]);
      } finally {
        setThinking(false);
      }
      return;
    }

    // Expand other slash commands into natural prompts
    let text = raw;
    const cmd = raw.match(/^\/(\S+)\s*([\s\S]*)$/);
    if (cmd) {
      const [, name, rest] = cmd;
      const n = name.toLowerCase();
      if (["لخص", "لخّص", "summarize", "sum"].includes(n))
        text = isAr ? `لخّص ما يلي بإيجاز ونقاط واضحة:\n${rest}` : `Summarize concisely with bullet points:\n${rest}`;
      else if (["ترجم", "translate", "tr"].includes(n))
        text = isAr ? `ترجم النص التالي إلى الإنجليزية:\n${rest}` : `Translate the following to Arabic:\n${rest}`;
      else if (["اشرح", "explain", "ex"].includes(n))
        text = isAr ? `اشرح بأسلوب بسيط ومنظّم:\n${rest}` : `Explain simply and clearly:\n${rest}`;
    }

    const user: ChatMsg = { id: crypto.randomUUID(), role: "user", text: raw };
    const baseChat = [...chat, user];
    persistChat(baseChat);
    setInput("");
    setThinking(true);
    try {
      const hits = searchTFIDF(text, docs, 6);
      const history = baseChat.slice(-10).map((m) => ({ role: m.role, text: m.text }));
      const { text: reply } = await ask({
        data: {
          question: text,
          lang,
          context: hits.map((h) => ({ title: h.title, content: h.content.slice(0, 800) })),
          history,
        },
      });
      const assistant: ChatMsg = { id: crypto.randomUUID(), role: "assistant", text: reply };
      persistChat([...baseChat, assistant]);
    } catch (e: any) {
      const assistant: ChatMsg = {
        id: crypto.randomUUID(),
        role: "assistant",
        text: t("تعذّر الاتصال بنواة الذكاء. حاول مجدداً.", "Failed to reach AI core. Try again.") + "\n" + (e?.message || ""),
      };
      persistChat([...baseChat, assistant]);
    } finally {
      setThinking(false);
    }
  };

  const clearChat = () => persistChat([]);

  // ===== Voice input (MediaRecorder → AI transcription) =====
  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach((tr) => tr.stop());
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        const buf = await blob.arrayBuffer();
        const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
        setTranscribing(true);
        try {
          const fmt = (mr.mimeType || "").includes("mp4") ? "mp4" : "webm";
          const { text, error } = await transcribe({ data: { audioBase64: b64, format: fmt as any, lang } });
          if (error) alert(error);
          else setInput((prev) => (prev ? prev + " " : "") + text);
        } finally {
          setTranscribing(false);
        }
      };
      mediaRef.current = mr;
      mr.start();
      setRecording(true);
    } catch (e: any) {
      alert(t("تعذّر الوصول للميكروفون: ", "Mic access failed: ") + (e?.message || ""));
    }
  };
  const stopRec = () => {
    mediaRef.current?.stop();
    setRecording(false);
  };

  // ===== TTS =====
  const speak = (text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = isAr ? "ar-SA" : "en-US";
    window.speechSynthesis.speak(u);
  };

  // ===== Copy =====
  const copyMsg = (text: string) => {
    navigator.clipboard?.writeText(text);
  };

  // ===== Export chat as Markdown =====
  const exportChatMD = () => {
    const md = chat
      .map((m) => `### ${m.role === "user" ? (isAr ? "أنا" : "Me") : (isAr ? "نواة" : "Nawat")}\n${m.text}${m.imageUrl ? `\n\n![image](${m.imageUrl})` : ""}`)
      .join("\n\n---\n\n");
    const blob = new Blob([`# ${isAr ? "محادثة نواة" : "Nawat Chat"} — ${todayISO()}\n\n${md}`], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `nawat-chat-${todayISO()}.md`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div dir={isAr ? "rtl" : "ltr"} className="min-h-screen bg-background text-foreground relative [&>*]:relative [&>*]:z-[1]">
      <header className="border-b border-border/60 backdrop-blur-xl sticky top-0 z-10 bg-background/60">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative size-10 rounded-2xl bg-primary/10 border border-primary/40 grid place-items-center text-primary shadow-elegant">
              <Brain className="size-5" />
              <span className="absolute inset-0 rounded-2xl animate-[pulse-ring_2.4s_ease-out_infinite]" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold leading-tight tracking-tight nawat-holo">{t("نواة", "NAWAT")}</h1>
              <p className="nawat-chip text-muted-foreground leading-tight flex items-center gap-1.5">
                <span className="inline-block size-1.5 rounded-full bg-primary shadow-[0_0_8px_var(--primary)]" />
                {t("نظام معرفي · أوفلاين", "COGNITIVE OS · OFFLINE")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {streak.days > 0 && (
              <Badge variant="secondary" className="gap-1 bg-secondary/60 border border-border nawat-chip"><Flame className="size-3 text-orange-400" />{streak.days}</Badge>
            )}
            <Badge variant="secondary" className="gap-1 bg-secondary/60 border border-border nawat-chip"><Sparkles className="size-3 text-primary" />{docs.length}</Badge>
            <Button variant="outline" size="sm" onClick={() => setLang(isAr ? "en" : "ar")}>
              <Languages className="size-4" /> {isAr ? "EN" : "ع"}
            </Button>
          </div>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-4 pt-20 pb-10 text-center relative">
        <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 rounded-full border border-primary/30 bg-primary/5 backdrop-blur-md nawat-chip text-primary">
          <span className="inline-block size-1.5 rounded-full bg-primary shadow-[0_0_8px_var(--primary)] animate-pulse" />
          {t("الإصدار 2026 · نواة الذكاء", "v2026 · NEURAL CORE")}
        </div>
        <h2 className="text-5xl md:text-7xl font-extrabold tracking-tighter leading-[1.05]">
          <span className="nawat-holo">{t("اقرأ. علّمني.", "Read. Teach me.")}</span>
          <br />
          <span className="bg-gradient-to-b from-white to-white/40 bg-clip-text text-transparent">{t("ثم اسألني.", "Then ask me.")}</span>
        </h2>
        <p className="mt-6 text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          {t(
            "ارفع كتباً PDF أو أضف ملاحظات يومية. أُقطّعها وأفهرسها وأجد لك أهم المقاطع — كل ذلك داخل متصفحك بدون إنترنت.",
            "Upload PDFs or add daily notes. I chunk, index, and retrieve the most relevant passages — fully in your browser, no internet needed.",
          )}
        </p>
        <div className="mt-8 flex items-center justify-center gap-6 nawat-chip text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-primary" /> {t("بدون خوادم", "ZERO SERVER")}</span>
          <span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-[oklch(0.7_0.22_280)]" /> {t("بحث TF-IDF", "TF-IDF SEARCH")}</span>
          <span className="hidden sm:flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-[oklch(0.75_0.2_220)]" /> {t("ذاكرة محلية", "LOCAL MEMORY")}</span>
        </div>
      </section>


      <main className="max-w-6xl mx-auto px-4 pb-16">
        <Tabs defaultValue="chat" className="w-full">
          <TabsList className="grid grid-cols-2 w-full max-w-md mx-auto p-1 bg-card/40 backdrop-blur-md border border-border rounded-2xl h-auto">
            <TabsTrigger value="chat" className="gap-2 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-2.5"><MessageSquare className="size-4" />{t("اسأل", "Ask")}</TabsTrigger>
            <TabsTrigger value="memory" className="gap-2 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-2.5"><BookOpen className="size-4" />{t("الذاكرة", "Memory")}</TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="mt-6">
            <Card className="p-0 overflow-hidden rounded-[2rem] bg-card/30 backdrop-blur-xl border-border/60 nawat-glow">
              <div ref={chatRef} className="h-[55vh] overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-transparent to-primary/[0.04]">
                {chat.length === 0 && (
                  <div className="h-full grid place-items-center text-center text-muted-foreground">
                    <div>
                      <Brain className="size-10 mx-auto mb-2 opacity-50" />
                      <p>{t("اسألني عن أي شيء علّمتني إياه.", "Ask me about anything you've taught me.")}</p>
                    </div>
                  </div>
                )}
                {chat.map((m) => (
                  <div key={m.id} className={`flex group ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      m.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-sm whitespace-pre-wrap"
                        : "bg-card border border-border rounded-bl-sm"
                    }`}>
                      {m.role === "assistant" ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-2 prose-pre:my-2 prose-headings:my-2">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.text}</ReactMarkdown>
                          {m.imageUrl && (
                            <img src={m.imageUrl} alt="generated" className="mt-2 rounded-lg max-w-full" />
                          )}
                          <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition">
                            <Button variant="ghost" size="icon" className="size-7" onClick={() => copyMsg(m.text)} title={t("نسخ", "Copy")}>
                              <Copy className="size-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="size-7" onClick={() => speak(m.text)} title={t("استمع", "Speak")}>
                              <Volume2 className="size-3.5" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        m.text
                      )}
                    </div>
                  </div>
                ))}
                {thinking && (
                  <div className="flex justify-start">
                    <div className="bg-card border border-border rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm text-muted-foreground">
                      <span className="inline-flex gap-1">
                        <span className="size-1.5 rounded-full bg-current animate-bounce" />
                        <span className="size-1.5 rounded-full bg-current animate-bounce [animation-delay:120ms]" />
                        <span className="size-1.5 rounded-full bg-current animate-bounce [animation-delay:240ms]" />
                      </span>
                    </div>
                  </div>
                )}
              </div>
              <div className="border-t border-border p-3 flex gap-2 bg-background items-center">
                <Button
                  variant={recording ? "destructive" : "outline"}
                  size="icon"
                  onClick={recording ? stopRec : startRec}
                  disabled={transcribing}
                  title={recording ? t("إيقاف التسجيل", "Stop") : t("إدخال صوتي", "Voice input")}
                >
                  {transcribing ? <Wand2 className="size-4 animate-pulse" /> : recording ? <Square className="size-4" /> : <Mic className="size-4" />}
                </Button>
                <Input value={input} onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
                  placeholder={t("اكتب… أو جرّب /صورة، /لخّص، /ترجم، /اشرح", "Type… or try /image, /summarize, /translate, /explain")} className="flex-1" />
                <Button onClick={send} disabled={!input.trim() || thinking}>
                  {thinking ? t("يفكر…", "Thinking…") : t("إرسال", "Send")}
                </Button>
                {chat.length > 0 && (
                  <>
                    <Button variant="ghost" size="icon" onClick={exportChatMD} title={t("تصدير", "Export")}>
                      <FileDown className="size-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={clearChat} title={t("مسح", "Clear")}>
                      <Trash2 className="size-4" />
                    </Button>
                  </>
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
                <input ref={fileRef} type="file" multiple accept="*/*"
                  onChange={(e) => onFiles(e.target.files)} className="hidden" />
                <Button variant="secondary" className="w-full" onClick={() => fileRef.current?.click()} disabled={importing}>
                  <FileUp className="size-4" />
                  {importing ? t("جارٍ القراءة…", "Reading…") : t("رفع أي ملف (PDF/صور/Word/نص)", "Upload any file (PDF/images/Word/text)")}
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
                <Button variant="secondary" className="w-full" onClick={() => {
                  if (confirm(t(`سيُضاف ${SEED_COUNT} مفهوماً جاهزاً إلى ذاكرتك. متابعة؟`, `${SEED_COUNT} ready-made concepts will be added. Continue?`))) {
                    persistDocs([...getSeedDocs(), ...docs]);
                  }
                }}>
                  <Library className="size-4" /> {t(`حمّل المكتبة الأساسية (${SEED_COUNT})`, `Load starter library (${SEED_COUNT})`)}
                </Button>
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

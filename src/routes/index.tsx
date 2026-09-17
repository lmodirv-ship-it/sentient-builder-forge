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
  FolderOpen, HardDrive,
} from "lucide-react";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { searchTFIDF, searchHybrid, rerank, withNeighbors, chunkText, type Doc } from "@/lib/nawat-search";
import { expandQuery } from "@/lib/nawat-query-expand.functions";
import { extractPdfText } from "@/lib/pdf-extract";
import { getSeedDocs, SEED_COUNT } from "@/lib/nawat-seed";
import { getSitesDocs, SITES_COUNT, SITES_CATEGORY_COUNT, extractUrls, relatedCategoriesFor, SITE_CATEGORIES } from "@/lib/nawat-sites";
import { getSitesQADocs, SITES_QA_COUNT } from "@/lib/nawat-sites-qa";
import {
  getProjectDocs, HN_PROJECT_DOC_COUNT, findProject,
  renderAllSites, renderProjectCard, renderProjectTasks,
  renderAllCategories, renderProjectList,
  projectToDoc,
} from "@/lib/nawat-sites-memory";
import { routeSitesQuestion, findProjects, projectsForCategoryLabel } from "@/lib/nawat-sites-router";
import { getCapabilityDocs, HN_CAPABILITIES_COUNT } from "@/lib/hn-capabilities";
import { detectServiceIntent, findCapability, formatServiceReply } from "@/lib/nawat-service-router";
import { getServiceQADocs } from "@/lib/nawat-service-qa";
import { hnBridge } from "@/lib/hn-bridge";
import { HN_PILLARS } from "@/lib/hn-ecosystem";
import { HNStatusPill } from "@/components/HNStatusPill";
import { useServerFn } from "@tanstack/react-start";
import { askNawat } from "@/lib/nawat-ai.functions";
import { kernelTemplateAnswer } from "@/lib/kernel-chat.functions";
import { ocrImage } from "@/lib/nawat-ocr.functions";
import { transcribeAudio } from "@/lib/nawat-transcribe.functions";
import { generateImage } from "@/lib/nawat-image.functions";
import { generateSpeech } from "@/lib/nawat-tts.functions";
import { generateSiteHtml } from "@/lib/nawat-site-design.functions";
import { generateVideo } from "@/lib/nawat-video.functions";
import { generateCV } from "@/lib/nawat-cv.functions";
import { detectExecutor, runningHeader, stamp, extractSubject, subjectPrompt } from "@/lib/nawat-executor";
import {
  fsSupported, pickRootDir, getRootName, clearRootDir,
  saveSnapshot, loadSnapshot, saveOriginalFile,
} from "@/lib/nawat-fs";
import nawatLogo from "@/assets/nawat-logo.png.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "نواة — العقل المعرفي الذاتي | Nawat" },
      { name: "description", content: "عقل معرفي يعمل بلا إنترنت، يقرأ كتبك ويتعلم منها يومياً. Offline self-learning knowledge brain." },
      { property: "og:title", content: "نواة — العقل المعرفي الذاتي" },
      { property: "og:description", content: "اقرأ. علّمني. اسألني. يعمل كاملاً في متصفحك." },
      { property: "og:url", content: "https://chat.hn-chat.com/" },
    ],
    links: [{ rel: "canonical", href: "https://chat.hn-chat.com/" }],
  }),
  component: Home,
});

type ChatMsg = {
  id: string;
  role: "user" | "assistant";
  text: string;
  imageUrl?: string;
  audioUrl?: string;
  videoUrl?: string;
  htmlPayload?: string;
  running?: boolean;
};
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

function escapeRegExp(s: string) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
function queryTerms(q: string): string[] {
  return Array.from(new Set(
    q.toLowerCase().split(/[\s،,.;:!?()\[\]"'`]+/).filter((w) => w.length >= 2)
  )).sort((a, b) => b.length - a.length);
}
function Highlight({ text, terms }: { text: string; terms: string[] }) {
  if (!terms.length || !text) return <>{text}</>;
  const re = new RegExp(`(${terms.map(escapeRegExp).join("|")})`, "gi");
  const parts = text.split(re);
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1
          ? <mark key={i} className="bg-primary/25 text-foreground rounded px-0.5">{p}</mark>
          : <span key={i}>{p}</span>
      )}
    </>
  );
}

function NeuralBrain({ className, bg = false }: { className?: string; bg?: boolean }) {
  return (
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="filament-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--primary)" />
          <stop offset="100%" stopColor="var(--gold)" />
        </linearGradient>
        <linearGradient id="lightning-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--gold)" />
          <stop offset="50%" stopColor="var(--primary)" />
          <stop offset="100%" stopColor="var(--gold)" />
        </linearGradient>
        <filter id="filament-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="brain-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {/* Brain outline */}
      <g stroke="currentColor" strokeWidth={bg ? "1" : "2"} strokeLinecap="round" strokeLinejoin="round" opacity={bg ? 0.35 : 0.7}>
        {/* Left hemisphere */}
        <path d="M60,22 C45,22 32,30 26,45 C22,55 22,68 28,78 C34,90 46,98 58,100" />
        {/* Right hemisphere */}
        <path d="M60,22 C75,22 88,30 94,45 C98,55 98,68 92,78 C86,90 74,98 62,100" />
        {/* Center groove */}
        <path d="M60,22 L60,100" />
        {/* Left inner folds */}
        <path d="M36,42 Q44,52 38,64" opacity="0.5" />
        <path d="M32,58 Q42,68 36,80" opacity="0.5" />
        {/* Right inner folds */}
        <path d="M84,42 Q76,52 82,64" opacity="0.5" />
        <path d="M88,58 Q78,68 84,80" opacity="0.5" />
      </g>
      {/* Animated light filaments */}
      <g filter="url(#filament-glow)" stroke="url(#filament-grad)" strokeWidth={bg ? "1.2" : "1.8"} strokeLinecap="round" fill="none">
        <path d="M35,40 Q45,55 35,70" className="filament" strokeDasharray="18 110" style={{ animationDelay: "0s" }} />
        <path d="M45,35 Q55,50 45,80" className="filament" strokeDasharray="18 110" style={{ animationDelay: "0.4s" }} />
        <path d="M85,40 Q75,55 85,70" className="filament" strokeDasharray="18 110" style={{ animationDelay: "0.8s" }} />
        <path d="M75,35 Q65,50 75,80" className="filament" strokeDasharray="18 110" style={{ animationDelay: "1.2s" }} />
        <path d="M50,50 Q60,65 70,50" className="filament" strokeDasharray="18 110" style={{ animationDelay: "1.6s" }} />
        <path d="M40,60 Q50,75 60,65" className="filament" strokeDasharray="18 110" style={{ animationDelay: "2s" }} />
        <path d="M80,60 Q70,75 60,65" className="filament" strokeDasharray="18 110" style={{ animationDelay: "2.4s" }} />
        <path d="M60,30 Q50,45 60,60" className="filament" strokeDasharray="18 110" style={{ animationDelay: "2.8s" }} />
        <path d="M60,30 Q70,45 60,60" className="filament" strokeDasharray="18 110" style={{ animationDelay: "3.2s" }} />
      </g>
      {/* Electricity / lightning bolts */}
      <g stroke="url(#lightning-grad)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={bg ? 0.5 : 1}>
        <path d="M42,35 L46,45 L40,48 L48,60" className="lightning-bolt" style={{ ["--bolt-index" as string]: 0 }} />
        <path d="M78,35 L74,45 L80,48 L72,60" className="lightning-bolt" style={{ ["--bolt-index" as string]: 1 }} />
        <path d="M60,28 L56,38 L62,42 L58,52" className="lightning-bolt" style={{ ["--bolt-index" as string]: 2 }} />
        <path d="M50,70 L54,78 L48,82 L52,92" className="lightning-bolt" style={{ ["--bolt-index" as string]: 3 }} />
        <path d="M70,70 L66,78 L72,82 L68,92" className="lightning-bolt" style={{ ["--bolt-index" as string]: 4 }} />
      </g>
      {/* Subtle core glow nodes */}
      <circle cx="60" cy="60" r={bg ? "4" : "3"} fill="var(--gold)" opacity="0.8">
        <animate attributeName="opacity" values="0.4;1;0.4" dur="3s" repeatCount="indefinite" />
      </circle>
      <circle cx="45" cy="55" r="2" fill="var(--primary)" opacity="0.6">
        <animate attributeName="opacity" values="0.3;0.9;0.3" dur="2.4s" repeatCount="indefinite" />
      </circle>
      <circle cx="75" cy="55" r="2" fill="var(--primary)" opacity="0.6">
        <animate attributeName="opacity" values="0.3;0.9;0.3" dur="2.8s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

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
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [folderName, setFolderName] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const ask = useServerFn(askNawat);
  const templateAsk = useServerFn(kernelTemplateAnswer);
  const expand = useServerFn(expandQuery);
  const transcribe = useServerFn(transcribeAudio);
  const imageGen = useServerFn(generateImage);
  const speechGen = useServerFn(generateSpeech);
  const siteGen = useServerFn(generateSiteHtml);
  const videoGen = useServerFn(generateVideo);
  const cvGen = useServerFn(generateCV);
  const [feedback, setFeedback] = useState<Record<string, number>>(() => load<Record<string, number>>("nawat.feedback.v1", {}));
  const [usedCtx, setUsedCtx] = useState<Record<string, { ids: string[]; top: number; tiers: string[] }>>({});
  const setFb = (docId: string, delta: number) => {
    setFeedback((prev) => {
      const next = { ...prev, [docId]: Math.max(-5, Math.min(5, (prev[docId] || 0) + delta)) };
      save("nawat.feedback.v1", next);
      return next;
    });
  };
  const rateAnswer = (msgId: string, sign: 1 | -1) => {
    const meta = usedCtx[msgId];
    if (!meta) return;
    for (const id of meta.ids) setFb(id, sign);
  };
  const chatRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const jsonRef = useRef<HTMLInputElement>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const hydratedRef = useRef(false);

  useEffect(() => {
    (async () => {
      // Try restoring from chosen folder first; fall back to localStorage.
      let restored = false;
      try {
        const name = await getRootName();
        if (name) {
          setFolderName(name);
          const snap = await loadSnapshot();
          if (snap) {
            if (Array.isArray(snap.docs)) setDocs(snap.docs as Doc[]);
            if (Array.isArray(snap.chat)) setChat(snap.chat as ChatMsg[]);
            restored = true;
          }
        }
      } catch { /* permission denied or no handle */ }
      if (!restored) {
        setDocs(load<Doc[]>(K_DOCS, []));
        setChat(load<ChatMsg[]>(K_CHAT, []));
      }
      setStreak(load<Streak>(K_STREAK, { last: "", days: 0 }));
      // Auto-seed the HN sites registry + expected Q&A. Upsert by stable id so edits propagate on every load.
      setDocs(prev => {
        const sites = getSitesDocs();
        const qa = getSitesQADocs();
        const projects = getProjectDocs();
        const caps = getCapabilityDocs();
        const bundled = [...projects, ...caps, ...sites, ...qa, ...getServiceQADocs()];
        const ids = new Set(bundled.map(s => s.id));
        const merged = [...bundled, ...prev.filter(d => !ids.has(d.id))];
        save(K_DOCS, merged);
        return merged;
      });
      hydratedRef.current = true;
    })();
  }, []);
  useEffect(() => { chatRef.current?.scrollTo({ top: 1e9, behavior: "smooth" }); }, [chat]);

  // Auto-sync to chosen folder whenever data changes (debounced).
  useEffect(() => {
    if (!hydratedRef.current || !folderName) return;
    const id = setTimeout(async () => {
      try {
        setSyncing(true);
        await saveSnapshot({ docs, chat, savedAt: Date.now() });
      } catch { /* ignore */ } finally { setSyncing(false); }
    }, 600);
    return () => clearTimeout(id);
  }, [docs, chat, folderName]);

  const persistDocs = (next: Doc[]) => { setDocs(next); save(K_DOCS, next); const s = bumpStreak(streak); setStreak(s); save(K_STREAK, s); };
  const persistChat = (next: ChatMsg[]) => { setChat(next); save(K_CHAT, next); };

  const addManual = () => {
    if (!title.trim() && !content.trim()) return;
    const base = (content.trim() || title.trim());
    const chunks = chunkText(base);
    const tagArr = tags.split(",").map((x) => x.trim()).filter(Boolean);
    // Tier inferred from tags: #core / #جوهر → core, #daily / #يومي → daily, else long-term.
    const tagSet = new Set(tagArr.map((x) => x.toLowerCase()));
    const tier: "daily" | "long" | "core" =
      tagSet.has("core") || tagSet.has("جوهر") || tagSet.has("مبدأ") || tagSet.has("رؤية") ? "core"
      : tagSet.has("daily") || tagSet.has("يومي") || tagSet.has("مهمة") || tagSet.has("task") ? "daily"
      : "long";
    const now = Date.now();
    const newDocs: Doc[] = chunks.map((c, i) => ({
      id: crypto.randomUUID(),
      title: chunks.length > 1 ? `${title.trim() || "ملاحظة"} (${i + 1}/${chunks.length})` : (title.trim() || c.slice(0, 60)),
      content: c, tags: tagArr, createdAt: now + i, tier,
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
          // Save the original file into the chosen folder (any size) if set.
          if (folderName) {
            try { await saveOriginalFile(file); } catch { /* ignore */ }
          }
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
    if (activeCategory) {
      list = list.filter((d) =>
        relatedCategoriesFor({ id: d.id, tags: d.tags, content: d.content, title: d.title })
          .some((c) => c.key === activeCategory)
      );
    }
    const q = query.trim().toLowerCase();
    if (q) {
      // Broaden: title / content / tags / URLs / category names all count as matches.
      const substr = list.filter((d) => {
        const cats = relatedCategoriesFor({ id: d.id, tags: d.tags, content: d.content, title: d.title });
        const hay = [
          d.title,
          d.content,
          d.tags.join(" "),
          extractUrls(d.content).join(" "),
          cats.map((c) => `${c.key} ${c.ar} ${c.en}`).join(" "),
        ].join(" ").toLowerCase();
        return hay.includes(q);
      });
      const ranked = searchTFIDF(query, list, 100);
      const seen = new Set<string>();
      list = [...ranked, ...substr].filter((d) => (seen.has(d.id) ? false : (seen.add(d.id), true)));
    }
    return list;
  }, [docs, query, activeTag, activeCategory]);

  const highlightTerms = useMemo(() => queryTerms(query), [query]);

  const send = async () => {
    const raw = (input || inputRef.current?.value || "").trim();
    if (!raw || thinking) return;

    // ── Executor: creation intents run in background via the matching HN site.
    const exec = detectExecutor(raw);
    if (exec) {
      const { def, prompt } = exec;
      const subject = extractSubject(def, raw);
      // If user gave a command with no real subject (e.g. "صمم لي صورة"), ask instead of calling API.
      if (["image", "tts", "site", "video", "cv", "content"].includes(def.id) && subject.length < 2) {
        const user: ChatMsg = { id: crypto.randomUUID(), role: "user", text: raw };
        const askMsg: ChatMsg = { id: crypto.randomUUID(), role: "assistant", text: subjectPrompt(def, lang) };
        persistChat([...chat, user, askMsg]);
        setInput("");
        if (inputRef.current) inputRef.current.value = "";
        return;
      }
      const promptText = subject || prompt || raw;
      const user: ChatMsg = { id: crypto.randomUUID(), role: "user", text: raw };
      const runId = crypto.randomUUID();
      const runningMsg: ChatMsg = {
        id: runId,
        role: "assistant",
        text: runningHeader(def, promptText, lang),
        running: true,
      };
      const baseChat = [...chat, user, runningMsg];
      persistChat(baseChat);
      setInput("");
      if (inputRef.current) inputRef.current.value = "";

      const finish = (patch: Partial<ChatMsg>, replyText: string) => {
        const done: ChatMsg = {
          id: runId,
          role: "assistant",
          text: replyText + stamp(def, lang),
          running: false,
          ...patch,
        };
        persistChat(baseChat.map((m) => (m.id === runId ? done : m)));
      };
      const fail = (err: string) => {
        const q = promptText ? `?q=${encodeURIComponent(promptText)}` : "";
        const msg = t(
          `⚠️ تعذّر التنفيذ الآلي (${err}). افتح [${def.siteName}](${def.siteUrl}${q}) مباشرة.`,
          `⚠️ Auto-run failed (${err}). Open [${def.siteName}](${def.siteUrl}${q}) directly.`,
        );
        persistChat(baseChat.map((m) => (m.id === runId ? { ...m, text: msg, running: false } : m)));
      };

      try {
        if (def.id === "image") {
          const r = await imageGen({ data: { prompt: promptText } });
          if (r.error || !r.imageUrl) return fail(r.error || "no image");
          finish({ imageUrl: r.imageUrl }, t(`✅ **${def.labelAr}** جاهزة.`, `✅ **${def.labelEn}** ready.`));
        } else if (def.id === "tts") {
          const r = await speechGen({ data: { text: promptText } });
          if (r.error || !r.audioBase64) return fail(r.error || "no audio");
          const url = `data:${r.mime || "audio/mpeg"};base64,${r.audioBase64}`;
          finish({ audioUrl: url }, t(`✅ **${def.labelAr}** جاهز.`, `✅ **${def.labelEn}** ready.`));
        } else if (def.id === "site") {
          const r = await siteGen({ data: { prompt: promptText, lang } });
          if (r.error || !r.html) return fail(r.error || "no html");
          finish({ htmlPayload: r.html }, t(`✅ **${def.labelAr}** جاهز. معاينة وتنزيل بالأسفل.`, `✅ **${def.labelEn}** ready. Preview & download below.`));
        } else if (def.id === "video") {
          const r = await videoGen({ data: { prompt: promptText } });
          if (r.error || !r.videoUrl) return fail(r.error || "no video");
          finish({ videoUrl: r.videoUrl }, t(`✅ **${def.labelAr}** جاهز.`, `✅ **${def.labelEn}** ready.`));
        } else if (def.id === "cv") {
          const r = await cvGen({ data: { prompt: promptText, lang } });
          if (r.error || !r.html) return fail(r.error || "no cv");
          finish({ htmlPayload: r.html }, t(`✅ **${def.labelAr}** جاهزة. معاينة وتنزيل بالأسفل.`, `✅ **${def.labelEn}** ready. Preview & download below.`));
        } else {
          const q = promptText ? `?q=${encodeURIComponent(promptText)}` : "";
          const msg = t(
            `${def.emoji} افتح [${def.siteName}](${def.siteUrl}${q}) لإتمام الطلب — التشغيل الآلي غير متوفر بعد لهذه الخدمة.`,
            `${def.emoji} Open [${def.siteName}](${def.siteUrl}${q}) to complete the request — auto-run not wired for this service yet.`,
          );
          persistChat(baseChat.map((m) => (m.id === runId ? { ...m, text: msg + stamp(def, lang), running: false } : m)));
        }
      } catch (e: any) {
        fail(String(e?.message || e));
      }
      return;
    }


    // ── نواة المساعد الذكي: أسئلة الترحيب والقوالب المعروفة تُجاب فوراً من جدول القوالب.
    if (!raw.startsWith("/")) {
      try {
        const tm = await templateAsk({ data: { question: raw, lang } });
        if (tm.matched && tm.text) {
          const user: ChatMsg = { id: crypto.randomUUID(), role: "user", text: raw };
          persistChat([...chat, user, { id: crypto.randomUUID(), role: "assistant", text: tm.text }]);
          setInput("");
          if (inputRef.current) inputRef.current.value = "";
          return;
        }
      } catch { /* لا قوالب مطابقة — نكمل المسار الطبيعي */ }
    }

    // ── Wave 2 · Service router: /خدمة /service /افتح /open <name>
    const svcCmd = raw.match(/^\/(?:خدمة|خدمه|service|svc|افتح|open|نفّذ|نفذ|execute)\s+([\s\S]+)/i);
    if (svcCmd) {
      const cap = findCapability(svcCmd[1]);
      const user: ChatMsg = { id: crypto.randomUUID(), role: "user", text: raw };
      const reply = cap
        ? formatServiceReply(
            { matched: true, confidence: 1, capability: cap, role: null, provider: [...cap.providers].sort((a, b) => a.priority - b.priority)[0], actionUrl: null, alternatives: [] },
            lang,
            svcCmd[1],
          )
        : t(`لا أجد خدمة باسم "${svcCmd[1]}". جرّب /سsites أو /ابحث.`, `No service named "${svcCmd[1]}". Try /sites or /search.`);
      persistChat([...chat, user, { id: crypto.randomUUID(), role: "assistant", text: reply }]);
      setInput("");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    // ── Wave 2 · High-confidence natural-language service intent — skip AI.
    if (!raw.startsWith("/")) {
      const intent = detectServiceIntent(raw);
      if (intent.matched && intent.confidence >= 0.7 && intent.capability) {
        const user: ChatMsg = { id: crypto.randomUUID(), role: "user", text: raw };
        const reply = formatServiceReply(intent, lang, raw);
        persistChat([...chat, user, { id: crypto.randomUUID(), role: "assistant", text: reply }]);
        setInput("");
        if (inputRef.current) inputRef.current.value = "";
        return;
      }
    }

    // Local slash commands for HN sites — no AI call, pure memory.
    const sitesCmd = raw.match(/^\/(sites|مواقعي|مواقع)\s*$/i);
    const siteCmd = raw.match(/^\/(site|موقع)\s+([\s\S]+)/i);
    const tasksCmd = raw.match(/^\/(tasks|مهام)\s+([\s\S]+)/i);
    const allCmd = raw.match(/^\/(all|كل|الكل|فئات)\s*$/i);
    const catCmd = raw.match(/^\/(cat|category|فئة|قسم)\s+([\s\S]+)/i);
    const searchCmd = raw.match(/^\/(find|search|ابحث|بحث)\s+([\s\S]+)/i);
    const trustCmd = raw.match(/^\/(trust|ثقة|ملكية|tvcc)\s*$/i);
    const dataCmd = raw.match(/^\/(data|db|بيانات|قاعدة)\s+([\s\S]+)/i);
    const filesCmd = raw.match(/^\/(files|cloud|ملفات|سحابة)\s+([\s\S]+)/i);
    if (sitesCmd || siteCmd || tasksCmd || allCmd || catCmd || searchCmd || trustCmd || dataCmd || filesCmd) {
      const user: ChatMsg = { id: crypto.randomUUID(), role: "user", text: raw };
      let reply = "";
      if (sitesCmd) {
        reply = renderAllSites(lang);
      } else if (allCmd) {
        reply = renderAllCategories(lang);
      } else if (catCmd) {
        const { key, projects } = projectsForCategoryLabel(catCmd[2]);
        reply = key
          ? renderProjectList(projects, lang, `${t("فئة", "Category")}: ${catCmd[2]} — ${projects.length}`)
          : t(`لا أعرف فئة باسم "${catCmd[2]}".`, `No category "${catCmd[2]}".`);
      } else if (searchCmd) {
        const list = findProjects(searchCmd[2], 10);
        reply = list.length
          ? renderProjectList(list, lang, `${t("نتائج", "Results")}: "${searchCmd[2]}" — ${list.length}`)
          : t(`لا أجد مشروعاً يطابق "${searchCmd[2]}".`, `No project matches "${searchCmd[2]}".`);
      } else if (siteCmd) {
        const p = findProject(siteCmd[2]);
        reply = p
          ? renderProjectCard(p, lang)
          : t(`لا أجد مشروعاً باسم "${siteCmd[2]}".`, `No project matches "${siteCmd[2]}".`);
      } else if (tasksCmd) {
        const p = findProject(tasksCmd[1] === "tasks" ? tasksCmd[2] : tasksCmd[2]);
        reply = p
          ? renderProjectTasks(p, lang)
          : t(`لا أجد مشروعاً باسم "${tasksCmd[2]}".`, `No project matches "${tasksCmd[2]}".`);
      } else if (trustCmd) {
        const T = HN_PILLARS.trust, D = HN_PILLARS.data, F = HN_PILLARS.files;
        reply = t(
          `### 🏛️ ركائز منظومة HN\n\n1. **${T.name}** — ${T.purposeAr}\n   [${T.url}](${T.url})\n2. **${D.name}** — ${D.purposeAr}\n   [${D.url}](${D.url})\n3. **${F.name}** — ${F.purposeAr}\n   [${F.url}](${F.url})\n\n> ${hnBridge.identity.badgeAr} — كل مواقع HN مُثبتة الملكية عبر هذا المرجع.`,
          `### 🏛️ HN Pillars\n\n1. **${T.name}** — ${T.purposeEn}\n   [${T.url}](${T.url})\n2. **${D.name}** — ${D.purposeEn}\n   [${D.url}](${D.url})\n3. **${F.name}** — ${F.purposeEn}\n   [${F.url}](${F.url})\n\n> ${hnBridge.identity.badgeEn}`,
        );
      } else if (dataCmd) {
        const p = findProject(dataCmd[2]);
        const id = p?.id ?? dataCmd[2].trim();
        const url = hnBridge.db.projectSpace(id);
        reply = t(
          `### 🗄️ بيانات ${p?.name ?? id} على HN-DB\n\n[${url}](${url})\n\n> ${hnBridge.identity.badgeAr}`,
          `### 🗄️ ${p?.nameEn ?? id} data on HN-DB\n\n[${url}](${url})\n\n> ${hnBridge.identity.badgeEn}`,
        );
      } else if (filesCmd) {
        const p = findProject(filesCmd[2]);
        const id = p?.id ?? filesCmd[2].trim();
        const url = hnBridge.cloud.folder(id);
        reply = t(
          `### ☁️ ملفات ${p?.name ?? id} على HN-Cloud\n\n[${url}](${url})\n\n> ${hnBridge.identity.badgeAr}`,
          `### ☁️ ${p?.nameEn ?? id} files on HN-Cloud\n\n[${url}](${url})\n\n> ${hnBridge.identity.badgeEn}`,
        );
      }
      const assistant: ChatMsg = { id: crypto.randomUUID(), role: "assistant", text: reply };
      persistChat([...chat, user, assistant]);
      setInput("");
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
    if (inputRef.current) inputRef.current.value = "";
    setThinking(true);
    try {
      // Sites router: if the question is about the user's HN sites,
      // prepend the matched project cards to the context and use sites mode.
      const sitesRoute = routeSitesQuestion(text);
      const forcedSiteDocs: Doc[] = sitesRoute.isSitesQuestion
        ? (sitesRoute.matched.length
            ? sitesRoute.matched.map((p) => projectToDoc(p))
            : getProjectDocs().slice(0, 6))
        : [];

      // Query expansion (with graceful fallback to the raw text).
      let variants: string[] = [text];
      try {
        const exp = await expand({ data: { question: text, lang } });
        if (exp?.variants?.length) variants = exp.variants;
      } catch { /* offline / gateway down — keep raw query */ }

      // Hybrid retrieval → rerank → neighbor expansion.
      const pool = searchHybrid(variants, docs, 20);
      const top = rerank(text, pool, { feedback, k: 8 });
      const withN = withNeighbors(top, docs, 1).slice(0, 12);
      const topScore = top[0]?.score ?? 0;
      const tiersUsed = Array.from(new Set(top.map((h) => h.tier || "long")));

      // Merge: forced site docs first, then retrieved docs (dedup by id).
      const seenCtx = new Set<string>();
      const mergedCtx = [...forcedSiteDocs, ...withN].filter((d) => (seenCtx.has(d.id) ? false : (seenCtx.add(d.id), true))).slice(0, 12);

      const history = baseChat.slice(-6).map((m) => ({ role: m.role, text: m.text }));
      const { text: reply } = await ask({
        data: {
          question: text,
          lang,
          mode: sitesRoute.isSitesQuestion ? "sites" : "default",
          context: mergedCtx.map((h) => ({
            title: h.title,
            content: h.content.slice(0, h.tags?.includes("site") ? 3000 : 1000),
            source: h.source,
            date: h.createdAt ? new Date(h.createdAt).toISOString().slice(0, 10) : undefined,
            tags: h.tags,
            tier: h.tier,
          })),
          history,
        },
      });
      const assistant: ChatMsg = { id: crypto.randomUUID(), role: "assistant", text: reply };
      persistChat([...baseChat, assistant]);
      setUsedCtx((prev) => ({
        ...prev,
        [assistant.id]: { ids: top.map((h) => h.id), top: Math.round(topScore * 100) / 100, tiers: tiersUsed },
      }));


      // Grow the brain: persist meaningful Q&A pairs as long-term memory.
      const isRefusal =
        reply.startsWith("لا أملك هذه المعلومة") ||
        reply.startsWith("I don't have this information") ||
        reply.startsWith("⚠️");
      if (!isRefusal && reply.trim().length > 40) {
        const now = Date.now();
        const qa: Doc = {
          id: crypto.randomUUID(),
          title: (isAr ? "حوار: " : "Dialogue: ") + raw.slice(0, 80),
          content: (isAr ? "س: " : "Q: ") + raw + "\n\n" + (isAr ? "ج: " : "A: ") + reply,
          tags: ["conversation", isAr ? "حوار" : "dialogue"],
          source: "chat",
          createdAt: now,
          tier: "long",
        };
        persistDocs([qa, ...docs]);
      }
    } catch (e: any) {
      const msg = String(e?.message || "");
      const unauthorized = /unauthorized|401|authorization header/i.test(msg);
      const assistant: ChatMsg = {
        id: crypto.randomUUID(),
        role: "assistant",
        text: unauthorized
          ? t(
              "سجّل الدخول أولاً لاستخدام نواة الذكاء. افتح صفحة الدخول من [هنا](/auth) ثم أعد إرسال سؤالك.",
              "Please sign in first to use the AI core. Open the [sign-in page](/auth) and send your question again.",
            )
          : t("تعذّر الاتصال بنواة الذكاء. حاول مجدداً.", "Failed to reach AI core. Try again.") + "\n" + msg,
      };
      persistChat([...baseChat, assistant]);
    } finally {
      setThinking(false);
    }
  };

  const clearChat = () => persistChat([]);
  const removeMsg = (id: string) => persistChat(chat.filter((m) => m.id !== id));

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
      <header className="border-b border-border/40 backdrop-blur-2xl sticky top-0 z-20 bg-background/70">
        <div className="max-w-6xl mx-auto px-4 py-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative size-11 shrink-0 rounded-xl overflow-hidden border border-[color:var(--gold)]/40 shadow-[0_10px_30px_-8px_color-mix(in_oklab,var(--gold)_60%,transparent)]">
              <img src={nawatLogo.url} alt="شعار النواة" className="size-full object-cover" />
              <span className="absolute inset-0 rounded-2xl animate-[pulse-ring_2.6s_ease-out_infinite]" />
            </div>
            <div className="min-w-0 hidden sm:block">
              <h1 className="text-xl font-extrabold leading-tight tracking-tight nawat-holo truncate">{t("نواة", "NAWAT")}</h1>
              <p className="text-[11px] text-muted-foreground leading-tight flex items-center gap-1.5 truncate">
                <span className="inline-block size-1.5 shrink-0 rounded-full bg-[color:var(--gold)] shadow-[0_0_8px_var(--gold)]" />
                {t("ذاكرتك وعقلك الثاني", "Your second brain")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {streak.days > 0 && (
              <Badge variant="secondary" className="hidden sm:inline-flex gap-1 bg-[color:var(--gold)]/10 border border-[color:var(--gold)]/30 text-[color:var(--gold)] nawat-chip"><Flame className="size-3" />{streak.days}</Badge>
            )}
            <Badge variant="secondary" className="hidden sm:inline-flex gap-1 bg-primary/10 border border-primary/30 text-primary nawat-chip"><Sparkles className="size-3" />{docs.length}</Badge>
            <HNStatusPill isAr={isAr} />
            <a href="/studio" className="inline-flex items-center gap-1 rounded-md border border-primary/40 bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/20 transition-colors">
              <Sparkles className="size-4" />{isAr ? "الاستوديو" : "Studio"}
            </a>
            <ThemeSwitcher isAr={isAr} />
            <Button variant="outline" size="sm" onClick={() => setLang(isAr ? "en" : "ar")}>
              <Languages className="size-4" /> {isAr ? "EN" : "ع"}
            </Button>
          </div>
        </div>
      </header>

      {/* Premium hero — greeting card with brain glyph + quick actions */}
      <section className="max-w-6xl mx-auto px-4 pt-4 pb-3 space-y-3 hidden sm:block">
        <div className="relative rounded-[1.5rem] overflow-hidden nawat-hero-bg border border-border/50 p-3 sm:p-5 shadow-[0_30px_80px_-30px_color-mix(in_oklab,var(--primary)_50%,transparent)]">
          <div className="absolute -top-16 -right-16 size-72 rounded-full bg-primary/25 blur-[80px]" />
          <div className="absolute -bottom-20 -left-16 size-72 rounded-full bg-[color:var(--gold)]/15 blur-[90px]" />
          <div className="relative flex justify-center">
            <div className="relative size-40 sm:size-52 shrink-0">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/40 to-[color:var(--gold)]/30 blur-2xl" />
              <div className="relative size-full rounded-[1.75rem] overflow-hidden border border-[color:var(--gold)]/30 shadow-[0_0_35px_color-mix(in_oklab,var(--gold)_35%,transparent)]">
                <img src={nawatLogo.url} alt="شعار النواة" className="size-full object-cover" />
              </div>
            </div>
          </div>
        </div>

      </section>



      <main className="max-w-6xl mx-auto px-4 pb-16">
        <Tabs defaultValue="chat" className="w-full">
          <TabsList className="grid grid-cols-2 w-full max-w-md mx-auto p-1 bg-card/40 backdrop-blur-md border border-border rounded-2xl h-auto">
            <TabsTrigger value="chat" className="gap-2 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-2.5"><MessageSquare className="size-4" />{t("اسأل", "Ask")}</TabsTrigger>
            <TabsTrigger value="memory" className="gap-2 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-2.5"><BookOpen className="size-4" />{t("الذاكرة", "Memory")}</TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="mt-6 relative">
            {/* Background brain — large, pulsing, behind chat */}
            <div className="absolute inset-0 grid place-items-center pointer-events-none overflow-hidden z-0">
              <NeuralBrain bg className="w-[80vw] h-[80vw] max-w-[600px] max-h-[600px] text-muted-foreground brain-bg brain-glow" />
            </div>
            <Card className="relative p-0 overflow-hidden rounded-[2rem] bg-card/30 backdrop-blur-xl border-border/60 nawat-glow z-[1]">
              <div ref={chatRef} className="h-[55vh] overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-transparent to-primary/[0.04]">
                {chat.length === 0 && (
                  <div className="h-full grid place-items-center">
                    <NeuralBrain className="w-32 h-32 text-muted-foreground" />
                  </div>
                )}
                {chat.map((m) => (
                  <div key={m.id} className={`flex group ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] rounded-3xl px-4 py-2.5 text-sm leading-relaxed ${
                      m.role === "user"
                        ? "nawat-bubble-user rounded-br-md whitespace-pre-wrap"
                        : "rounded-bl-md bg-transparent text-white"
                    }`}>
                      {m.role === "assistant" ? (
                        <div className="prose prose-sm prose-invert max-w-none prose-p:my-2 prose-pre:my-2 prose-headings:my-2 text-white prose-headings:text-white prose-strong:text-white prose-a:text-white prose-code:text-white prose-li:text-white">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.text}</ReactMarkdown>
                          {m.imageUrl && (
                            <img src={m.imageUrl} alt="generated" className="mt-2 rounded-lg max-w-full" />
                          )}
                          {m.audioUrl && (
                            <audio controls src={m.audioUrl} className="mt-2 w-full" />
                          )}
                          {m.videoUrl && (
                            <video controls src={m.videoUrl} className="mt-2 w-full rounded-lg" />
                          )}
                          {m.htmlPayload && (
                            <div className="mt-2 space-y-2">
                              <iframe
                                title="site-preview"
                                srcDoc={m.htmlPayload}
                                className="w-full h-96 rounded-lg border border-white/20 bg-white"
                                sandbox="allow-scripts"
                              />
                              <div className="flex gap-2">
                                <a
                                  href={`data:text/html;charset=utf-8,${encodeURIComponent(m.htmlPayload)}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs underline"
                                >
                                  {t("افتح في تبويب جديد", "Open in new tab")}
                                </a>
                                <a
                                  href={`data:text/html;charset=utf-8,${encodeURIComponent(m.htmlPayload)}`}
                                  download="hn-site.html"
                                  className="text-xs underline"
                                >
                                  {t("تنزيل .html", "Download .html")}
                                </a>
                              </div>
                            </div>
                          )}
                          <div className="flex gap-1 mt-2 items-center">
                            <Button variant="ghost" size="icon" className="size-7 opacity-0 group-hover:opacity-100 transition hover:text-red-400" onClick={() => removeMsg(m.id)} title={t("حذف", "Delete")}>
                              <Trash2 className="size-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="size-7 opacity-0 group-hover:opacity-100 transition" onClick={() => copyMsg(m.text)} title={t("نسخ", "Copy")}>
                              <Copy className="size-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="size-7 opacity-0 group-hover:opacity-100 transition" onClick={() => speak(m.text)} title={t("استمع", "Speak")}>
                              <Volume2 className="size-3.5" />
                            </Button>
                            {usedCtx[m.id] && (
                              <>
                                <Button variant="ghost" size="icon" className="size-7 hover:text-emerald-400" onClick={() => rateAnswer(m.id, 1)} title={t("مفيد", "Helpful")}>
                                  <span className="text-xs">👍</span>
                                </Button>
                                <Button variant="ghost" size="icon" className="size-7 hover:text-red-400" onClick={() => rateAnswer(m.id, -1)} title={t("غير مفيد", "Not helpful")}>
                                  <span className="text-xs">👎</span>
                                </Button>
                                <span className="text-[10px] text-muted-foreground ms-auto tabular-nums">
                                  {usedCtx[m.id].ids.length} {t("مقطع", "psg")} · {t("قوة", "top")} {usedCtx[m.id].top} · {usedCtx[m.id].tiers.map((x) => x === "core" ? "🟣" : x === "daily" ? "🟢" : "🔵").join("")}
                                </span>
                              </>
                            )}
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
                <Input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
                  placeholder="" className="flex-1 caret-primary" />
                <Button onClick={send} disabled={thinking}>
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
                <input ref={fileRef} type="file" multiple
                  accept="application/pdf,.pdf,image/*,.docx,audio/*,text/*,.md,.txt,.json,.csv,.html"
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
                <Button variant="secondary" className="w-full" onClick={() => {
                  const bundled = [...getProjectDocs(), ...getCapabilityDocs(), ...getSitesDocs(), ...getSitesQADocs()];
                  const ids = new Set(bundled.map(s => s.id));
                  persistDocs([...bundled, ...docs.filter(d => !ids.has(d.id))]);
                }}>
                  <Library className="size-4" /> {t(
                    `حدّث فهرس مواقعي (${HN_PROJECT_DOC_COUNT} مشروعاً · ${HN_CAPABILITIES_COUNT} خدمة · ${SITES_COUNT} رابطاً · ${SITES_CATEGORY_COUNT} تصنيفاً · ${SITES_QA_COUNT} س/ج)`,
                    `Refresh my sites (${HN_PROJECT_DOC_COUNT} projects · ${HN_CAPABILITIES_COUNT} services · ${SITES_COUNT} URLs · ${SITES_CATEGORY_COUNT} categories · ${SITES_QA_COUNT} Q&A)`
                  )}
                </Button>
              </div>


              <div className="pt-3 border-t border-border space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <HardDrive className="size-4" />
                  {t("مجلد الحفظ على جهازك", "Local save folder")}
                </h4>
                {folderName ? (
                  <>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <span className={`size-1.5 rounded-full ${syncing ? "bg-amber-400 animate-pulse" : "bg-primary"}`} />
                      <span className="truncate">{folderName}</span>
                      <span className="ms-auto">{syncing ? t("جارٍ الحفظ…", "Saving…") : t("متزامن", "Synced")}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1" onClick={async () => {
                        try {
                          const n = await pickRootDir();
                          if (n) {
                            setFolderName(n);
                            await saveSnapshot({ docs, chat, savedAt: Date.now() });
                          }
                        } catch (e: any) { alert(e?.message || String(e)); }
                      }}>
                        <FolderOpen className="size-4" /> {t("تغيير", "Change")}
                      </Button>
                      <Button variant="ghost" className="flex-1" onClick={async () => {
                        await clearRootDir();
                        setFolderName(null);
                      }}>
                        {t("فصل", "Disconnect")}
                      </Button>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {t("كل ملف ترفعه يُحفظ كاملاً داخل هذا المجلد (مهما كان حجمه)، مع نسخة JSON كاملة من ذاكرتك ونسخ احتياطية مؤرّخة.", "Every uploaded file is saved fully in this folder (any size), plus a full JSON snapshot of your memory and dated backups.")}
                    </p>
                  </>
                ) : (
                  <>
                    <Button variant="secondary" className="w-full" disabled={!fsSupported()} onClick={async () => {
                      try {
                        const n = await pickRootDir();
                        if (n) {
                          setFolderName(n);
                          await saveSnapshot({ docs, chat, savedAt: Date.now() });
                        }
                      } catch (e: any) { alert(e?.message || String(e)); }
                    }}>
                      <FolderOpen className="size-4" />
                      {t("اختر مجلد الحفظ على الحاسوب", "Pick a save folder on your computer")}
                    </Button>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {fsSupported()
                        ? t("اختر مجلداً مرة واحدة، وسيحفظ نواة كل شيء فيه تلقائياً (ملفات + ذاكرة كاملة).", "Pick a folder once and Nawat will auto-save everything there (files + full memory).")
                        : t("هذه الميزة تتطلب Chrome أو Edge على الحاسوب.", "This feature requires Chrome or Edge on desktop.")}
                    </p>
                  </>
                )}
              </div>
            </Card>

            <div className="lg:col-span-3 space-y-3">
              <div className="relative">
                <Search className="size-4 absolute top-1/2 -translate-y-1/2 start-3 text-muted-foreground" />
                <Input value={query} onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("ابحث بالاسم، الوسم، الرابط، أو التصنيف…", "Search by name, tag, URL, or category…")} className="ps-9 pe-9" />
                {(query || activeTag || activeCategory) && (
                  <button type="button"
                    onClick={() => { setQuery(""); setActiveTag(null); setActiveCategory(null); }}
                    className="absolute top-1/2 -translate-y-1/2 end-2 text-xs text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded">
                    ×
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5">
                <Badge variant={activeCategory === null ? "default" : "secondary"} className="cursor-pointer"
                  onClick={() => setActiveCategory(null)}>
                  🌐 {t("كل التصنيفات", "All categories")}
                </Badge>
                {SITE_CATEGORIES.map((c) => (
                  <Badge key={c.key} variant={activeCategory === c.key ? "default" : "secondary"}
                    className="cursor-pointer"
                    onClick={() => setActiveCategory(activeCategory === c.key ? null : c.key)}>
                    <span className="me-1">{c.emoji}</span>{isAr ? c.ar : c.en}
                    <span className="opacity-60 ms-1">{c.urls.length}</span>
                  </Badge>
                ))}
              </div>

              {allTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant={activeTag === null ? "default" : "secondary"} className="cursor-pointer"
                    onClick={() => setActiveTag(null)}>
                    <TagIcon className="size-3" /> {t("كل الوسوم", "All tags")}
                  </Badge>
                  {allTags.map(([tg, n]) => (
                    <Badge key={tg} variant={activeTag === tg ? "default" : "secondary"}
                      className="cursor-pointer" onClick={() => setActiveTag(activeTag === tg ? null : tg)}>
                      {tg} <span className="opacity-60 ms-1">{n}</span>
                    </Badge>
                  ))}
                </div>
              )}

              <div className="text-xs text-muted-foreground">
                {t(`${visible.length} نتيجة من ${docs.length}`, `${visible.length} of ${docs.length} results`)}
              </div>

              <ScrollArea className="h-[50vh] pr-2">
                <div className="space-y-2">
                  {visible.length === 0 && (
                    <Card className="p-8 text-center text-muted-foreground">
                      {docs.length === 0
                        ? t("ذاكرتك فارغة. ارفع كتاباً أو أضف ملاحظة.", "Your memory is empty. Upload a book or add a note.")
                        : t("لا توجد نتائج.", "No results.")}
                    </Card>
                  )}
                  {visible.map((it) => {
                    const inlineUrls = extractUrls(it.content);
                    const cats = relatedCategoriesFor({ id: it.id, tags: it.tags, content: it.content, title: it.title });
                    // Category URLs not already inline — surfaced as extras.
                    const inlineSet = new Set(inlineUrls);
                    const extraCats = cats
                      .map(c => ({ cat: c, urls: c.urls.filter(u => !inlineSet.has(u)) }))
                      .filter(x => x.urls.length > 0);
                    return (
                    <Card key={it.id} className="p-4 group">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold truncate"><Highlight text={it.title} terms={highlightTerms} /></h4>
                          <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap line-clamp-4"><Highlight text={it.content} terms={highlightTerms} /></p>
                          {inlineUrls.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {inlineUrls.slice(0, 12).map((u) => (
                                <a key={u} href={u} target="_blank" rel="noreferrer noopener"
                                  className="text-xs px-2 py-0.5 rounded-md bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 truncate max-w-[220px]">
                                  <Highlight text={u.replace(/^https?:\/\//, "")} terms={highlightTerms} />
                                </a>
                              ))}
                              {inlineUrls.length > 12 && (
                                <span className="text-xs text-muted-foreground self-center">+{inlineUrls.length - 12}</span>
                              )}
                            </div>
                          )}
                          {extraCats.length > 0 && (
                            <div className="mt-2 space-y-1.5">
                              {extraCats.map(({ cat, urls }) => (
                                <details key={cat.key} className="rounded-md border border-border/60 bg-card/40">
                                  <summary className="cursor-pointer text-xs px-2 py-1.5 flex items-center gap-1.5 select-none">
                                    <span>{cat.emoji}</span>
                                    <span className="font-medium"><Highlight text={isAr ? cat.ar : cat.en} terms={highlightTerms} /></span>
                                    <span className="text-muted-foreground">({urls.length})</span>
                                  </summary>
                                  <div className="flex flex-wrap gap-1.5 p-2 pt-0">
                                    {urls.map((u) => (
                                      <a key={u} href={u} target="_blank" rel="noreferrer noopener"
                                        className="text-xs px-2 py-0.5 rounded-md bg-secondary/60 hover:bg-secondary text-foreground/90 border border-border/60 truncate max-w-[220px]">
                                        <Highlight text={u.replace(/^https?:\/\//, "")} terms={highlightTerms} />
                                      </a>
                                    ))}
                                  </div>
                                </details>
                              ))}
                            </div>
                          )}
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
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>

        </Tabs>

      </main>

      <footer className="w-full border-t border-border/50 bg-card/40 backdrop-blur-sm py-4 px-6 mt-4 text-center text-sm text-muted-foreground">
        جميع الحقوق محفوظة © مولاي اسماعيل الحسني — Groupe HN للبرمجة والتصميم
      </footer>
    </div>
  );
}

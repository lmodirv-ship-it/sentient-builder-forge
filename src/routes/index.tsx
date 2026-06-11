import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Brain, Sparkles, Plus, Search, Trash2, MessageSquare, BookOpen, Languages } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "نواة — العقل المعرفي الذاتي | Nawat" },
      { name: "description", content: "عقل معرفي يتعلم منك يومياً، يحفظ كل ما تقرأه ويستخدمه لاحقاً. A self-learning knowledge brain." },
      { property: "og:title", content: "نواة — العقل المعرفي الذاتي" },
      { property: "og:description", content: "عقل معرفي يتعلم منك يومياً ويكبر بلا حدود." },
    ],
  }),
  component: Home,
});

type Knowledge = {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: number;
};

type ChatMsg = { id: string; role: "user" | "assistant"; text: string };

const STORAGE_KEY = "nawat.knowledge.v1";
const CHAT_KEY = "nawat.chat.v1";

function loadKnowledge(): Knowledge[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
}
function saveKnowledge(k: Knowledge[]) { localStorage.setItem(STORAGE_KEY, JSON.stringify(k)); }
function loadChat(): ChatMsg[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(CHAT_KEY) || "[]"); } catch { return []; }
}
function saveChat(c: ChatMsg[]) { localStorage.setItem(CHAT_KEY, JSON.stringify(c)); }

// naïve keyword scoring for local retrieval until Cloud is enabled
function searchLocal(query: string, items: Knowledge[], k = 4): Knowledge[] {
  const q = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!q.length) return [];
  const scored = items.map((it) => {
    const hay = (it.title + " " + it.content + " " + it.tags.join(" ")).toLowerCase();
    const score = q.reduce((s, w) => s + (hay.includes(w) ? 1 : 0), 0);
    return { it, score };
  }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score);
  return scored.slice(0, k).map((x) => x.it);
}

function Home() {
  const [lang, setLang] = useState<"ar" | "en">("ar");
  const isAr = lang === "ar";
  const [items, setItems] = useState<Knowledge[]>([]);
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [query, setQuery] = useState("");
  const [input, setInput] = useState("");
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setItems(loadKnowledge()); setChat(loadChat()); }, []);
  useEffect(() => { chatRef.current?.scrollTo({ top: 1e9, behavior: "smooth" }); }, [chat]);

  const t = (ar: string, en: string) => (isAr ? ar : en);

  const addItem = () => {
    if (!title.trim() && !content.trim()) return;
    const item: Knowledge = {
      id: crypto.randomUUID(),
      title: title.trim() || content.slice(0, 60),
      content: content.trim(),
      tags: tags.split(",").map((x) => x.trim()).filter(Boolean),
      createdAt: Date.now(),
    };
    const next = [item, ...items];
    setItems(next); saveKnowledge(next);
    setTitle(""); setContent(""); setTags("");
  };

  const removeItem = (id: string) => {
    const next = items.filter((x) => x.id !== id);
    setItems(next); saveKnowledge(next);
  };

  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    return searchLocal(query, items, 50);
  }, [query, items]);

  const send = () => {
    const text = input.trim();
    if (!text) return;
    const user: ChatMsg = { id: crypto.randomUUID(), role: "user", text };
    const hits = searchLocal(text, items, 4);
    const reply = hits.length
      ? t(
          `وجدت ${hits.length} مقطعاً ذا صلة في ذاكرتك:\n\n` +
            hits.map((h, i) => `${i + 1}. ${h.title}\n${h.content.slice(0, 220)}${h.content.length > 220 ? "…" : ""}`).join("\n\n") +
            `\n\n— (الإجابة الذكية الكاملة تتطلب تفعيل Lovable Cloud)`,
          `Found ${hits.length} relevant snippets in your memory:\n\n` +
            hits.map((h, i) => `${i + 1}. ${h.title}\n${h.content.slice(0, 220)}${h.content.length > 220 ? "…" : ""}`).join("\n\n") +
            `\n\n— (Full AI answers require enabling Lovable Cloud)`,
        )
      : t(
          "لا توجد معرفة مخزنة بهذا الشأن بعد. أضف ملاحظات في تبويب «الذاكرة» وسأتعلمها.",
          "No stored knowledge on this yet. Add notes in the Memory tab and I'll learn from them.",
        );
    const assistant: ChatMsg = { id: crypto.randomUUID(), role: "assistant", text: reply };
    const next = [...chat, user, assistant];
    setChat(next); saveChat(next);
    setInput("");
  };

  const clearChat = () => { setChat([]); saveChat([]); };

  return (
    <div dir={isAr ? "rtl" : "ltr"} className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border/60 backdrop-blur sticky top-0 z-10 bg-background/80">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="size-9 rounded-xl bg-gradient-to-br from-primary to-primary/40 grid place-items-center text-primary-foreground shadow-elegant">
              <Brain className="size-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">{t("نواة", "Nawat")}</h1>
              <p className="text-xs text-muted-foreground leading-tight">{t("عقل معرفي يكبر معك", "A brain that grows with you")}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1"><Sparkles className="size-3" />{items.length} {t("ذاكرة", "memories")}</Badge>
            <Button variant="outline" size="sm" onClick={() => setLang(isAr ? "en" : "ar")}>
              <Languages className="size-4" /> {isAr ? "EN" : "ع"}
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 pt-10 pb-6 text-center">
        <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-br from-foreground to-foreground/50 bg-clip-text text-transparent">
          {t("اقرأ. علّمني. ثم اسألني.", "Read. Teach me. Then ask me.")}
        </h2>
        <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
          {t(
            "أضف يومياً ما تتعلمه — ملاحظات، اقتباسات، ملخصات كتب — وسأبني لك عقلاً يتذكر كل شيء ويجيبك منه.",
            "Add what you learn daily — notes, quotes, book summaries — and I'll build a brain that remembers everything and answers from it.",
          )}
        </p>
      </section>

      <main className="max-w-6xl mx-auto px-4 pb-16">
        <Tabs defaultValue="chat" className="w-full">
          <TabsList className="grid grid-cols-2 w-full max-w-md mx-auto">
            <TabsTrigger value="chat" className="gap-2"><MessageSquare className="size-4" />{t("اسأل", "Ask")}</TabsTrigger>
            <TabsTrigger value="memory" className="gap-2"><BookOpen className="size-4" />{t("الذاكرة", "Memory")}</TabsTrigger>
          </TabsList>

          {/* Chat */}
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
                    }`}>
                      {m.text}
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-border p-3 flex gap-2 bg-background">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send()}
                  placeholder={t("اكتب سؤالك…", "Type your question…")}
                  className="flex-1"
                />
                <Button onClick={send} disabled={!input.trim()}>{t("إرسال", "Send")}</Button>
                {chat.length > 0 && (
                  <Button variant="ghost" size="icon" onClick={clearChat} title={t("مسح", "Clear")}>
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </div>
            </Card>
          </TabsContent>

          {/* Memory */}
          <TabsContent value="memory" className="mt-6 grid lg:grid-cols-5 gap-4">
            <Card className="p-4 lg:col-span-2 space-y-3 h-fit">
              <h3 className="font-semibold flex items-center gap-2"><Plus className="size-4" />{t("أضف معرفة جديدة", "Add new knowledge")}</h3>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("العنوان", "Title")} />
              <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder={t("المحتوى، الاقتباس، الفكرة…", "Content, quote, idea…")} rows={6} />
              <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder={t("وسوم مفصولة بفواصل", "Comma-separated tags")} />
              <Button onClick={addItem} className="w-full" disabled={!title.trim() && !content.trim()}>
                <Plus className="size-4" /> {t("احفظ في الذاكرة", "Save to memory")}
              </Button>
            </Card>

            <div className="lg:col-span-3 space-y-3">
              <div className="relative">
                <Search className="size-4 absolute top-1/2 -translate-y-1/2 start-3 text-muted-foreground" />
                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("ابحث في ذاكرتك…", "Search your memory…")} className="ps-9" />
              </div>
              <ScrollArea className="h-[55vh] pr-2">
                <div className="space-y-2">
                  {filtered.length === 0 && (
                    <Card className="p-8 text-center text-muted-foreground">
                      {items.length === 0
                        ? t("ذاكرتك فارغة. ابدأ بإضافة أول معرفة.", "Your memory is empty. Add your first piece of knowledge.")
                        : t("لا توجد نتائج.", "No results.")}
                    </Card>
                  )}
                  {filtered.map((it) => (
                    <Card key={it.id} className="p-4 group">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold truncate">{it.title}</h4>
                          <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{it.content}</p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {it.tags.map((tag) => <Badge key={tag} variant="secondary">{tag}</Badge>)}
                            <span className="text-xs text-muted-foreground ms-auto">
                              {new Date(it.createdAt).toLocaleDateString(isAr ? "ar" : "en")}
                            </span>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => removeItem(it.id)} className="opacity-0 group-hover:opacity-100 transition">
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
            "النسخة الحالية تخزّن ذاكرتك في هذا المتصفح فقط. لتفعيل التعلم الذكي عبر embeddings وحفظ سحابي، فعّل Lovable Cloud.",
            "Current version stores memory in this browser only. Enable Lovable Cloud for smart embeddings learning and cloud sync.",
          )}
        </p>
      </main>
    </div>
  );
}

import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { recordFeedback } from "@/lib/kernel.functions";
import { ThumbsUp, ThumbsDown, RefreshCw } from "lucide-react";

/** أزرار تقييم النتيجة: تغذية راجعة تعلّم منها النواة. */
export function ResultFeedback({
  intent,
  prompt,
  serviceKey,
}: {
  intent: string;
  prompt: string;
  serviceKey?: string;
}) {
  const fn = useServerFn(recordFeedback);
  const [sent, setSent] = useState<string | null>(null);

  const send = async (kind: "like" | "dislike" | "regenerate") => {
    try {
      const r = await fn({ data: { kind, intent, prompt, serviceKey } });
      if (r.ok) setSent(kind);
    } catch {
      /* صامت */
    }
  };

  if (sent)
    return (
      <span className="text-xs text-emerald-600">
        {sent === "like" ? "شكراً — تعلّمت النواة من هذه النتيجة" : sent === "dislike" ? "سنتجنب هذا الأسلوب" : "جارٍ التعلم…"}
      </span>
    );

  return (
    <span className="inline-flex items-center gap-1">
      <button title="نتيجة جيدة" onClick={() => send("like")} className="rounded p-1 text-emerald-600 hover:bg-emerald-500/10">
        <ThumbsUp className="h-3.5 w-3.5" />
      </button>
      <button title="نتيجة رديئة" onClick={() => send("dislike")} className="rounded p-1 text-red-500 hover:bg-red-500/10">
        <ThumbsDown className="h-3.5 w-3.5" />
      </button>
      <button title="أعد التوليد بأسلوب آخر" onClick={() => send("regenerate")} className="rounded p-1 text-muted-foreground hover:bg-muted">
        <RefreshCw className="h-3.5 w-3.5" />
      </button>
    </span>
  );
}

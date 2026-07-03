import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Mic, Square, Volume2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { transcribeAudio } from "@/lib/nawat-transcribe.functions";
import { generateSpeech } from "@/lib/nawat-tts.functions";

type Props = {
  /** Called with the transcribed text when the user finishes recording. */
  onTranscript: (text: string) => void;
  /** Text to read aloud when the speaker button is pressed. */
  speakText?: string;
  lang?: "ar" | "en";
  compact?: boolean;
};

/**
 * VoiceControls — mic (STT via HN) + speaker (TTS via HN with browser fallback).
 * Works fully in-browser: MediaRecorder → base64 → server fn.
 */
export function VoiceControls({ onTranscript, speakText, lang = "ar", compact = false }: Props) {
  const transcribe = useServerFn(transcribeAudio);
  const speak = useServerFn(generateSpeech);

  const [recording, setRecording] = useState(false);
  const [sttBusy, setSttBusy] = useState(false);
  const [ttsBusy, setTtsBusy] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = pickMime();
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = onRecordingStop;
      rec.start();
      recorderRef.current = rec;
      setRecording(true);
    } catch (e: any) {
      toast.error("تعذّر الوصول للميكروفون");
    }
  }

  function stopRecording() {
    try { recorderRef.current?.stop(); } catch {}
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setRecording(false);
  }

  async function onRecordingStop() {
    const blob = new Blob(chunksRef.current, { type: chunksRef.current[0]?.type || "audio/webm" });
    if (blob.size < 1500) { toast.warning("التسجيل قصير جدًا — أعد المحاولة"); return; }
    setSttBusy(true);
    try {
      const b64 = await blobToBase64(blob);
      const fmt = mimeToFormat(blob.type);
      const r: any = await transcribe({ data: { audioBase64: b64, format: fmt, lang } });
      if (r?.text) { onTranscript(r.text.trim()); toast.success("تم تفريغ الصوت"); }
      else toast.error(r?.error || "فشل التفريغ");
    } catch (e: any) {
      toast.error(e?.message || "خطأ في التفريغ");
    } finally { setSttBusy(false); }
  }

  async function playSpeak() {
    const text = (speakText || "").trim();
    if (!text) return;
    setTtsBusy(true);
    try {
      const r: any = await speak({ data: { text: text.slice(0, 4000), voice: "alloy" } });
      if (r?.audioBase64) {
        const src = `data:${r.mime || "audio/mpeg"};base64,${r.audioBase64}`;
        const a = audioRef.current ?? new Audio();
        audioRef.current = a;
        a.src = src;
        await a.play();
        return;
      }
      // Fallback: browser built-in speech synthesis (fully offline).
      browserSpeak(text, lang);
      toast.message("HN TTS غير متاح — قراءة بصوت المتصفح");
    } catch {
      browserSpeak(text, lang);
    } finally { setTtsBusy(false); }
  }

  return (
    <div className={`flex items-center gap-2 ${compact ? "" : "flex-wrap"}`}>
      {!recording ? (
        <Button type="button" variant="outline" size="sm" onClick={startRecording} disabled={sttBusy} title="تسجيل بالصوت">
          {sttBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}
          {!compact && <span className="mr-1">تحدّث</span>}
        </Button>
      ) : (
        <Button type="button" variant="destructive" size="sm" onClick={stopRecording} title="إيقاف التسجيل" className="animate-pulse">
          <Square className="h-4 w-4" />
          {!compact && <span className="mr-1">إيقاف</span>}
        </Button>
      )}
      {speakText !== undefined && (
        <Button type="button" variant="outline" size="sm" onClick={playSpeak} disabled={ttsBusy || !speakText?.trim()} title="اقرأ النص">
          {ttsBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Volume2 className="h-4 w-4" />}
          {!compact && <span className="mr-1">اقرأ</span>}
        </Button>
      )}
    </div>
  );
}

function pickMime(): string | undefined {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
  for (const m of candidates) {
    // @ts-ignore — isTypeSupported is a static method
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported?.(m)) return m;
  }
  return undefined;
}

function mimeToFormat(mime: string): "wav" | "mp3" | "webm" | "m4a" | "ogg" | "aac" | "flac" | "mp4" {
  const m = mime.toLowerCase();
  if (m.includes("webm")) return "webm";
  if (m.includes("mp4")) return "mp4";
  if (m.includes("m4a")) return "m4a";
  if (m.includes("ogg")) return "ogg";
  if (m.includes("wav")) return "wav";
  if (m.includes("mpeg") || m.includes("mp3")) return "mp3";
  if (m.includes("aac")) return "aac";
  if (m.includes("flac")) return "flac";
  return "webm";
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const s = String(r.result || "");
      const comma = s.indexOf(",");
      resolve(comma >= 0 ? s.slice(comma + 1) : s);
    };
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

function browserSpeak(text: string, lang: "ar" | "en") {
  try {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang === "ar" ? "ar-SA" : "en-US";
    u.rate = 1; u.pitch = 1;
    window.speechSynthesis.speak(u);
  } catch {}
}

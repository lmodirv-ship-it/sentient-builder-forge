import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/hooks/useAuthSession";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "الدخول — نواة" },
      { name: "description", content: "سجّل الدخول إلى نواة لاستخدام خدمات الإنشاء عبر منظومة HN." },
      { property: "og:title", content: "الدخول — نواة" },
      { property: "og:description", content: "حساب نواة لحماية خدمات الإنشاء من الاستخدام غير المصرّح به." },
      { property: "og:url", content: "https://chat.hn-chat.com/auth" },
    ],
    links: [{ rel: "canonical", href: "https://chat.hn-chat.com/auth" }],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { session, loading } = useAuthSession();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && session) navigate({ to: "/" });
  }, [loading, session, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/` },
        });
        if (error) throw error;
        toast.success("تم إنشاء الحساب. تحقق من بريدك إن طُلب التأكيد.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("مرحباً بعودتك.");
        navigate({ to: "/" });
      }
    } catch (err: any) {
      toast.error(err?.message || "تعذّر إتمام العملية");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div dir="rtl" className="flex min-h-screen items-center justify-center bg-background px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-sm"
      >
        <h1 className="text-xl font-bold text-foreground">
          {mode === "signin" ? "الدخول إلى نواة" : "إنشاء حساب نواة"}
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          الحساب يحمي خدمات الإنشاء (صور، فيديو، صوت، مواقع) من الاستخدام غير المصرّح به.
        </p>

        <label className="mt-5 block text-sm text-foreground">
          البريد الإلكتروني
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
            dir="ltr"
          />
        </label>

        <label className="mt-3 block text-sm text-foreground">
          كلمة المرور
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
            dir="ltr"
          />
        </label>

        <button
          type="submit"
          disabled={busy}
          className="mt-5 w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          {busy ? "..." : mode === "signin" ? "دخول" : "إنشاء حساب"}
        </button>

        <button
          type="button"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-3 w-full text-xs text-muted-foreground hover:text-foreground"
        >
          {mode === "signin" ? "ليس لديك حساب؟ أنشئ واحداً" : "لديك حساب؟ سجّل الدخول"}
        </button>
      </form>
    </div>
  );
}

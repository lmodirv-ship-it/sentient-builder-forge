import { Link, useRouterState } from "@tanstack/react-router";
import { LogIn, LogOut } from "lucide-react";
import { useAuthSession } from "@/hooks/useAuthSession";
import { supabase } from "@/integrations/supabase/client";

/** Small global banner: creation services need a signed-in account. */
export function AuthBanner() {
  const { session, loading } = useAuthSession();
  const path = useRouterState({ select: (s) => s.location.pathname });

  if (loading || path === "/auth") return null;

  if (!session) {
    return (
      <div
        dir="rtl"
        className="fixed inset-x-0 top-0 z-40 flex items-center justify-center gap-3 bg-primary/10 px-4 py-1.5 text-xs text-foreground backdrop-blur"
      >
        <span>خدمات الإنشاء تتطلب تسجيل الدخول.</span>
        <Link
          to="/auth"
          className="inline-flex items-center gap-1 rounded-md bg-primary px-2 py-1 font-medium text-primary-foreground"
        >
          <LogIn className="size-3" />
          دخول
        </Link>
      </div>
    );
  }

  return (
    <button
      dir="rtl"
      onClick={() => supabase.auth.signOut()}
      className="fixed bottom-3 left-3 z-40 inline-flex items-center gap-1 rounded-md border border-border bg-card/80 px-2 py-1 text-[11px] text-muted-foreground backdrop-blur hover:text-foreground"
    >
      <LogOut className="size-3" />
      خروج
    </button>
  );
}

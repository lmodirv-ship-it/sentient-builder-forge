import { Link, useRouterState } from "@tanstack/react-router";
import { LogIn, LogOut, Shield } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuthSession } from "@/hooks/useAuthSession";
import { supabase } from "@/integrations/supabase/client";
import { getMyRole } from "@/lib/roles.functions";

/** Small global banner: creation services need a signed-in account. */
export function AuthBanner() {
  const { session, loading } = useAuthSession();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const roleFn = useServerFn(getMyRole);
  const { data: role } = useQuery({
    queryKey: ["my-role"],
    queryFn: roleFn,
    enabled: !!session,
    retry: false,
  });

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
    <div dir="rtl" className="fixed bottom-3 left-3 z-40 inline-flex items-center gap-1">
      {role?.isStaff && path !== "/admin" && (
        <Link
          to="/admin"
          className="inline-flex items-center gap-1 rounded-md border border-emerald-500/40 bg-card/80 px-2 py-1 text-[11px] text-emerald-500 backdrop-blur hover:text-emerald-400"
        >
          <Shield className="size-3" />
          لوحة التحكم
        </Link>
      )}
      <button
        onClick={() => supabase.auth.signOut()}
        className="inline-flex items-center gap-1 rounded-md border border-border bg-card/80 px-2 py-1 text-[11px] text-muted-foreground backdrop-blur hover:text-foreground"
      >
        <LogOut className="size-3" />
        خروج
      </button>
    </div>
  );
}

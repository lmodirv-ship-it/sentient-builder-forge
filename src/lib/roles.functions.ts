import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type AppRole = "owner" | "admin" | "editor" | "user";

/** يُستدعى عند كل فتح للجلسة: يثبّت المالك تلقائياً عند أول دخول ببريده، ثم يعيد دور المتصل. */
export const getMyRole = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await context.supabase.rpc("claim_ownership");
    const { data } = await context.supabase
      .from("user_roles")
      .select("role");
    const roles = (data ?? []).map((r: any) => String(r.role) as AppRole);
    const role: AppRole = roles.includes("owner")
      ? "owner"
      : roles.includes("admin")
        ? "admin"
        : roles.includes("editor")
          ? "editor"
          : "user";
    return {
      role,
      isStaff: role === "owner" || role === "admin",
      isOwner: role === "owner",
    };
  });

/** تغيير دور مستخدم — للمالك فقط، عبر دالة قاعدة بيانات آمنة. */
export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({ userId: z.string().uuid(), role: z.enum(["admin", "editor", "user"]) })
      .parse(i),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.rpc("set_user_role", {
      _user_id: data.userId,
      _role: data.role,
    });
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

/** حظر / فك حظر مستخدم — للطاقم (owner/admin). */
export const setUserBanned = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ userId: z.string().uuid(), banned: z.boolean() }).parse(i),
  )
  .handler(async ({ context, data }) => {
    const { data: me } = await context.supabase
      .from("user_roles")
      .select("role");
    const roles = (me ?? []).map((r: any) => String(r.role));
    if (!roles.includes("owner") && !roles.includes("admin"))
      return { ok: false as const, error: "غير مصرّح" };
    const { error } = await context.supabase
      .from("profiles")
      .update({ banned: data.banned })
      .eq("id", data.userId);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

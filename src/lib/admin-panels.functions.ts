import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function isStaff(supabase: any, userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  return (data ?? []).some((r: any) => r.role === "owner" || r.role === "admin");
}

export const listAdminPanels = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (!(await isStaff(context.supabase, context.userId)))
      return { allowed: false as const, panels: [] };
    const { data, error } = await context.supabase
      .from("admin_panels")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) return { allowed: true as const, panels: [], error: error.message };
    return { allowed: true as const, panels: data ?? [] };
  });

export const upsertAdminPanel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        key: z.string().min(2).regex(/^[a-z0-9-_]+$/, "أحرف إنجليزية صغيرة وأرقام و - _ فقط"),
        label: z.string().min(1),
        icon: z.string().optional(),
        description: z.string().optional(),
        sortOrder: z.number().int().optional(),
        enabled: z.boolean().optional(),
        settings: z.record(z.string(), z.unknown()).optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    if (!(await isStaff(context.supabase, context.userId)))
      return { ok: false as const, error: "غير مصرّح" };
    const { error } = await context.supabase.from("admin_panels").upsert(
      {
        key: data.key,
        label: data.label,
        icon: data.icon ?? null,
        description: data.description ?? null,
        sort_order: data.sortOrder ?? 100,
        enabled: data.enabled ?? true,
        ...(data.settings ? { settings: data.settings as any } : {}),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" },
    );
    if (error) return { ok: false as const, error: error.message };
    await context.supabase.from("activity_logs").insert({
      user_id: context.userId,
      action: "panel_saved",
      entity: data.key,
      detail: { label: data.label },
    });
    return { ok: true as const };
  });

export const savePanelSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ key: z.string(), settings: z.record(z.string(), z.unknown()) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    if (!(await isStaff(context.supabase, context.userId)))
      return { ok: false as const, error: "غير مصرّح" };
    const { error } = await context.supabase
      .from("admin_panels")
      .update({ settings: data.settings as any, updated_at: new Date().toISOString() })
      .eq("key", data.key);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

export const deleteAdminPanel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ key: z.string() }).parse(d))
  .handler(async ({ context, data }) => {
    if (!(await isStaff(context.supabase, context.userId)))
      return { ok: false as const, error: "غير مصرّح" };
    const { data: row } = await context.supabase
      .from("admin_panels")
      .select("builtin")
      .eq("key", data.key)
      .maybeSingle();
    if (row?.builtin) return { ok: false as const, error: "لا يمكن حذف قسم أساسي" };
    const { error } = await context.supabase.from("admin_panels").delete().eq("key", data.key);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

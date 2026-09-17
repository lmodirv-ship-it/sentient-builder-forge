import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { DevEnginePanel } from "@/components/DevEnginePanel";


import { getMyRole, setUserBanned, setUserRole } from "@/lib/roles.functions";
import {
  
  checkServiceHealth,
  getAdminLogs,
  getAdminOverview,
  getPlatformSettings,
  listAdminServices,
  listAdminTemplates,
  listAdminUsers,
  saveAdminTemplate,
  setPlatformSetting,
  updateAdminTemplate,
  upsertAdminService,
} from "@/lib/admin.functions";
import { purgeBadKnowledge, retrainKernel } from "@/lib/kernel.functions";
import { invalidateTemplateIndex } from "@/lib/kernel-chat.functions";
import {
  deleteAdminPanel,
  listAdminPanels,
  savePanelSettings,
  upsertAdminPanel,
} from "@/lib/admin-panels.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "لوحة تحكم منصة النواة" },
      { name: "description", content: "إدارة كاملة لمنصة النواة: المستخدمون، خدمات HN، الإعدادات، السجلات، القوالب، والنواة الذكية." },
      { property: "og:title", content: "لوحة تحكم منصة النواة" },
      { property: "og:description", content: "إدارة كاملة لمنصة النواة: المستخدمون، خدمات HN، الإعدادات، السجلات، القوالب، والنواة الذكية." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <AdminPage />,
});

const ICONS: Record<string, string> = {
  chart: "📊",
  users: "👥",
  server: "🛰️",
  settings: "⚙️",
  list: "📜",
  file: "🧩",
  brain: "🧠",
};

type Panel = {
  key: string;
  label: string;
  icon: string | null;
  description: string | null;
  sort_order: number;
  parent_key?: string | null;
  enabled: boolean;
  builtin: boolean;
  settings: any;
};

function Card({ title, value, sub }: { title: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
      <div className="text-xs text-white/50">{title}</div>
      <div className="mt-1 text-2xl font-bold text-emerald-300">{value}</div>
      {sub ? <div className="mt-1 text-xs text-white/40">{sub}</div> : null}
    </div>
  );
}

function AdminPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<string>("overview");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const roleFn = useServerFn(getMyRole);
  const panelsFn = useServerFn(listAdminPanels);
  const { data: role } = useQuery({ queryKey: ["my-role"], queryFn: roleFn });
  const { data: panelsData } = useQuery({ queryKey: ["admin-panels"], queryFn: panelsFn });

  if (!role) return <div className="p-10 text-white/60">جارٍ التحميل…</div>;
  if (!role.isStaff)
    return (
      <div className="p-10 text-center text-white/70">
        هذه اللوحة للمالك والمديرين فقط.
      </div>
    );

  const panels: Panel[] = (panelsData?.panels ?? []) as Panel[];
  const visible = panels.filter((p) => p.enabled);
  const roots = visible.filter((p) => !p.parent_key);
  const childrenOf = (key: string) => visible.filter((p) => p.parent_key === key);
  const active = panels.find((p) => p.key === tab);
  const onChanged = () => qc.invalidateQueries();

  const btnClass = (key: string, child = false) =>
    "flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-right text-sm transition md:w-full " +
    (child ? "md:pr-6 text-xs " : "") +
    (tab === key
      ? "bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-400/50"
      : "text-white/60 hover:bg-white/10");

  return (
    <div dir="rtl" className="min-h-screen bg-[#050807] text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 md:flex-row md:gap-6 md:px-6">
        <aside className="md:w-60 md:shrink-0">
          <div className="rounded-2xl border border-white/10 bg-black/40 p-3">
            <div className="px-2 pb-3">
              <h1 className="text-sm font-bold text-emerald-300">لوحة تحكم النواة</h1>
              <span className="text-[11px] text-white/40">
                دورك: {role.role === "owner" ? "المالك" : role.role === "admin" ? "مدير" : role.role}
              </span>
            </div>
            <nav className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
              {roots.map((p) => {
                const kids = childrenOf(p.key);
                const expanded = openGroups[p.key] ?? kids.some((k) => k.key === tab);
                return (
                  <div key={p.key} className="contents md:block">
                    <button
                      onClick={() => {
                        setTab(p.key);
                        if (kids.length)
                          setOpenGroups((g) => ({ ...g, [p.key]: !expanded }));
                      }}
                      className={btnClass(p.key)}
                    >
                      <span>{ICONS[p.icon ?? ""] ?? "🔹"}</span>
                      <span className="whitespace-nowrap">{p.label}</span>
                      {kids.length > 0 && (
                        <span className="mr-auto text-[10px] text-white/40">
                          {expanded ? "▾" : "▸"}
                        </span>
                      )}
                    </button>
                    {kids.length > 0 && expanded && (
                      <div className="flex gap-1 md:mt-1 md:flex-col md:border-r md:border-white/10 md:pr-1">
                        {kids.map((c) => (
                          <button
                            key={c.key}
                            onClick={() => setTab(c.key)}
                            className={btnClass(c.key, true)}
                          >
                            <span>{ICONS[c.icon ?? ""] ?? "◦"}</span>
                            <span className="whitespace-nowrap">{c.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              {visible.length === 0 && <span className="px-2 text-xs text-white/40">لا أقسام.</span>}
            </nav>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-white/90">{active?.label ?? "لوحة التحكم"}</h2>
            {active?.description ? (
              <p className="text-xs text-white/40">{active.description}</p>
            ) : null}
          </div>
          {tab === "overview" && <Overview />}
          {tab === "users" && <Users canManageRoles={role.isOwner} onChanged={onChanged} />}
          {tab === "services" && <Services onChanged={onChanged} />}
          {tab === "settings" && <Settings onChanged={onChanged} panels={panels} />}
          {tab === "logs" && <Logs />}
          {tab === "templates" && <Templates onChanged={onChanged} />}
          {tab === "kernel" && <Kernel onChanged={onChanged} />}
          {active && !active.builtin && <CustomPanel panel={active} onChanged={onChanged} />}
        </main>
      </div>
    </div>
  );
}

function CustomPanel({ panel, onChanged }: { panel: Panel; onChanged: () => void }) {
  const saveFn = useServerFn(savePanelSettings);
  const [raw, setRaw] = useState(JSON.stringify(panel.settings ?? {}, null, 2));

  const save = async () => {
    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return toast.error("صيغة غير صحيحة");
    }
    const r = await saveFn({ data: { key: panel.key, settings: parsed } });
    if (!r.ok) toast.error(r.error ?? "فشل");
    else {
      toast.success("تم الحفظ");
      onChanged();
    }
  };

  const doc = (panel.settings as any)?.doc as
    | { summary?: string; code?: string; lang?: string; notes?: string[] }
    | undefined;
  const [editing, setEditing] = useState(false);

  return (
    <div className="space-y-4">
      {doc && !editing && (
        <div className="space-y-4">
          {doc.summary && (
            <p className="rounded-2xl bg-white/5 p-4 text-sm leading-7 text-white/80 ring-1 ring-white/10">
              {doc.summary}
            </p>
          )}
          {doc.code && (
            <pre
              dir="ltr"
              className="overflow-x-auto rounded-2xl bg-black/50 p-4 text-left font-mono text-xs leading-6 text-emerald-100 ring-1 ring-emerald-400/20"
            >
              <code>{doc.code}</code>
            </pre>
          )}
          {doc.notes?.length ? (
            <ul className="space-y-2 rounded-2xl bg-white/5 p-4 text-sm text-white/70 ring-1 ring-white/10">
              {doc.notes.map((n, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-emerald-300">•</span>
                  <span>{n}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      )}

      <p className="text-xs text-white/40">
        معرّف القسم في قاعدة البيانات:{" "}
        <code dir="ltr" className="rounded bg-white/10 px-1">{panel.key}</code>
      </p>

      <button
        className="rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white/70 ring-1 ring-white/15"
        onClick={() => setEditing((v) => !v)}
      >
        {editing ? "إخفاء المحرّر" : "تحرير محتوى الصفحة"}
      </button>

      {(editing || !doc) && (
        <div className="space-y-3">
          <textarea
            dir="ltr"
            rows={14}
            className="w-full rounded-2xl bg-white/5 p-3 font-mono text-xs ring-1 ring-white/10"
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
          />
          <button
            className="rounded-lg bg-emerald-500/20 px-4 py-2 text-sm text-emerald-200 ring-1 ring-emerald-400/40"
            onClick={save}
          >
            حفظ محتوى الصفحة
          </button>
        </div>
      )}
    </div>
  );
}

function PanelsManager({ panels, onChanged }: { panels: Panel[]; onChanged: () => void }) {
  const upsertFn = useServerFn(upsertAdminPanel);
  const deleteFn = useServerFn(deleteAdminPanel);
  const [form, setForm] = useState({ key: "", label: "", icon: "", description: "", sortOrder: 100 });
  const [editKey, setEditKey] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState({ label: "", icon: "", description: "", sortOrder: 100 });

  const startEdit = (p: Panel) => {
    setEditKey(p.key);
    setEditDraft({
      label: p.label,
      icon: p.icon ?? "",
      description: p.description ?? "",
      sortOrder: p.sort_order,
    });
  };

  const saveEdit = async (p: Panel) => {
    const r = await upsertFn({
      data: {
        key: p.key,
        label: editDraft.label || p.label,
        icon: editDraft.icon || undefined,
        description: editDraft.description || undefined,
        sortOrder: Number(editDraft.sortOrder) || p.sort_order,
        enabled: p.enabled,
      },
    });
    if (!r.ok) {
      toast.error(r.error ?? "فشل");
      return;
    }
    toast.success("تم الحفظ");
    setEditKey(null);
    onChanged();
  };

  const add = async () => {
    if (!form.key || !form.label) return toast.error("أدخل المعرّف والاسم");
    const r = await upsertFn({
      data: {
        key: form.key,
        label: form.label,
        icon: form.icon || undefined,
        description: form.description || undefined,
        sortOrder: Number(form.sortOrder) || 100,
        enabled: true,
      },
    });
    if (!r.ok) return toast.error(r.error ?? "فشل");
    toast.success("تم إنشاء الزر وصفحته");
    setForm({ key: "", label: "", icon: "", description: "", sortOrder: 100 });
    onChanged();
  };

  const update = async (p: Panel, patch: Partial<Panel>) => {
    const r = await upsertFn({
      data: {
        key: p.key,
        label: (patch.label ?? p.label) as string,
        icon: (patch.icon ?? p.icon) ?? undefined,
        description: (patch.description ?? p.description) ?? undefined,
        sortOrder: (patch.sort_order ?? p.sort_order) as number,
        enabled: (patch.enabled ?? p.enabled) as boolean,
      },
    });
    if (!r.ok) toast.error(r.error ?? "فشل");
    else onChanged();
  };

  const remove = async (p: Panel) => {
    const r = await deleteFn({ data: { key: p.key } });
    if (!r.ok) toast.error(r.error ?? "فشل");
    else {
      toast.success("تم الحذف");
      onChanged();
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 p-4">
        <h3 className="mb-2 text-sm font-semibold text-white/70">إضافة زر جديد (يُنشئ صفحته تلقائياً)</h3>
        <div className="flex flex-wrap gap-2">
          <input dir="ltr" className="rounded-lg bg-white/5 px-3 py-2 text-sm ring-1 ring-white/10" placeholder="المعرّف (key)" value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} />
          <input className="rounded-lg bg-white/5 px-3 py-2 text-sm ring-1 ring-white/10" placeholder="الاسم الظاهر" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
          <select className="rounded-lg bg-white/5 px-3 py-2 text-sm ring-1 ring-white/10" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })}>
            <option value="" className="bg-black">أيقونة</option>
            {Object.keys(ICONS).map((i) => (
              <option key={i} value={i} className="bg-black">{ICONS[i]} {i}</option>
            ))}
          </select>
          <input className="min-w-[200px] flex-1 rounded-lg bg-white/5 px-3 py-2 text-sm ring-1 ring-white/10" placeholder="وصف مختصر" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <input type="number" className="w-24 rounded-lg bg-white/5 px-3 py-2 text-sm ring-1 ring-white/10" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} />
          <button className="rounded-lg bg-emerald-500/20 px-4 py-2 text-sm text-emerald-200 ring-1 ring-emerald-400/40" onClick={add}>إنشاء</button>
        </div>
      </div>

      <div className="space-y-2">
        {panels.map((p) => {
          const isEditing = editKey === p.key;
          return (
            <div key={p.key} className="rounded-xl border border-white/10 p-3 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span>{ICONS[p.icon ?? ""] ?? "🔹"}</span>
                <span className="font-semibold text-white/80">{p.label}</span>
                <code dir="ltr" className="rounded bg-white/10 px-1 text-white/50">{p.key}</code>
                {p.builtin && <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-emerald-200">أساسي</span>}
                <button
                  className="rounded bg-white/10 px-2 py-1 text-emerald-200 hover:bg-white/20"
                  onClick={() => (isEditing ? setEditKey(null) : startEdit(p))}
                >
                  {isEditing ? "إغلاق" : "تعديل"}
                </button>
                <button className="rounded bg-white/10 px-2 py-1 hover:bg-white/20" onClick={() => update(p, { enabled: !p.enabled })}>
                  {p.enabled ? "إخفاء" : "إظهار"}
                </button>
                {!p.builtin && (
                  <button className="rounded bg-red-500/20 px-2 py-1 text-red-200 hover:bg-red-500/30" onClick={() => remove(p)}>
                    حذف
                  </button>
                )}
              </div>
              {isEditing && (
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/10 pt-3">
                  <input
                    className="rounded-lg bg-white/5 px-3 py-2 text-sm ring-1 ring-white/10"
                    placeholder="الاسم الظاهر"
                    value={editDraft.label}
                    onChange={(e) => setEditDraft({ ...editDraft, label: e.target.value })}
                  />
                  <select
                    className="rounded-lg bg-white/5 px-3 py-2 text-sm ring-1 ring-white/10"
                    value={editDraft.icon}
                    onChange={(e) => setEditDraft({ ...editDraft, icon: e.target.value })}
                  >
                    <option value="" className="bg-black">أيقونة</option>
                    {Object.entries(ICONS).map(([i, label]) => (
                      <option key={i} value={i} className="bg-black">{label} {i}</option>
                    ))}
                  </select>
                  <input
                    className="min-w-[200px] flex-1 rounded-lg bg-white/5 px-3 py-2 text-sm ring-1 ring-white/10"
                    placeholder="وصف مختصر"
                    value={editDraft.description}
                    onChange={(e) => setEditDraft({ ...editDraft, description: e.target.value })}
                  />
                  <input
                    type="number"
                    className="w-24 rounded-lg bg-white/5 px-3 py-2 text-sm ring-1 ring-white/10"
                    value={editDraft.sortOrder}
                    onChange={(e) => setEditDraft({ ...editDraft, sortOrder: Number(e.target.value) })}
                  />
                  <button
                    className="rounded-lg bg-emerald-500/20 px-4 py-2 text-sm text-emerald-200 ring-1 ring-emerald-400/40"
                    onClick={() => saveEdit(p)}
                  >
                    حفظ
                  </button>
                  <button
                    className="rounded-lg bg-white/10 px-4 py-2 text-sm text-white/60 ring-1 ring-white/15"
                    onClick={() => setEditKey(null)}
                  >
                    إلغاء
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Overview() {
  const fn = useServerFn(getAdminOverview);
  const { data } = useQuery({ queryKey: ["admin-overview"], queryFn: fn });
  if (!data?.allowed) return <p className="text-white/60">غير مصرّح.</p>;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card title="عمليات اليوم" value={data.jobsToday} />
        <Card title="إجمالي العمليات" value={data.totalJobs} />
        <Card title="المستخدمون" value={data.totalUsers} />
        <Card title="نسبة النجاح" value={`${data.successRate}%`} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Card title="إعجاب" value={data.feedback.like} />
        <Card title="عدم إعجاب" value={data.feedback.dislike} />
        <Card title="إعادة توليد" value={data.feedback.regenerate} />
      </div>
      <div>
        <h2 className="mb-2 text-sm font-semibold text-white/70">حسب النوع</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Object.entries(data.byKind).map(([kind, v]) => (
            <Card key={kind} title={kind} value={`${v.ok}/${v.total}`} sub="نجحت/إجمالي" />
          ))}
        </div>
      </div>
      <div>
        <h2 className="mb-2 text-sm font-semibold text-white/70">آخر العمليات</h2>
        <div className="overflow-hidden rounded-2xl border border-white/10">
          <table className="w-full text-right text-xs">
            <thead className="bg-white/5 text-white/50">
              <tr>
                <th className="p-2">النوع</th>
                <th className="p-2">الحالة</th>
                <th className="p-2">المدة</th>
                <th className="p-2">الخطأ</th>
                <th className="p-2">التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {data.recentJobs.map((j: any) => (
                <tr key={j.id} className="border-t border-white/5">
                  <td className="p-2">{j.kind}</td>
                  <td className={"p-2 " + (j.status === "success" ? "text-emerald-300" : "text-red-300")}>{j.status}</td>
                  <td className="p-2">{j.duration_ms ?? "—"} مللي</td>
                  <td className="max-w-[240px] truncate p-2 text-white/40">{j.error ?? ""}</td>
                  <td className="p-2 text-white/40">{new Date(j.created_at).toLocaleString("ar")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Users({ canManageRoles, onChanged }: { canManageRoles: boolean; onChanged: () => void }) {
  const fn = useServerFn(listAdminUsers);
  const roleFn = useServerFn(setUserRole);
  const banFn = useServerFn(setUserBanned);
  const { data } = useQuery({ queryKey: ["admin-users"], queryFn: fn });
  if (!data?.allowed) return <p className="text-white/60">غير مصرّح.</p>;

  const changeRole = async (userId: string, role: string) => {
    const r = await roleFn({ data: { userId, role: role as any } });
    if (!r.ok) toast.error(r.error ?? "فشل");
    else {
      toast.success("تم تحديث الدور");
      onChanged();
    }
  };
  const toggleBan = async (userId: string, banned: boolean) => {
    const r = await banFn({ data: { userId, banned } });
    if (!r.ok) toast.error(r.error ?? "فشل");
    else {
      toast.success(banned ? "تم الحظر" : "تم فك الحظر");
      onChanged();
    }
  };

  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10">
      <table className="w-full text-right text-xs">
        <thead className="bg-white/5 text-white/50">
          <tr>
            <th className="p-2">البريد</th>
            <th className="p-2">الدور</th>
            <th className="p-2">عمليات اليوم</th>
            <th className="p-2">الحالة</th>
            <th className="p-2">إجراءات</th>
          </tr>
        </thead>
        <tbody>
          {data.users.map((u: any) => (
            <tr key={u.id} className="border-t border-white/5">
              <td className="p-2" dir="ltr">{u.email || u.id.slice(0, 8)}</td>
              <td className="p-2">{u.role === "owner" ? "المالك" : u.role}</td>
              <td className="p-2">{u.jobsToday}</td>
              <td className={"p-2 " + (u.banned ? "text-red-300" : "text-emerald-300")}>
                {u.banned ? "محظور" : "نشط"}
              </td>
              <td className="flex flex-wrap gap-1 p-2">
                {canManageRoles && u.role !== "owner" && (
                  <>
                    <button className="rounded bg-white/10 px-2 py-1 hover:bg-white/20" onClick={() => changeRole(u.id, "admin")}>مدير</button>
                    <button className="rounded bg-white/10 px-2 py-1 hover:bg-white/20" onClick={() => changeRole(u.id, "editor")}>محرر</button>
                    <button className="rounded bg-white/10 px-2 py-1 hover:bg-white/20" onClick={() => changeRole(u.id, "user")}>مستخدم</button>
                  </>
                )}
                {u.role !== "owner" && (
                  <button
                    className="rounded bg-red-500/20 px-2 py-1 text-red-200 hover:bg-red-500/30"
                    onClick={() => toggleBan(u.id, !u.banned)}
                  >
                    {u.banned ? "فك الحظر" : "حظر"}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Services({ onChanged }: { onChanged: () => void }) {
  const fn = useServerFn(listAdminServices);
  const healthFn = useServerFn(checkServiceHealth);
  const upsertFn = useServerFn(upsertAdminService);
  const { data } = useQuery({ queryKey: ["admin-services"], queryFn: fn });
  const [form, setForm] = useState({ key: "", name: "", url: "", priority: 100 });
  if (!data?.allowed) return <p className="text-white/60">غير مصرّح.</p>;

  const check = async (key: string, url: string) => {
    const r = await healthFn({ data: { key, url } });
    toast[r.ok ? "success" : "error"](r.ok ? `تعمل — ${r.latencyMs} مللي` : `تعطّلت: ${r.error}`);
    onChanged();
  };
  const add = async () => {
    if (!form.key || !form.name || !form.url) return toast.error("أكمل الحقول");
    const r = await upsertFn({
      data: { key: form.key, name: form.name, url: form.url, capabilities: [], enabled: true, priority: form.priority },
    });
    if (!r.ok) toast.error(r.error ?? "فشل");
    else {
      toast.success("تم الحفظ");
      setForm({ key: "", name: "", url: "", priority: 100 });
      onChanged();
    }
  };

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full text-right text-xs">
          <thead className="bg-white/5 text-white/50">
            <tr>
              <th className="p-2">المفتاح</th>
              <th className="p-2">الاسم</th>
              <th className="p-2">الرابط</th>
              <th className="p-2">مفعّلة</th>
              <th className="p-2">آخر فحص</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {data.services.map((s: any) => {
              const h = data.lastHealth[s.key];
              return (
                <tr key={s.key} className="border-t border-white/5">
                  <td className="p-2">{s.key}</td>
                  <td className="p-2">{s.name}</td>
                  <td className="p-2" dir="ltr"><a className="text-emerald-300 underline" href={s.url} target="_blank" rel="noreferrer">{s.url}</a></td>
                  <td className={"p-2 " + (s.enabled ? "text-emerald-300" : "text-white/40")}>{s.enabled ? "نعم" : "لا"}</td>
                  <td className="p-2">
                    {h ? (
                      <span className={h.ok ? "text-emerald-300" : "text-red-300"}>
                        {h.ok ? `تعمل (${h.latency_ms}مل)` : h.error}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="p-2">
                    <button className="rounded bg-white/10 px-2 py-1 hover:bg-white/20" onClick={() => check(s.key, s.url)}>فحص</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="rounded-2xl border border-white/10 p-4">
        <h3 className="mb-2 text-sm font-semibold text-white/70">إضافة/تحديث خدمة</h3>
        <div className="flex flex-wrap gap-2">
          <input className="rounded-lg bg-white/5 px-3 py-2 text-sm outline-none ring-1 ring-white/10" placeholder="المفتاح" value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} />
          <input className="rounded-lg bg-white/5 px-3 py-2 text-sm outline-none ring-1 ring-white/10" placeholder="الاسم" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="rounded-lg bg-white/5 px-3 py-2 text-sm outline-none ring-1 ring-white/10" placeholder="https://…" dir="ltr" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
          <button className="rounded-lg bg-emerald-500/20 px-4 py-2 text-sm text-emerald-200 ring-1 ring-emerald-400/40" onClick={add}>حفظ</button>
        </div>
      </div>
    </div>
  );
}

function DocsLibrary({ panels, onChanged }: { panels: Panel[]; onChanged: () => void }) {
  const docs = panels.filter((p) => !p.builtin && (p.settings as any)?.doc);
  const groups = docs.filter((p) => !p.parent_key && docs.some((d) => d.parent_key === p.key));
  const [sel, setSel] = useState<string | null>(null);
  const current = docs.find((p) => p.key === sel) ?? null;

  if (docs.length === 0)
    return <p className="text-xs text-white/40">لا توجد شروحات بعد.</p>;

  return (
    <div className="space-y-3">
      {groups.map((g) => {
        const kids = docs.filter((p) => p.parent_key === g.key);
        return (
          <div key={g.key} className="rounded-2xl border border-white/10 p-3">
            <button
              onClick={() => setSel(sel === g.key ? null : g.key)}
              className="text-sm font-semibold text-emerald-300"
            >
              {ICONS[g.icon ?? ""] ?? "🔹"} {g.label}
            </button>
            {g.description ? (
              <p className="mt-1 text-[11px] text-white/40">{g.description}</p>
            ) : null}
            {kids.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {kids.map((k) => (
                  <button
                    key={k.key}
                    onClick={() => setSel(sel === k.key ? null : k.key)}
                    className={
                      "rounded-lg px-3 py-1.5 text-xs ring-1 transition " +
                      (sel === k.key
                        ? "bg-emerald-500/20 text-emerald-200 ring-emerald-400/50"
                        : "bg-white/5 text-white/60 ring-white/10 hover:bg-white/10")
                    }
                  >
                    {k.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}

      <div className="flex flex-wrap gap-2">
        {docs
          .filter((p) => !p.parent_key && docs.every((d) => d.parent_key !== p.key))
          .map((p) => (
            <button
              key={p.key}
              onClick={() => setSel(sel === p.key ? null : p.key)}
              className={
                "rounded-lg px-3 py-1.5 text-xs ring-1 transition " +
                (sel === p.key
                  ? "bg-emerald-500/20 text-emerald-200 ring-emerald-400/50"
                  : "bg-white/5 text-white/60 ring-white/10 hover:bg-white/10")
              }
            >
              {ICONS[p.icon ?? ""] ?? "🔹"} {p.label}
            </button>
          ))}
      </div>

      {current && (
        <div className="rounded-2xl border border-emerald-400/20 bg-black/30 p-4">
          <h4 className="mb-3 text-sm font-bold text-emerald-200">{current.label}</h4>
          <CustomPanel panel={current} onChanged={onChanged} />
        </div>
      )}
    </div>
  );
}

function Settings({ onChanged, panels }: { onChanged: () => void; panels: Panel[] }) {
  const fn = useServerFn(getPlatformSettings);
  const setFn = useServerFn(setPlatformSetting);
  const { data } = useQuery({ queryKey: ["admin-settings"], queryFn: fn });
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  if (!data?.allowed) return <p className="text-white/60">غير مصرّح.</p>;

  const save = async (key: string, raw: string) => {
    let value: unknown = raw;
    try {
      value = JSON.parse(raw);
    } catch {
      /* نص عادي */
    }
    const r = await setFn({ data: { key, value } });
    if (!r.ok) toast.error(r.error ?? "فشل");
    else {
      toast.success("تم الحفظ");
      onChanged();
    }
  };

  return (
    <div className="space-y-6">
      <section>
        <h3 className="mb-1 text-sm font-semibold text-white/70">محرّك التطوير الذاتي</h3>
        <p className="mb-3 text-xs text-white/50">تطوير الذات، الأمان، المكتبات، تطوير شامل، وسجل التتبع.</p>
        <div className="rounded-2xl border border-white/10 p-3">
          <DevEnginePanel embedded />
        </div>
      </section>
      <section>
        <h3 className="mb-2 text-sm font-semibold text-white/70">الأدوات والشروحات</h3>
        <DocsLibrary panels={panels} onChanged={onChanged} />
      </section>
      <section>
        <h3 className="mb-2 text-sm font-semibold text-white/70">أزرار اللوحة وصفحاتها</h3>
        <PanelsManager panels={panels} onChanged={onChanged} />
      </section>
      <section className="space-y-3">
      <h3 className="text-sm font-semibold text-white/70">إعدادات المنصة</h3>
      {data.settings.map((s: any) => (
        <div key={s.key} className="rounded-2xl border border-white/10 p-3">
          <div className="mb-1 text-xs text-white/50">{s.key}</div>
          <div className="flex gap-2">
            <input
              dir="ltr"
              className="w-full rounded-lg bg-white/5 px-3 py-2 text-sm outline-none ring-1 ring-white/10"
              value={drafts[s.key] ?? JSON.stringify(s.value)}
              onChange={(e) => setDrafts({ ...drafts, [s.key]: e.target.value })}
            />
            <button className="rounded-lg bg-emerald-500/20 px-4 py-2 text-sm text-emerald-200 ring-1 ring-emerald-400/40" onClick={() => save(s.key, drafts[s.key] ?? JSON.stringify(s.value))}>حفظ</button>
          </div>
        </div>
      ))}
 {data.settings.length === 0 && <p className="text-white/50">لا إعدادات بعد.</p>}
      </section>
    </div>
  );
}

function Logs() {
  const fn = useServerFn(getAdminLogs);
  const { data } = useQuery({ queryKey: ["admin-logs"], queryFn: () => fn({ data: { limit: 100 } }) });
  if (!data?.allowed) return <p className="text-white/60">غير مصرّح.</p>;
  return (
    <div className="space-y-2">
      {data.logs.map((l: any) => (
        <div key={l.id} className="rounded-xl border border-white/10 p-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-emerald-200">{l.action}</span>
            <span className="text-white/40">{l.entity ?? ""}</span>
            <span className="text-white/30">{new Date(l.created_at).toLocaleString("ar")}</span>
          </div>
          {l.detail ? <pre className="mt-1 max-w-full overflow-x-auto text-[10px] text-white/40" dir="ltr">{JSON.stringify(l.detail)}</pre> : null}
        </div>
      ))}
      {data.logs.length === 0 && <p className="text-white/50">لا سجلات بعد.</p>}
    </div>
  );
}

function TemplateRow({ t, onChanged }: { t: any; onChanged: () => void }) {
  const updateFn = useServerFn(updateAdminTemplate);
  const refreshIndex = useServerFn(invalidateTemplateIndex);
  const [q, setQ] = useState(t.title ?? "");
  const [a, setA] = useState(t.body ?? "");
  const [editing, setEditing] = useState(false);
  const dirty = q !== (t.title ?? "") || a !== (t.body ?? "");

  const save = async () => {
    if (!q.trim() || !a.trim()) return toast.error("أكمل السؤال والجواب");
    const r = await updateFn({ data: { id: t.id, title: q, body: a } });
    if (!r.ok) toast.error(r.error ?? "فشل");
    else {
      try { await refreshIndex({ data: {} } as any); } catch { /* ignore */ }
      toast.success("تم التحديث"); setEditing(false); onChanged();
    }
  };

  const cancel = () => {
    setQ(t.title ?? "");
    setA(t.body ?? "");
    setEditing(false);
  };

  return (
    <tr className={"border-t border-white/10 align-top " + (t.archived ? "opacity-40" : "")}>
      <td className="p-2 font-mono text-emerald-300" dir="ltr">{t.code ?? "—"}</td>
      <td className="p-2">
        <textarea
          rows={2}
          className="w-full resize-y rounded-lg bg-white/5 p-2 text-sm ring-1 ring-white/10 disabled:opacity-70"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          disabled={!editing}
        />
      </td>
      <td className="p-2">
        <textarea
          rows={3}
          className="w-full resize-y rounded-lg bg-white/5 p-2 text-sm ring-1 ring-white/10 disabled:opacity-70"
          value={a}
          onChange={(e) => setA(e.target.value)}
          disabled={!editing}
        />
      </td>
      <td className="whitespace-nowrap p-2">
        <div className="flex flex-col gap-1">
          {editing ? (
            <>
              <button
                className="rounded bg-emerald-500/20 px-2 py-1 text-emerald-200 ring-1 ring-emerald-400/40 disabled:opacity-40"
                disabled={!dirty}
                onClick={save}
              >
                حفظ
              </button>
              <button
                className="rounded bg-white/10 px-2 py-1 hover:bg-white/20"
                onClick={cancel}
              >
                إلغاء
              </button>
            </>
          ) : (
            <button
              className="rounded bg-white/10 px-2 py-1 hover:bg-white/20"
              onClick={() => setEditing(true)}
            >
              تعديل
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

function Templates({ onChanged }: { onChanged: () => void }) {
  const fn = useServerFn(listAdminTemplates);
  const saveFn = useServerFn(saveAdminTemplate);
  const { data } = useQuery({ queryKey: ["admin-templates"], queryFn: fn });
  const [form, setForm] = useState({ kind: "chat", title: "", body: "" });
  if (!data?.allowed) return <p className="text-white/60">غير مصرّح.</p>;

  const save = async () => {
    if (!form.title || !form.body) return toast.error("أكمل السؤال والجواب");
    const r = await saveFn({ data: { ...form, tags: [] } });
    if (!r.ok) toast.error(r.error ?? "فشل");
    else {
      toast.success("تم حفظ القالب — تم توليد المعرّف تلقائيًا");
      setForm({ kind: form.kind, title: "", body: "" });
      onChanged();
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 p-4">
        <div className="grid gap-2 md:grid-cols-[auto_1fr_1fr_auto]">
          <select className="rounded-lg bg-white/5 px-3 py-2 text-sm ring-1 ring-white/10" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
            {["chat", "image", "tts", "video", "site", "cv"].map((k) => (
              <option key={k} value={k} className="bg-black">{k}</option>
            ))}
          </select>
          <textarea rows={2} className="resize-y rounded-lg bg-white/5 px-3 py-2 text-sm ring-1 ring-white/10" placeholder="السؤال" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <textarea rows={2} className="resize-y rounded-lg bg-white/5 px-3 py-2 text-sm ring-1 ring-white/10" placeholder="الجواب" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
          <button className="rounded-lg bg-emerald-500/20 px-4 py-2 text-sm text-emerald-200 ring-1 ring-emerald-400/40" onClick={save}>إضافة</button>
        </div>
        <p className="mt-2 text-xs text-white/40">المعرّف يُولَّد تلقائيًا (حرف + ستة أرقام) ويُحفظ في قاعدة البيانات.</p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full text-right text-xs">
          <thead className="bg-white/5 text-white/70">
            <tr>
              <th className="p-2 font-medium">المعرّف</th>
              <th className="p-2 font-medium">السؤال</th>
              <th className="p-2 font-medium">الجواب</th>
              <th className="p-2 font-medium">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {data.templates.map((t: any) => (
              <TemplateRow key={t.id} t={t} onChanged={onChanged} />
            ))}
          </tbody>
        </table>
        {data.templates.length === 0 && <p className="p-3 text-white/50">لا قوالب بعد.</p>}
      </div>
    </div>
  );
}

function Kernel({ onChanged }: { onChanged: () => void }) {
  const retrainFn = useServerFn(retrainKernel);
  const purgeFn = useServerFn(purgeBadKnowledge);

  const retrain = async () => {
    const r = await retrainFn({ data: undefined });
    if (!r.ok) toast.error(r.error ?? "فشل");
    else {
      toast.success(`تم تحديث ${r.updated} سياسة`);
      onChanged();
    }
  };
  const purge = async () => {
    const r = await purgeFn({ data: undefined });
    if (!r.ok) toast.error(r.error ?? "فشل");
    else {
      toast.success("تم تنظيف الذاكرة الرديئة");
      onChanged();
    }
  };

  return (
    <div className="space-y-3 text-sm">
      <p className="text-white/60">
        النواة تتعلم من كل عملية: تُسجَّل النتائج في الذاكرة، والتقييمات تضبط أوزان الخدمات.
        أعد التدريب يدوياً لإعادة حساب نسب النجاح من سجل العمليات.
      </p>
      <div className="flex flex-wrap gap-2">
        <button className="rounded-lg bg-emerald-500/20 px-4 py-2 text-emerald-200 ring-1 ring-emerald-400/40 hover:bg-emerald-500/30" onClick={retrain}>
          إعادة تدريب النواة
        </button>
        <button className="rounded-lg bg-red-500/15 px-4 py-2 text-red-200 ring-1 ring-red-400/30 hover:bg-red-500/25" onClick={purge}>
          تنظيف الذاكرة الرديئة
        </button>
      </div>
    </div>
  );
}

export default AdminPage;

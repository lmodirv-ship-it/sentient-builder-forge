import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "الإعدادات — نواة" },
      { name: "description", content: "إدارة مفتاح HN ومسار حفظ الملفات" },
      { property: "og:title", content: "الإعدادات — نواة" },
      { property: "og:description", content: "إدارة مفتاح HN ومسار حفظ الملفات داخل نواة." },
      { property: "og:url", content: "https://chat.hn-chat.com/settings" },
    ],
    links: [{ rel: "canonical", href: "https://chat.hn-chat.com/settings" }],
  }),
  component: SettingsPage,
});

const LS_KEY = "nawat.hnApiKey";

function SettingsPage() {
  const [apiKey, setApiKey] = useState("");
  const [savedKey, setSavedKey] = useState("");
  const [dir, setDir] = useState<string>("");
  const [isElectron, setIsElectron] = useState(false);
  const [msg, setMsg] = useState<string>("");

  useEffect(() => {
    const k = localStorage.getItem(LS_KEY) ?? "";
    setApiKey(k);
    setSavedKey(k);
    const w = window as any;
    setIsElectron(Boolean(w.nawatFS));
    if (w.nawatFS?.dir) {
      w.nawatFS.dir().then((d: string) => setDir(d || "")).catch(() => {});
    }
  }, []);

  const saveKey = () => {
    const v = apiKey.trim();
    if (v) localStorage.setItem(LS_KEY, v);
    else localStorage.removeItem(LS_KEY);
    setSavedKey(v);
    setMsg("تم حفظ المفتاح ✔");
    setTimeout(() => setMsg(""), 2500);
  };

  const chooseDir = async () => {
    const w = window as any;
    if (!w.nawatFS?.chooseDir) return;
    const chosen = await w.nawatFS.chooseDir();
    if (chosen) {
      setDir(chosen);
      setMsg("تم تحديث المسار ✔");
      setTimeout(() => setMsg(""), 2500);
    }
  };

  const openDir = async () => {
    const w = window as any;
    if (w.nawatFS?.openDir) await w.nawatFS.openDir();
  };

  const masked = savedKey ? savedKey.slice(0, 4) + "•".repeat(Math.max(0, savedKey.length - 8)) + savedKey.slice(-4) : "غير مضبوط";

  return (
    <div dir="rtl" className="mx-auto max-w-2xl p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">الإعدادات</h1>
        <p className="text-sm text-muted-foreground">تحكم بالمفتاح ومسار الحفظ من داخل التطبيق — لا حاجة لتحرير .env.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>HN_API_KEY</CardTitle>
          <CardDescription>يستخدم لكل خدمات مجموعة HN. الحالي: <code>{masked}</code></CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Label htmlFor="k">المفتاح</Label>
          <Input id="k" type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="hn-..." />
          <div className="flex gap-2">
            <Button onClick={saveKey}>حفظ</Button>
            <Button variant="outline" onClick={() => { setApiKey(""); localStorage.removeItem(LS_KEY); setSavedKey(""); }}>مسح</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>مسار حفظ الملفات</CardTitle>
          <CardDescription>{isElectron ? "المجلد الذي يحفظ فيه التطبيق كل الملفات الناتجة." : "متاح فقط داخل تطبيق سطح المكتب (Nawat.exe)."}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded border bg-muted/40 p-3 text-sm break-all">{dir || "—"}</div>
          <div className="flex gap-2">
            <Button onClick={chooseDir} disabled={!isElectron}>اختر مجلدًا…</Button>
            <Button variant="outline" onClick={openDir} disabled={!isElectron}>فتح المجلد</Button>
          </div>
        </CardContent>
      </Card>

      {msg && <div className="text-sm text-emerald-600">{msg}</div>}
    </div>
  );
}

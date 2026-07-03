import { useEffect, useState } from "react";
import { toast } from "sonner";

// Small banner + toast that reflects the browser's online state.
// Data-heavy features work offline; HN calls need network.
export function OfflineIndicator() {
  const [online, setOnline] = useState<boolean>(
    typeof navigator === "undefined" ? true : navigator.onLine,
  );

  useEffect(() => {
    const on = () => {
      setOnline(true);
      toast.success("عاد الاتصال بالإنترنت — يمكنك استخدام خدمات HN الآن.", { id: "net" });
    };
    const off = () => {
      setOnline(false);
      toast.warning("أنت الآن دون اتصال — الميزات المحلية تعمل، خدمات HN معطّلة مؤقتًا.", {
        id: "net",
        duration: 6000,
      });
    };
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  if (online) return null;
  return (
    <div
      dir="rtl"
      className="fixed bottom-3 left-1/2 z-[60] -translate-x-1/2 rounded-full border border-amber-500/40 bg-amber-500/15 px-4 py-1.5 text-xs font-medium text-amber-700 shadow-md backdrop-blur dark:text-amber-300"
      role="status"
      aria-live="polite"
    >
      دون اتصال · الوضع المحلي فقط
    </div>
  );
}

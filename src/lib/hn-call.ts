// Client-side wrapper around HN server-function calls.
// - Retries transient failures automatically (exponential backoff).
// - Surfaces a friendly Arabic message via sonner toast.
// - Exposes a "retry" action in the toast for the user.

import { toast } from "sonner";

export type HNCallResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; friendly: string; status?: number; attempts: number };

export type HNCallOptions = {
  label?: string; // service label shown in messages, e.g. "توليد صورة"
  maxAttempts?: number; // default 3
  baseDelayMs?: number; // default 600
  silent?: boolean; // don't show toast on success/failure
};

function friendlyClient(err: unknown, status?: number): string {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  if (/timeout|abort/i.test(msg)) return "انتهت مهلة الاتصال بخدمة HN.";
  if (/network|fetch failed|Failed to fetch/i.test(msg)) return "لا يوجد اتصال بالإنترنت أو الخادم غير متاح.";
  if (status === 401 || status === 403 || /unauthor/i.test(msg))
    return "المفتاح HN_API_KEY غير صالح — حدّثه من /settings.";
  if (status === 429 || /rate/i.test(msg)) return "تجاوزنا حد الطلبات على HN — انتظر قليلًا.";
  if (status && status >= 500) return "خطأ داخلي في خدمة HN — نعيد المحاولة تلقائيًا.";
  return "تعذر إتمام الطلب على HN. سنعيد المحاولة.";
}

function isRetriable(status?: number, msg?: string): boolean {
  if (!status) return true;
  if (status === 408 || status === 429) return true;
  if (status >= 500) return true;
  if (msg && /timeout|network|fetch failed/i.test(msg)) return true;
  return false;
}

/**
 * Invoke a server-function (or any async op) with automatic retry
 * and standardized HN error handling.
 *
 * @example
 *   const r = await hnCall(() => generateImage({ data: { prompt } }), { label: "توليد صورة" });
 *   if (r.ok) setImage(r.data.imageUrl);
 */
export async function hnCall<T>(
  fn: () => Promise<T>,
  opts: HNCallOptions = {},
): Promise<HNCallResult<T>> {
  const { label = "خدمة HN", maxAttempts = 3, baseDelayMs = 600, silent = false } = opts;
  let lastErr: unknown = null;
  let lastStatus: number | undefined;
  let toastId: string | number | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const data = await fn();
      // Server functions often return { ok: false, friendly } instead of throwing.
      const anyData = data as any;
      if (anyData && typeof anyData === "object" && anyData.ok === false) {
        lastErr = anyData.error || "failed";
        lastStatus = anyData.status;
        const friendly = anyData.friendly || friendlyClient(lastErr, lastStatus);
        if (!isRetriable(lastStatus, String(lastErr)) || attempt === maxAttempts) {
          if (!silent) {
            toast.error(`${label}: ${friendly}`, {
              id: toastId,
              action: { label: "إعادة المحاولة", onClick: () => void hnCall(fn, opts) },
            });
          }
          return { ok: false, error: String(lastErr), friendly, status: lastStatus, attempts: attempt };
        }
        if (!silent) toastId = toast.loading(`${label}: محاولة ${attempt + 1} من ${maxAttempts}…`, { id: toastId });
      } else {
        if (!silent && toastId) toast.dismiss(toastId);
        return { ok: true, data };
      }
    } catch (e: any) {
      lastErr = e;
      lastStatus = e?.status;
      const msg = String(e?.message || e);
      if (!isRetriable(lastStatus, msg) || attempt === maxAttempts) {
        const friendly = friendlyClient(e, lastStatus);
        if (!silent) {
          toast.error(`${label}: ${friendly}`, {
            id: toastId,
            action: { label: "إعادة المحاولة", onClick: () => void hnCall(fn, opts) },
          });
        }
        return { ok: false, error: msg, friendly, status: lastStatus, attempts: attempt };
      }
      if (!silent) toastId = toast.loading(`${label}: محاولة ${attempt + 1} من ${maxAttempts}…`, { id: toastId });
    }
    await new Promise((r) => setTimeout(r, baseDelayMs * Math.pow(2, attempt - 1)));
  }

  const friendly = friendlyClient(lastErr, lastStatus);
  if (!silent) toast.error(`${label}: ${friendly}`, { id: toastId });
  return { ok: false, error: String(lastErr), friendly, status: lastStatus, attempts: maxAttempts };
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type ToastTone = "success" | "error" | "warning" | "info";

export type ToastItem = {
  id: string;
  title?: string;
  message: string;
  tone?: ToastTone;
  durationMs?: number;
};

const toneStyles: Record<ToastTone, string> = {
  success: "border-emerald-200",
  error: "border-red-200",
  warning: "border-yellow-200",
  info: "border-slate-200",
};

const toneBadge: Record<ToastTone, string> = {
  success: "bg-emerald-500",
  error: "bg-red-500",
  warning: "bg-yellow-500",
  info: "bg-slate-400",
};

const toneLabel: Record<ToastTone, string> = {
  success: "Success",
  error: "Error",
  warning: "Warning",
  info: "Update",
};

const createToastId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timeoutsRef = useRef(new Map<string, number>());

  const dismiss = useCallback((id: string) => {
    const timeoutId = timeoutsRef.current.get(id);
    if (timeoutId) {
      window.clearTimeout(timeoutId);
      timeoutsRef.current.delete(id);
    }
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const pushToast = useCallback(
    (toast: Omit<ToastItem, "id">) => {
      const id = createToastId();
      const duration = toast.durationMs ?? 5000;
      setToasts((current) => [...current, { ...toast, id }]);
      const timeoutId = window.setTimeout(() => dismiss(id), duration);
      timeoutsRef.current.set(id, timeoutId);
    },
    [dismiss]
  );

  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
      timeoutsRef.current.clear();
    };
  }, []);

  return useMemo(() => ({ toasts, pushToast, dismiss }), [toasts, pushToast, dismiss]);
}

export function ToastStack({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[60] flex w-full max-w-sm flex-col gap-3 sm:right-6 sm:top-6">
      {toasts.map((toast) => {
        const tone = toast.tone ?? "info";
        return (
          <div
            key={toast.id}
            role="status"
            aria-live="polite"
            className={`pointer-events-auto flex items-start gap-3 rounded-2xl border bg-white p-4 shadow-lg ${toneStyles[tone]}`}
          >
            <span className={`mt-1 inline-flex h-2.5 w-2.5 rounded-full ${toneBadge[tone]}`} />
            <div className="flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                {toneLabel[tone]}
              </p>
              {toast.title ? <p className="mt-1 text-sm font-semibold text-slate-900">{toast.title}</p> : null}
              <p className="mt-1 text-xs text-slate-600">{toast.message}</p>
            </div>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="rounded-full border border-slate-200 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 transition hover:bg-slate-50"
            >
              Close
            </button>
          </div>
        );
      })}
    </div>
  );
}

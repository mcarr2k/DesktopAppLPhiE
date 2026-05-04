import { create } from "zustand";
import { useEffect } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

type ToastTone = "success" | "error" | "info";
type Toast = { id: string; tone: ToastTone; message: string };

type Store = {
  toasts: Toast[];
  push: (tone: ToastTone, message: string) => void;
  dismiss: (id: string) => void;
};

const useToastStore = create<Store>((set) => ({
  toasts: [],
  push: (tone, message) => {
    const id = Math.random().toString(36).slice(2);
    set((s) => ({ toasts: [...s.toasts, { id, tone, message }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 4000);
  },
  dismiss: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const toast = {
  success: (m: string) => useToastStore.getState().push("success", m),
  error: (m: string) => useToastStore.getState().push("error", m),
  info: (m: string) => useToastStore.getState().push("info", m),
};

export function ToastViewport() {
  const { toasts, dismiss } = useToastStore();

  useEffect(() => {
    // no-op subscription to keep component reactive
  }, []);

  const tones: Record<ToastTone, { icon: JSX.Element; cls: string }> = {
    success: { icon: <CheckCircle2 size={18} />, cls: "border-emerald-300 bg-emerald-50 text-emerald-900" },
    error: { icon: <AlertCircle size={18} />, cls: "border-rose-300 bg-rose-50 text-rose-900" },
    info: { icon: <Info size={18} />, cls: "border-sky-300 bg-sky-50 text-sky-900" },
  };

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[100] flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex max-w-sm items-start gap-3 rounded-xl border px-4 py-3 shadow-lg animate-fade-in ${tones[t.tone].cls}`}
        >
          <span className="mt-0.5">{tones[t.tone].icon}</span>
          <p className="flex-1 text-sm">{t.message}</p>
          <button
            onClick={() => dismiss(t.id)}
            className="opacity-70 hover:opacity-100"
            aria-label="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

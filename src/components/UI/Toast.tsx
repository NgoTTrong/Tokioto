"use client";
import { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, X } from "lucide-react";

export type ToastItem = {
  id: string;
  type: "success" | "error";
  message: string;
};

type Props = { toasts: ToastItem[]; onRemove: (id: string) => void };

function Toast({ item, onRemove }: { item: ToastItem; onRemove: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const t = setTimeout(() => { setVisible(false); setTimeout(onRemove, 300); }, 3500);
    return () => clearTimeout(t);
  }, [onRemove]);

  const isSuccess = item.type === "success";

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-full shadow-2xl border backdrop-blur-xl text-sm font-medium whitespace-nowrap transition-all duration-300 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
      } ${
        isSuccess
          ? "bg-green-950/90 border-green-500/30 text-green-300"
          : "bg-red-950/90 border-red-500/30 text-red-300"
      }`}
    >
      {isSuccess
        ? <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 text-green-400" />
        : <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-red-400" />}
      <span>{item.message}</span>
      <button onClick={() => { setVisible(false); setTimeout(onRemove, 300); }}
        className="opacity-50 hover:opacity-100 transition-opacity ml-1">
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

export function Toaster({ toasts, onRemove }: Props) {
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 flex flex-col gap-2 z-50 pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <Toast item={t} onRemove={() => onRemove(t.id)} />
        </div>
      ))}
    </div>
  );
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const show = (type: ToastItem["type"], message: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, type, message }]);
  };

  const remove = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return { toasts, remove, success: (m: string) => show("success", m), error: (m: string) => show("error", m) };
}

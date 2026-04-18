"use client";
import { AlertTriangle } from "lucide-react";

type Props = {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmDialog({
  open, title, message, confirmText = "Xác nhận", cancelText = "Huỷ",
  destructive = false, loading = false, onConfirm, onCancel,
}: Props) {
  return (
    <>
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity duration-200 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onCancel}
      />
      <div className={`fixed inset-0 z-50 flex items-center justify-center px-4 pointer-events-none`}>
        <div
          className={`relative w-full max-w-sm bg-[#18181b] border border-white/[0.1] rounded-2xl overflow-hidden shadow-2xl transition-all duration-200 ${
            open ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-95 pointer-events-none"
          }`}
        >
          <div className="px-5 py-4 flex items-start gap-3">
            {destructive && (
              <div className="w-9 h-9 flex items-center justify-center rounded-full bg-red-500/15 flex-shrink-0">
                <AlertTriangle size={16} className="text-red-400" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-white/90">{title}</h3>
              <p className="text-xs text-white/55 mt-1 leading-relaxed">{message}</p>
            </div>
          </div>
          <div className="flex border-t border-white/[0.06]">
            <button
              onClick={onCancel}
              disabled={loading}
              className="flex-1 py-3 text-sm text-white/70 hover:bg-white/[0.04] transition-colors disabled:opacity-50"
            >
              {cancelText}
            </button>
            <div className="w-px bg-white/[0.06]" />
            <button
              onClick={onConfirm}
              disabled={loading}
              className={`flex-1 py-3 text-sm font-medium transition-colors disabled:opacity-50 ${
                destructive ? "text-red-400 hover:bg-red-500/10" : "text-purple-400 hover:bg-purple-500/10"
              }`}
            >
              {loading ? "Đang xử lý…" : confirmText}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

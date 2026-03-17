import { useEffect } from "react";

type ConfirmDialogVariant = "danger" | "primary";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  variant?: ConfirmDialogVariant;
  confirmLabel?: string;
  cancelLabel?: string;
  isProcessing?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

function ConfirmDialog({
  open,
  title,
  message,
  variant = "danger",
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  isProcessing = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isProcessing) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [open, isProcessing, onClose]);

  const confirmButtonStyle =
    variant === "primary"
      ? "border-sky-300 bg-sky-600 hover:bg-sky-700"
      : "border-rose-300 bg-rose-600 hover:bg-rose-700";

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-200 ${
        open
          ? "pointer-events-auto bg-slate-900/50 opacity-100"
          : "pointer-events-none bg-slate-900/0 opacity-0"
      }`}
      onClick={() => {
        if (!isProcessing) onClose();
      }}
      role="presentation"
    >
      <div
        className={`surface-card w-full max-w-md rounded-2xl p-5 ${
          open ? "modal-panel-enter" : "modal-panel-exit"
        }`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        aria-hidden={!open}
      >
        <h3 className="text-xl font-bold text-slate-900">{title}</h3>
        <p className="mt-2 text-sm text-slate-600">{message}</p>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isProcessing}
            className={`rounded-lg border px-3 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${confirmButtonStyle}`}
          >
            {isProcessing ? "Deleting..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;

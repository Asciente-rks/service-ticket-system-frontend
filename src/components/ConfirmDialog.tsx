import { useEffect, useRef } from "react";
import { AlertTriangle, Trash2, ShieldAlert } from "lucide-react";

type Variant = "danger" | "warning" | "default";

interface Props {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: Variant;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const ICONS: Record<Variant, React.ReactNode> = {
  danger: <Trash2 className="h-5 w-5" />,
  warning: <AlertTriangle className="h-5 w-5" />,
  default: <ShieldAlert className="h-5 w-5" />,
};

/**
 * Themed replacement for window.confirm(). Animated, keyboard-accessible
 * (Esc to cancel, Enter to confirm) and styled to match the app.
 */
const ConfirmDialog = ({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  loading = false,
  onConfirm,
  onCancel,
}: Props) => {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    confirmRef.current?.focus();
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onCancel();
      if (e.key === "Enter" && !loading) onConfirm();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, loading, onCancel, onConfirm]);

  if (!isOpen) return null;

  const accent =
    variant === "danger" ? "#ef4444" : variant === "warning" ? "#f59e0b" : "var(--accent)";
  const confirmClass =
    variant === "danger"
      ? "btn btn-danger-solid"
      : variant === "warning"
      ? "btn btn-primary"
      : "btn btn-primary";

  return (
    <div
      className="modal-overlay"
      style={{ zIndex: 200 }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !loading) onCancel();
      }}
    >
      <div className="modal-panel max-w-md rounded-3xl p-7" role="alertdialog" aria-modal="true">
        <div className="flex items-start gap-4">
          <span
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
            style={{ backgroundColor: `${accent}1a`, color: accent }}
          >
            {ICONS[variant]}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold tracking-tight" style={{ color: "var(--text)" }}>
              {title}
            </h3>
            <div className="mt-1.5 text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
              {message}
            </div>
          </div>
        </div>

        <div className="mt-7 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="btn btn-ghost px-5 py-2.5 text-sm"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`${confirmClass} px-5 py-2.5 text-sm`}
          >
            {loading ? (
              <>
                <span className="ui-spinner h-4 w-4" /> Working…
              </>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;

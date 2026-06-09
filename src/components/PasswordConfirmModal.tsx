import { useEffect, useRef, useState } from "react";
import { Lock, ShieldCheck } from "lucide-react";

interface Props {
  isOpen: boolean;
  title?: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  loading?: boolean;
  error?: string;
  onConfirm: (currentPassword: string) => void;
  onCancel: () => void;
}

/** Asks for the current password before applying a sensitive change. */
const PasswordConfirmModal = ({
  isOpen,
  title = "Confirm it's you",
  description = "Enter your current password to apply this change.",
  confirmLabel = "Confirm",
  loading = false,
  error,
  onConfirm,
  onCancel,
}: Props) => {
  const [password, setPassword] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPassword("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, loading, onCancel]);

  if (!isOpen) return null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password) onConfirm(password);
  };

  return (
    <div
      className="modal-overlay"
      style={{ zIndex: 210 }}
      onMouseDown={(e) => { if (e.target === e.currentTarget && !loading) onCancel(); }}
    >
      <form onSubmit={submit} className="modal-panel max-w-md rounded-3xl p-7" role="dialog" aria-modal="true">
        <div className="flex items-start gap-4 mb-5">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl" style={{ backgroundColor: "var(--accent-soft)", color: "var(--accent)" }}>
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div>
            <h3 className="text-lg font-bold tracking-tight" style={{ color: "var(--text)" }}>{title}</h3>
            <div className="mt-1 text-sm leading-relaxed" style={{ color: "var(--muted)" }}>{description}</div>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border px-4 py-3 text-sm animate-slide-down" style={{ borderColor: "#f87171", backgroundColor: "rgba(248,113,113,0.1)", color: "#ef4444" }}>
            {error}
          </div>
        )}

        <label className="block text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: "var(--muted)" }}>
          Current password
        </label>
        <div className="relative">
          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "var(--muted)" }} />
          <input
            ref={inputRef}
            type="password"
            required
            placeholder="••••••••"
            className="field pl-10 pr-4 py-3 text-sm"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="mt-7 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <button type="button" onClick={onCancel} disabled={loading} className="btn btn-ghost px-5 py-2.5 text-sm">
            Cancel
          </button>
          <button type="submit" disabled={loading || !password} className="btn btn-primary px-5 py-2.5 text-sm">
            {loading ? (<><span className="ui-spinner h-4 w-4" /> Working…</>) : confirmLabel}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PasswordConfirmModal;

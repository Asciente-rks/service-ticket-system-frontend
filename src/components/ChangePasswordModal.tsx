import { useEffect, useState } from "react";
import { KeyRound, Lock, Eye, EyeOff } from "lucide-react";
import api from "../services/api";
import { getApiErrorMessage } from "../utils/apiError";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const ChangePasswordModal = ({ isOpen, onClose, onSuccess }: Props) => {
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setError("");
      setShow(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !loading) onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (form.newPassword.length < 8) { setError("New password must be at least 8 characters."); return; }
    if (form.newPassword !== form.confirmPassword) { setError("New passwords do not match."); return; }
    setLoading(true);
    try {
      await api.post("/auth/change-password", {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(getApiErrorMessage(err, "Could not change password."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 210 }} onMouseDown={(e) => { if (e.target === e.currentTarget && !loading) onClose(); }}>
      <form onSubmit={submit} className="modal-panel max-w-md rounded-3xl p-7" role="dialog" aria-modal="true">
        <div className="flex items-start gap-4 mb-5">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl" style={{ backgroundColor: "var(--accent-soft)", color: "var(--accent)" }}>
            <KeyRound className="h-5 w-5" />
          </span>
          <div>
            <h3 className="text-lg font-bold tracking-tight" style={{ color: "var(--text)" }}>Change password</h3>
            <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>Enter your current password, then choose a new one.</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border px-4 py-3 text-sm animate-slide-down" style={{ borderColor: "#f87171", backgroundColor: "rgba(248,113,113,0.1)", color: "#ef4444" }}>
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: "var(--muted)" }}>Current password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "var(--muted)" }} />
              <input type={show ? "text" : "password"} required className="field pl-10 pr-4 py-3 text-sm" value={form.currentPassword} onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} disabled={loading} />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: "var(--muted)" }}>New password</label>
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "var(--muted)" }} />
              <input type={show ? "text" : "password"} required placeholder="At least 8 characters" className="field pl-10 pr-11 py-3 text-sm" value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} disabled={loading} />
              <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md" style={{ color: "var(--muted)" }} aria-label={show ? "Hide" : "Show"}>
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: "var(--muted)" }}>Confirm new password</label>
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "var(--muted)" }} />
              <input type={show ? "text" : "password"} required className="field pl-10 pr-4 py-3 text-sm" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} disabled={loading} />
            </div>
          </div>
        </div>

        <div className="mt-7 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <button type="button" onClick={onClose} disabled={loading} className="btn btn-ghost px-5 py-2.5 text-sm">Cancel</button>
          <button type="submit" disabled={loading} className="btn btn-primary px-5 py-2.5 text-sm">
            {loading ? (<><span className="ui-spinner h-4 w-4" /> Updating…</>) : "Update password"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChangePasswordModal;

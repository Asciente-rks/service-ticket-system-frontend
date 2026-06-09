import { useState, useEffect, useRef } from "react";
import { User as UserIcon, Mail, Lock, ChevronDown } from "lucide-react";
import api from "../services/api";
import type { Role } from "../types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  roles: Role[];
  onSuccess: () => void;
}

const CreateUserModal = ({ isOpen, onClose, roles, onSuccess }: Props) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    roleId: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsRoleMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.roleId) {
      setError("Please select a valid role.");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post("/users", {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        roleId: formData.roleId,
      });

      onSuccess();
      onClose();
      setFormData({ name: "", email: "", password: "", roleId: "" });
    } catch (err: any) {
      console.error("CREATE USER ERROR:", err.response?.data);
      setError(err.response?.data?.message || "Input validation failed. Check the fields and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const labelCls = "block text-[10px] font-black uppercase tracking-[0.3em] mb-2";

  return (
    <div className="modal-overlay" style={{ zIndex: 60 }}>
      <div className="modal-panel max-w-md rounded-[2rem] p-8">
        <div className="mb-6 border-b border-[var(--border)] pb-4">
          <h2 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text)" }}>
            Add team member
          </h2>
          <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
            Create a new user and assign their role.
          </p>
        </div>

        {error && (
          <div className="mb-5 rounded-xl border px-4 py-3 text-sm animate-slide-down" style={{ borderColor: "#f87171", backgroundColor: "rgba(248,113,113,0.1)", color: "#ef4444" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className={labelCls} style={{ color: "var(--muted)" }}>Full Name</label>
            <div className="relative">
              <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "var(--muted)" }} />
              <input required className="field pl-10 pr-4 py-3 outline-none" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            </div>
          </div>

          <div>
            <label className={labelCls} style={{ color: "var(--muted)" }}>Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "var(--muted)" }} />
              <input required type="email" className="field pl-10 pr-4 py-3 outline-none" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
            </div>
          </div>

          <div>
            <label className={labelCls} style={{ color: "var(--muted)" }}>Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "var(--muted)" }} />
              <input required type="password" className="field pl-10 pr-4 py-3 outline-none" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
            </div>
          </div>

          <div ref={dropdownRef} className="relative">
            <label className={labelCls} style={{ color: "var(--muted)" }}>Assigned Role</label>
            <button
              type="button"
              onClick={() => setIsRoleMenuOpen((prev) => !prev)}
              className="field flex w-full items-center justify-between px-4 py-3 text-left outline-none"
              style={{ color: formData.roleId ? "var(--text)" : "var(--input-text)" }}
            >
              <span>{formData.roleId ? roles.find((role) => String(role.id) === formData.roleId)?.name : "Select Role"}</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${isRoleMenuOpen ? "rotate-180" : ""}`} style={{ color: "var(--muted)" }} />
            </button>
            {isRoleMenuOpen && (
              <div className="dropdown-menu absolute left-0 right-0 mt-2 rounded-2xl border shadow-2xl z-20 p-1" style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}>
                {roles.map((role) => (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => { setFormData({ ...formData, roleId: String(role.id) }); setIsRoleMenuOpen(false); }}
                    className={`w-full text-left px-3 py-2.5 text-sm transition dropdown-option ${formData.roleId === String(role.id) ? "selected" : ""}`}
                    style={{ color: "var(--text)" }}
                  >
                    {role.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-3 mt-8">
            <button type="button" onClick={onClose} className="btn btn-ghost px-5 py-2.5 text-sm uppercase tracking-widest font-bold">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="btn btn-primary px-5 py-2.5 text-sm uppercase tracking-widest font-bold">
              {isSubmitting ? (<><span className="ui-spinner h-4 w-4" /> Processing…</>) : "Confirm User"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateUserModal;

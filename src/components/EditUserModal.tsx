import { useState, useEffect, useMemo, useRef } from "react";
import { User as UserIcon, ChevronDown } from "lucide-react";
import api from "../services/api";
import { getLoggedInUser } from "../utils/auth";
import type { User, Role } from "../types";

interface UserUpdatePayload extends Partial<User> {
  password?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  roles: Role[];
  onSuccess: () => void;
}

const EditUserModal = ({ isOpen, onClose, user, roles, onSuccess }: Props) => {
  const [formData, setFormData] = useState({ name: "", email: "", roleId: "", password: "" });
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

  useEffect(() => {
    if (user) {
      setError("");
      setFormData({ name: user.name || "", email: user.email || "", roleId: String(user.roleId), password: "" });
    }
  }, [user]);

  const currentUser = getLoggedInUser();
  const isAdmin = useMemo(() => {
    if (!currentUser || roles.length === 0) return false;
    const userRoleId = String(currentUser.roleId).toLowerCase();
    const adminRoles = roles
      .filter((r) => ["admin", "administrator", "superadmin", "super admin"].includes(r.name.toLowerCase().trim()))
      .map((r) => String(r.id).toLowerCase());
    return adminRoles.includes(userRoleId);
  }, [currentUser, roles]);

  if (!isOpen || !isAdmin) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const payload: UserUpdatePayload = {
        name: formData.name,
        email: formData.email,
        roleId: formData.roleId,
      };
      if (formData.password !== "") payload.password = formData.password;

      await api.put(`/users/${user.id}`, payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Update failed:", err.response?.data);
      setError(err.response?.data?.message || "Failed to update user.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const labelCls = "block text-[10px] font-black uppercase tracking-[0.3em] mb-2";

  return (
    <div className="modal-overlay" style={{ zIndex: 70 }}>
      <div className="modal-panel max-w-md rounded-[2rem] p-8">
        <div className="mb-6 border-b border-[var(--border)] pb-4">
          <h2 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text)" }}>
            Edit account
          </h2>
          <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>{user.email}</p>
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

          <div ref={dropdownRef} className="relative">
            <label className={labelCls} style={{ color: "var(--muted)" }}>Access Role</label>
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
              {isSubmitting ? (<><span className="ui-spinner h-4 w-4" /> Saving…</>) : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditUserModal;

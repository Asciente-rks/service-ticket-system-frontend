import { useState, useEffect, useRef } from "react";
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
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsRoleMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.roleId) {
      alert("Please select a valid role.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        roleId: formData.roleId,
      };

      await api.post("/users", payload);

      onSuccess();
      onClose();
      setFormData({ name: "", email: "", password: "", roleId: "" });
    } catch (err: any) {
      console.error("CREATE USER ERROR:", err.response?.data);
      alert(
        err.response?.data?.message ||
          "Input validation failed. Check UUID format or password.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div
        className="w-full max-w-md rounded-[2rem] border p-8 shadow-2xl"
        style={{
          backgroundColor: "var(--surface)",
          borderColor: "var(--border)",
          color: "var(--text)",
        }}
      >
        <div className="mb-6 border-b border-[var(--border)] pb-4">
          <h2 className="text-2xl font-black uppercase tracking-[0.25em]" style={{ color: "var(--text)" }}>
            Add Team Member
          </h2>
          <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
            Create a new user and assign their role.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-[0.35em] mb-2" style={{ color: "var(--muted)" }}>
              Full Name
            </label>
            <input
              required
              className="w-full rounded-3xl px-4 py-3 outline-none transition"
              style={{
                backgroundColor: "var(--input)",
                border: "1px solid var(--border)",
                color: "var(--input-text)",
              }}
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-[0.35em] mb-2" style={{ color: "var(--muted)" }}>
              Email Address
            </label>
            <input
              required
              type="email"
              className="w-full rounded-3xl px-4 py-3 outline-none transition"
              style={{
                backgroundColor: "var(--input)",
                border: "1px solid var(--border)",
                color: "var(--input-text)",
              }}
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
            />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-[0.35em] mb-2" style={{ color: "var(--muted)" }}>
              Password
            </label>
            <input
              required
              type="password"
              className="w-full rounded-3xl px-4 py-3 outline-none transition"
              style={{
                backgroundColor: "var(--input)",
                border: "1px solid var(--border)",
                color: "var(--input-text)",
              }}
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
            />
          </div>

          <div ref={dropdownRef} className="relative">
            <label className="block text-[10px] font-black uppercase tracking-[0.35em] mb-2" style={{ color: "var(--muted)" }}>
              Assigned Role
            </label>
            <button
              type="button"
              onClick={() => setIsRoleMenuOpen((prev) => !prev)}
              className="w-full rounded-3xl px-4 py-3 text-left outline-none transition"
              style={{
                backgroundColor: "var(--input)",
                border: "1px solid var(--border)",
                color: formData.roleId ? "var(--text)" : "var(--input-text)",
              }}
            >
              {formData.roleId
                ? roles.find((role) => String(role.id) === formData.roleId)?.name
                : "Select Role"}
            </button>
            {isRoleMenuOpen && (
              <div
                className="absolute left-0 right-0 mt-2 rounded-3xl border shadow-2xl z-20"
                style={{
                  backgroundColor: "var(--surface)",
                  borderColor: "var(--border)",
                }}
              >
                {roles.map((role) => (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => {
                      setFormData({ ...formData, roleId: String(role.id) });
                      setIsRoleMenuOpen(false);
                    }}
                    className={`w-full text-left px-4 py-3 text-sm transition dropdown-option ${
                      formData.roleId === String(role.id) ? "selected" : ""
                    }`}
                    style={{ color: "var(--text)" }}
                  >
                    {role.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-3 mt-8">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto rounded-3xl px-5 py-2.5 text-sm font-black uppercase tracking-widest transition duration-200 ease-out transform hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/10"
              style={{
                backgroundColor: "transparent",
                border: "1px solid var(--border)",
                color: "var(--text)",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto rounded-3xl px-5 py-2.5 text-sm font-black uppercase tracking-widest transition duration-200 ease-out transform hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/10"
              style={{
                backgroundColor: "var(--button-bg)",
                color: "var(--button-text)",
                border: "1px solid var(--border)",
                opacity: isSubmitting ? 0.6 : 1,
              }}
            >
              {isSubmitting ? "Processing..." : "Confirm User"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateUserModal;

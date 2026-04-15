import { useState, useEffect, useRef } from "react";
import api from "../services/api";
import type { Ticket, TicketStatus, User, Role } from "../types";
import { getLoggedInUser } from "../utils/auth";
import { getStatusMeta } from "../utils/labelStyles";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  ticket: Ticket;
  statuses: TicketStatus[];
  users: User[];
  roles: Role[];
}

const EditTicketModal = ({
  isOpen,
  onClose,
  onSuccess,
  ticket,
  statuses,
  users,
  roles,
}: Props) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<"priority" | "status" | "assign" | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "Medium",
    statusId: "",
    assigneeId: "",
  });
  const dropdownGroupRef = useRef<HTMLDivElement>(null);

  const currentUser = getLoggedInUser();

  useEffect(() => {
    if (isOpen && ticket) {
      setFormData({
        title: ticket.title || "",
        description: ticket.description || "",
        priority: (ticket.priority as any) || "Medium",
        statusId: String(
          (ticket as any).statusId ||
            (ticket as any).status_id ||
            (ticket as any).status?.id ||
            "",
        ),
        assigneeId: String(
          (ticket as any).assigneeId ||
            (ticket as any).assignedTo ||
            (ticket as any).assigned_to ||
            (ticket as any).assignee?.id ||
            "",
        ),
      });
    }
  }, [isOpen, ticket]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        dropdownGroupRef.current &&
        !dropdownGroupRef.current.contains(event.target as Node)
      ) {
        setOpenDropdown(null);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenDropdown(null);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const superAdminRoleId = roles.find((r) =>
    ["superadmin", "super admin"].includes(r.name.toLowerCase()),
  )?.id;
  const adminRoleId = roles.find((r) =>
    ["admin", "administrator"].includes(r.name.toLowerCase()),
  )?.id;
  const developerRoleId = roles.find((r) =>
    ["developer", "dev", "devs"].includes(r.name.toLowerCase()),
  )?.id;
  const testerRoleId = roles.find((r) =>
    ["tester", "qa", "testers"].includes(r.name.toLowerCase()),
  )?.id;

  const actorRoleId = currentUser?.roleId
    ? String(currentUser.roleId).toLowerCase()
    : "";

  const isSuperAdmin = !!(
    superAdminRoleId && actorRoleId === String(superAdminRoleId).toLowerCase()
  );
  const isRegularAdmin = !!(
    adminRoleId && actorRoleId === String(adminRoleId).toLowerCase()
  );
  const isAdmin = isSuperAdmin || isRegularAdmin;

  const isReporter = !!(
    currentUser?.id &&
    ticket &&
    String(
      (ticket as any).reportedBy ||
        (ticket as any).reported_by ||
        (ticket as any).reporter?.id,
    ).toLowerCase() === String(currentUser.id).toLowerCase()
  );

  const canEditCoreDetails = isAdmin || isReporter;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "High":
        return "#ef4444";
      case "Medium":
        return "#f97316";
      case "Low":
        return "#22c55e";
      default:
        return "var(--text)";
    }
  };

  const getStatusColor = (statusName: string) => {
    switch (statusName) {
      case "Resolved":
        return "#22c55e";
      case "In Progress":
        return "#f97316";
      case "Open":
        return "#0ea5e9";
      case "Closed":
        return "var(--muted)";
      case "Ready for QA":
        return "#8B5CF6";
      case "Error Persists":
        return "#ef4444";
      default:
        return "var(--muted)";
    }
  };

  if (!isOpen) return null;

  const filteredUsers = users.filter((u) => {
    if (!currentUser) return false;

    const targetUserId = String(u.id).toLowerCase();
    const targetUserRoleId = String(u.roleId).toLowerCase();
    const currentUserId = String(currentUser.id).toLowerCase();

    const currentRole =
      roles
        .find((r) => String(r.id).toLowerCase() === actorRoleId)
        ?.name.toLowerCase() || "";

    if (currentRole === "superadmin" || currentRole === "super admin") {
      return targetUserId !== currentUserId;
    }

    const isTargetDev =
      developerRoleId &&
      targetUserRoleId === String(developerRoleId).toLowerCase();
    const isTargetTester =
      testerRoleId && targetUserRoleId === String(testerRoleId).toLowerCase();
    const isTargetInWorkerPool = isTargetDev || isTargetTester;

    if (currentRole === "admin") {
      return isTargetInWorkerPool;
    }

    if (["developer", "dev", "tester", "qa"].includes(currentRole)) {
      return isTargetInWorkerPool;
    }

    return false;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
        statusId: formData.statusId || null,
        assigneeId: formData.assigneeId || null,
      };

      await api.patch(`/tickets/${ticket.id}`, payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("UPDATE TICKET ERROR:", err.response?.data);
      alert(err.response?.data?.message || "Failed to update ticket.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div
        className="w-full max-w-4xl rounded-[2rem] border p-8 shadow-2xl"
        style={{
          backgroundColor: "var(--surface)",
          borderColor: "var(--border)",
          color: "var(--text)",
        }}
      >
        <div className="mb-6 border-b border-[var(--border)] pb-4">
          <h2 className="text-2xl font-black uppercase tracking-[0.25em]" style={{ color: "var(--text)" }}>
            Edit Ticket
          </h2>
          <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
            Update ticket details and assignments.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.6fr_1fr]">
            <div className="space-y-5">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-[0.35em] mb-2" style={{ color: "var(--muted)" }}>
                  Title
                </label>
                <input
                  required
                  disabled={!canEditCoreDetails}
                  className="w-full rounded-3xl px-4 py-3 outline-none transition"
                  style={{
                    backgroundColor: "var(--input)",
                    border: "1px solid var(--border)",
                    color: "var(--input-text)",
                  }}
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-[0.35em] mb-2" style={{ color: "var(--muted)" }}>
                  Description
                </label>
                <textarea
                  required
                  disabled={!canEditCoreDetails}
                  rows={4}
                  className="w-full rounded-3xl px-4 py-3 outline-none resize-none transition"
                  style={{
                    backgroundColor: "var(--input)",
                    border: "1px solid var(--border)",
                    color: "var(--input-text)",
                  }}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-4" ref={dropdownGroupRef}>
              <div className="relative">
                <label className="block text-[10px] font-black uppercase tracking-[0.35em] mb-2" style={{ color: "var(--muted)" }}>
                  Assign To
                </label>
                <button
                  type="button"
                  onClick={() => setOpenDropdown((prev) => (prev === "assign" ? null : "assign"))}
                  className="w-full rounded-3xl px-4 py-3 text-left outline-none transition"
                  style={{
                    backgroundColor: "var(--input)",
                    border: "1px solid var(--border)",
                    color: "var(--input-text)",
                  }}
                >
                  {formData.assigneeId
                    ? users.find((user) => String(user.id) === formData.assigneeId)?.name
                    : "Select Assignee"}
                </button>
                {openDropdown === "assign" && (
                  <div
                    className="absolute left-0 right-0 mt-2 max-h-60 overflow-auto rounded-3xl border shadow-2xl z-20"
                    style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
                  >
                    {filteredUsers.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, assigneeId: String(user.id) });
                          setOpenDropdown(null);
                        }}
                        className="w-full text-left px-4 py-3 text-sm transition dropdown-option"
                        style={{ color: "var(--text)" }}
                      >
                        {user.name} ({user.email})
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="relative">
                <label className="block text-[10px] font-black uppercase tracking-[0.35em] mb-2" style={{ color: "var(--muted)" }}>
                  Status
                </label>
                <button
                  type="button"
                  onClick={() => setOpenDropdown((prev) => (prev === "status" ? null : "status"))}
                  className="w-full rounded-3xl px-4 py-3 text-left outline-none transition"
                  style={{
                    backgroundColor: "var(--input)",
                    border: "1px solid var(--border)",
                    color: formData.statusId
                      ? getStatusColor(
                          statuses.find((s) => String(s.id) === formData.statusId)?.name || ""
                        )
                      : "var(--input-text)",
                  }}
                >
                  {formData.statusId
                    ? statuses.find((s) => String(s.id) === formData.statusId)?.name
                    : "Select Status"}
                </button>
                {openDropdown === "status" && (
                  <div
                    className="absolute left-0 right-0 mt-2 max-h-60 overflow-auto rounded-3xl shadow-2xl z-20"
                    style={{ backgroundColor: "var(--surface)" }}
                  >
                    {statuses.map((s) => {
                      const statusMeta = getStatusMeta(s.name);
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, statusId: String(s.id) });
                            setOpenDropdown(null);
                          }}
                          className="w-full text-left px-4 py-3 text-sm transition dropdown-option"
                          style={{
                            color: getStatusColor(s.name),
                          }}
                        >
                          <span className="flex items-center gap-2">
                            <span>{statusMeta.icon}</span>
                            <span>{s.name}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="relative">
                <label className="block text-[10px] font-black uppercase tracking-[0.35em] mb-2" style={{ color: "var(--muted)" }}>
                  Priority
                </label>
                <button
                  type="button"
                  onClick={() => setOpenDropdown((prev) => (prev === "priority" ? null : "priority"))}
                  className="w-full rounded-3xl px-4 py-3 text-left outline-none transition"
                  style={{
                    backgroundColor: "var(--input)",
                    border: "1px solid var(--border)",
                    color: "var(--input-text)",
                  }}
                >
                  {formData.priority || "Select Priority"}
                </button>
                {openDropdown === "priority" && (
                  <div
                    className="absolute left-0 right-0 mt-2 rounded-3xl border shadow-2xl z-20"
                    style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
                  >
                    {[
                      { value: "Low", label: "Low" },
                      { value: "Medium", label: "Medium" },
                      { value: "High", label: "High" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, priority: option.value });
                          setOpenDropdown(null);
                        }}
                        className="w-full text-left px-4 py-3 text-sm transition dropdown-option"
                        style={{
                          color: getPriorityColor(option.value),
                        }}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-8">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-3xl px-6 py-3 font-black uppercase tracking-widest transition duration-200 ease-out transform hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/10"
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
              className="flex-1 rounded-3xl px-6 py-3 font-black uppercase tracking-widest transition duration-200 ease-out transform hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/10"
              style={{
                backgroundColor: "var(--button-bg)",
                color: "var(--button-text)",
                border: "1px solid var(--border)",
                opacity: isSubmitting ? 0.6 : 1,
              }}
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditTicketModal;

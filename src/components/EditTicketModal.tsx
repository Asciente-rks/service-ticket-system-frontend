import { useState, useEffect, useRef } from "react";
import { Video, ChevronDown } from "lucide-react";
import api from "../services/api";
import { getApiErrorMessage } from "../utils/apiError";
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
  const [error, setError] = useState("");
  const [openDropdown, setOpenDropdown] = useState<"priority" | "status" | "assign" | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    jamUrl: "",
    priority: "Medium",
    statusId: "",
    assigneeId: "",
  });
  const dropdownGroupRef = useRef<HTMLDivElement>(null);

  const currentUser = getLoggedInUser();

  useEffect(() => {
    if (isOpen && ticket) {
      setError("");
      // The ticket from the API exposes `status` as a NAME (e.g. "Open"), not an
      // id. Resolve the current statusId by matching that name against the
      // statuses list so the dropdown shows the real status and we never submit
      // a null statusId (which previously caused "Input validation failed").
      const statusName =
        typeof (ticket as any).status === "string"
          ? (ticket as any).status
          : (ticket as any).status?.name;
      const resolvedStatusId =
        (ticket as any).statusId ||
        (ticket as any).status_id ||
        (ticket as any).status?.id ||
        (statusName ? statuses.find((s) => s.name === statusName)?.id : "") ||
        "";

      setFormData({
        title: ticket.title || "",
        description: ticket.description || "",
        jamUrl: (ticket as any).jamUrl || "",
        priority: (ticket.priority as any) || "Medium",
        statusId: String(resolvedStatusId),
        assigneeId: String(
          (ticket as any).assigneeId ||
            (ticket as any).assignedTo ||
            (ticket as any).assigned_to ||
            (ticket as any).assignee?.id ||
            "",
        ),
      });
    }
  }, [isOpen, ticket, statuses]);

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
    setError("");

    if (canEditCoreDetails && !formData.title.trim()) { setError("Title is required."); return; }
    if (canEditCoreDetails && !formData.description.trim()) { setError("Description is required."); return; }

    setIsSubmitting(true);

    try {
      // Only send statusId when we actually have one — never null (the API
      // rejects a null statusId, which surfaced as a generic validation error).
      const payload: Record<string, any> = {
        title: formData.title,
        description: formData.description,
        jamUrl: formData.jamUrl.trim() || null,
        priority: formData.priority,
        assigneeId: formData.assigneeId || null,
      };
      if (formData.statusId) payload.statusId = formData.statusId;

      await api.patch(`/tickets/${ticket.id}`, payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("UPDATE TICKET ERROR:", err.response?.data);
      setError(getApiErrorMessage(err, "Failed to update ticket."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const labelCls = "block text-[10px] font-black uppercase tracking-[0.3em] mb-2";
  const triggerStyle = {
    backgroundColor: "var(--input)",
    border: "1px solid var(--border)",
    color: "var(--input-text)",
  } as const;

  return (
    <div className="modal-overlay" style={{ zIndex: 120 }}>
      <div className="modal-panel max-w-4xl rounded-[2rem] p-8">
        <div className="mb-6 border-b border-[var(--border)] pb-4">
          <h2 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text)" }}>
            Edit ticket
          </h2>
          <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
            Update ticket details and assignments.
          </p>
        </div>

        {error && (
          <div
            className="mb-5 rounded-xl border px-4 py-3 text-sm animate-slide-down"
            style={{ borderColor: "#f87171", backgroundColor: "rgba(248,113,113,0.1)", color: "#ef4444" }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.6fr_1fr]">
            <div className="space-y-5">
              <div>
                <label className={labelCls} style={{ color: "var(--muted)" }}>Title</label>
                <input
                  required
                  disabled={!canEditCoreDetails}
                  className="field px-4 py-3 outline-none"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div>
                <label className={labelCls} style={{ color: "var(--muted)" }}>Description</label>
                <textarea
                  required
                  disabled={!canEditCoreDetails}
                  rows={4}
                  className="field px-4 py-3 outline-none resize-y"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div>
                <label className={`${labelCls} flex items-center gap-1.5`} style={{ color: "var(--muted)" }}>
                  <Video className="h-3.5 w-3.5" /> Jam recording URL
                  <span className="font-medium tracking-normal lowercase opacity-70">· optional</span>
                </label>
                <div className="relative">
                  <Video className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "var(--muted)" }} />
                  <input
                    type="url"
                    disabled={!canEditCoreDetails}
                    placeholder="https://jam.dev/c/your-recording"
                    className="field pl-10 pr-4 py-3 outline-none"
                    value={formData.jamUrl}
                    onChange={(e) => setFormData({ ...formData, jamUrl: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4" ref={dropdownGroupRef}>
              <div className="relative">
                <label className={labelCls} style={{ color: "var(--muted)" }}>Assign To</label>
                <button
                  type="button"
                  onClick={() => setOpenDropdown((prev) => (prev === "assign" ? null : "assign"))}
                  className="field flex w-full items-center justify-between px-4 py-3 text-left outline-none"
                  style={triggerStyle}
                >
                  <span className="truncate">
                    {formData.assigneeId
                      ? users.find((user) => String(user.id) === formData.assigneeId)?.name
                      : "Select Assignee"}
                  </span>
                  <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${openDropdown === "assign" ? "rotate-180" : ""}`} style={{ color: "var(--muted)" }} />
                </button>
                {openDropdown === "assign" && (
                  <div
                    className="dropdown-menu absolute left-0 right-0 mt-2 max-h-60 overflow-auto rounded-2xl border shadow-2xl z-20 p-1"
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
                        className="w-full text-left px-3 py-2.5 text-sm transition dropdown-option"
                        style={{ color: "var(--text)" }}
                      >
                        {user.name} ({user.email})
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="relative">
                <label className={labelCls} style={{ color: "var(--muted)" }}>Status</label>
                <button
                  type="button"
                  onClick={() => setOpenDropdown((prev) => (prev === "status" ? null : "status"))}
                  className="field flex w-full items-center justify-between px-4 py-3 text-left outline-none"
                  style={{
                    ...triggerStyle,
                    color: formData.statusId
                      ? getStatusColor(statuses.find((s) => String(s.id) === formData.statusId)?.name || "")
                      : "var(--input-text)",
                  }}
                >
                  <span>
                    {formData.statusId
                      ? statuses.find((s) => String(s.id) === formData.statusId)?.name
                      : "Select Status"}
                  </span>
                  <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${openDropdown === "status" ? "rotate-180" : ""}`} style={{ color: "var(--muted)" }} />
                </button>
                {openDropdown === "status" && (
                  <div
                    className="dropdown-menu absolute left-0 right-0 mt-2 max-h-60 overflow-auto rounded-2xl border shadow-2xl z-20 p-1"
                    style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
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
                          className="w-full text-left px-3 py-2.5 text-sm transition dropdown-option"
                          style={{ color: getStatusColor(s.name) }}
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
                <label className={labelCls} style={{ color: "var(--muted)" }}>Priority</label>
                <button
                  type="button"
                  onClick={() => setOpenDropdown((prev) => (prev === "priority" ? null : "priority"))}
                  className="field flex w-full items-center justify-between px-4 py-3 text-left outline-none"
                  style={{ ...triggerStyle, color: getPriorityColor(formData.priority) }}
                >
                  <span>{formData.priority || "Select Priority"}</span>
                  <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${openDropdown === "priority" ? "rotate-180" : ""}`} style={{ color: "var(--muted)" }} />
                </button>
                {openDropdown === "priority" && (
                  <div
                    className="dropdown-menu absolute left-0 right-0 mt-2 rounded-2xl border shadow-2xl z-20 p-1"
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
                        className="w-full text-left px-3 py-2.5 text-sm transition dropdown-option"
                        style={{ color: getPriorityColor(option.value) }}
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
            <button type="button" onClick={onClose} className="btn btn-ghost flex-1 px-6 py-3 text-sm uppercase tracking-widest font-bold">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="btn btn-primary flex-1 px-6 py-3 text-sm uppercase tracking-widest font-bold">
              {isSubmitting ? (<><span className="ui-spinner h-4 w-4" /> Saving…</>) : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditTicketModal;

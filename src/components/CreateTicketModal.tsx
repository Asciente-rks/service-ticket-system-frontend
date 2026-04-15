import { useState, useEffect, useRef } from "react";
import { CheckCircle, Clock, Lock, Inbox, Eye, AlertTriangle, Circle } from "lucide-react";
import api from "../services/api";
import type { TicketStatus, User } from "../types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CreateTicketModal = ({ isOpen, onClose, onSuccess }: Props) => {
  const [statuses, setStatuses] = useState<TicketStatus[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "",
    statusId: "",
    assignedTo: "",
  });
  const [openDropdown, setOpenDropdown] = useState<"priority" | "status" | "assign" | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const dropdownGroupRef = useRef<HTMLDivElement>(null);

  const getPriorityBadgeStyle = (priority: string) => {
    switch (priority) {
      case "High":
        return { color: "#ef4444", borderColor: "#ef4444" };
      case "Medium":
        return { color: "#f97316", borderColor: "#f97316" };
      case "Low":
        return { color: "#22c55e", borderColor: "#22c55e" };
      default:
        return { color: "var(--text)", borderColor: "var(--border)" };
    }
  };

  const getStatusBadgeStyle = (statusName: string) => {
    switch (statusName) {
      case "Resolved":
        return { color: "#22c55e", icon: <CheckCircle className="h-4 w-4" /> };
      case "In Progress":
        return { color: "#f97316", icon: <Clock className="h-4 w-4" /> };
      case "Open":
        return { color: "#0ea5e9", icon: <Inbox className="h-4 w-4" /> };
      case "Closed":
        return { color: "var(--muted)", icon: <Lock className="h-4 w-4" /> };
      case "Ready for QA":
        return { color: "#8b5cf6", icon: <Eye className="h-4 w-4" /> };
      case "Error Persists":
        return { color: "#f43f5e", icon: <AlertTriangle className="h-4 w-4" /> };
      default:
        return { color: "var(--muted)", icon: <Circle className="h-4 w-4" /> };
    }
  };

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

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      setIsLoadingData(true);
      try {
        try {
          const statusRes = await api.get("/tickets/statuses");
          const fetchedStatuses = Array.isArray(statusRes.data)
            ? statusRes.data
            : [];
          if (isMounted) {
            setStatuses(fetchedStatuses);
          }
        } catch (err) {
          console.error("Status fetch failed:", err);
        }

        try {
          const userRes = await api.get("/users");
          if (isMounted) {
            setUsers(Array.isArray(userRes.data) ? userRes.data : []);
          }
        } catch (err) {
          console.error("User fetch failed:", err);
        }
      } catch (err) {
        console.error("Failed to fetch modal data:", err);
      } finally {
        if (isMounted) setIsLoadingData(false);
      }
    };

    if (isOpen) {
      setFormData({
        title: "",
        description: "",
        priority: "",
        statusId: "",
        assignedTo: "",
      });
      fetchData();
    }

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.statusId) {
      alert("Please wait for statuses to load or select one.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
        statusId: formData.statusId || null,
        assigneeId: formData.assignedTo || null,
      };

      await api.post("/tickets", payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("CREATE TICKET ERROR:", err.response?.data);
      alert(err.response?.data?.message || "Failed to create ticket.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div
        ref={modalRef}
        className="w-full max-w-4xl rounded-[2rem] border p-8 shadow-2xl"
        style={{
          backgroundColor: "var(--surface)",
          borderColor: "var(--border)",
          color: "var(--text)",
        }}
      >
        <div className="mb-6 border-b border-[var(--border)] pb-4">
          <h2 className="text-2xl font-black uppercase tracking-[0.25em]" style={{ color: "var(--text)" }}>
            Create New Ticket
          </h2>
          <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
            Add a new ticket with priority, status and assignee.
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
                  placeholder="Enter ticket title..."
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
                  rows={4}
                  placeholder="What needs to be fixed?"
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
                  {formData.assignedTo
                    ? users.find((user) => String(user.id) === formData.assignedTo)?.name
                    : isLoadingData
                    ? "Loading..."
                    : "Select Assignee"}
                </button>
                {openDropdown === "assign" && (
                  <div
                    className="absolute left-0 right-0 mt-2 max-h-60 overflow-auto rounded-3xl border shadow-2xl z-20"
                    style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
                  >
                    {users.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, assignedTo: String(user.id) });
                          setOpenDropdown(null);
                        }}
                        className={`w-full text-left px-4 py-3 text-sm transition dropdown-option ${formData.assignedTo === String(user.id) ? "selected" : ""}`}
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
                      ? getStatusBadgeStyle(
                          statuses.find((s) => String(s.id) === formData.statusId)?.name || ""
                        ).color
                      : "var(--input-text)",
                  }}
                >
                  <span className="flex items-center gap-2">
                    {formData.statusId && (
                      <span
                        className="inline-flex"
                        style={{
                          color: getStatusBadgeStyle(
                            statuses.find((s) => String(s.id) === formData.statusId)?.name || ""
                          ).color,
                        }}
                      >
                        {getStatusBadgeStyle(
                          statuses.find((s) => String(s.id) === formData.statusId)?.name || ""
                        ).icon}
                      </span>
                    )}
                    <span>
                      {formData.statusId
                        ? statuses.find((s) => String(s.id) === formData.statusId)?.name
                        : isLoadingData
                        ? "Loading..."
                        : "Select Status"}
                    </span>
                  </span>
                </button>
                {openDropdown === "status" && (
                  <div
                    className="absolute left-0 right-0 mt-2 max-h-60 overflow-auto rounded-3xl shadow-2xl z-20"
                    style={{ backgroundColor: "var(--surface)" }}
                  >
                    {statuses.map((s) => {
                      const statusStyle = getStatusBadgeStyle(s.name);
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, statusId: String(s.id) });
                            setOpenDropdown(null);
                          }}
                          className={`w-full text-left px-4 py-3 text-sm transition dropdown-option ${formData.statusId === String(s.id) ? "selected" : ""}`}
                          style={{
                            color: statusStyle.color,
                          }}
                        >
                          <span className="flex items-center gap-2">
                            <span>{statusStyle.icon}</span>
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
                    color: getPriorityBadgeStyle(formData.priority).color,
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
                    ].map((option) => {
                      const priorityStyle = getPriorityBadgeStyle(option.value);
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, priority: option.value });
                            setOpenDropdown(null);
                          }}
                          className={`w-full text-left px-4 py-3 text-sm transition dropdown-option ${formData.priority === option.value ? "selected" : ""}`}
                          style={{
                            color: priorityStyle.color,
                          }}
                        >
                          {option.label}
                        </button>
                      );
                    })}
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
              disabled={isSubmitting || isLoadingData}
              className="flex-1 rounded-3xl px-6 py-3 font-black uppercase tracking-widest transition duration-200 ease-out transform hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/10"
              style={{
                backgroundColor: "var(--button-bg)",
                color: "var(--button-text)",
                border: "1px solid var(--border)",
                opacity: isSubmitting || isLoadingData ? 0.6 : 1,
              }}
            >
              {isSubmitting ? "Creating..." : "Submit Ticket"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTicketModal;

import { useState, useEffect, useRef } from "react";
import { CheckCircle, Clock, Lock, Inbox, Eye, AlertTriangle, Circle, Video, ChevronDown } from "lucide-react";
import api from "../services/api";
import { getApiErrorMessage } from "../utils/apiError";
import type { TicketStatus, User, PlatformVersion } from "../types";
import AssigneeMultiSelect from "./AssigneeMultiSelect";
import PlatformVersionMultiSelect from "./PlatformVersionMultiSelect";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  /** Tickets silently inherit the collection of the dashboard they're created from. */
  defaultCollectionId?: string;
}

const CreateTicketModal = ({ isOpen, onClose, onSuccess, defaultCollectionId }: Props) => {
  const [statuses, setStatuses] = useState<TicketStatus[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [platformVersions, setPlatformVersions] = useState<PlatformVersion[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [loadingPv, setLoadingPv] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    jamUrl: "",
    priority: "",
    statusId: "",
    assigneeIds: [] as string[],
    platformVersionIds: [] as string[],
  });
  const [openDropdown, setOpenDropdown] = useState<"priority" | "status" | null>(null);
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
          const fetchedStatuses = Array.isArray(statusRes.data) ? statusRes.data : [];
          if (isMounted) setStatuses(fetchedStatuses);
        } catch (err) {
          console.error("Status fetch failed:", err);
        }

        try {
          const userRes = await api.get("/users");
          if (isMounted) setUsers(Array.isArray(userRes.data) ? userRes.data : []);
        } catch (err) {
          console.error("User fetch failed:", err);
        }
      } catch (err) {
        console.error("Failed to fetch modal data:", err);
      } finally {
        if (isMounted) setIsLoadingData(false);
      }
    };

    const fetchPlatformVersions = async () => {
      if (!defaultCollectionId) {
        setPlatformVersions([]);
        return;
      }
      setLoadingPv(true);
      try {
        const res = await api.get(`/collections/${defaultCollectionId}/platform-versions`);
        if (isMounted) setPlatformVersions(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        if (isMounted) setPlatformVersions([]);
      } finally {
        if (isMounted) setLoadingPv(false);
      }
    };

    if (isOpen) {
      setFormData({
        title: "",
        description: "",
        jamUrl: "",
        priority: "",
        statusId: "",
        assigneeIds: [],
        platformVersionIds: [],
      });
      setError("");
      fetchData();
      fetchPlatformVersions();
    }

    return () => {
      isMounted = false;
    };
  }, [isOpen, defaultCollectionId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.title.trim()) { setError("Title is required."); return; }
    if (!formData.description.trim()) { setError("Description is required."); return; }
    if (!formData.statusId) { setError("Status is required — please pick one."); return; }
    if (!formData.priority) { setError("Priority is required — please pick Low, Medium or High."); return; }

    setIsSubmitting(true);
    try {
      const payload: Record<string, any> = {
        title: formData.title,
        description: formData.description,
        jamUrl: formData.jamUrl.trim() || null,
        priority: formData.priority,
        statusId: formData.statusId || null,
        assigneeIds: formData.assigneeIds,
        platformVersionIds: formData.platformVersionIds,
      };
      // Silently file the ticket under the dashboard's collection (the
      // backend falls back to the org's default collection when omitted).
      if (defaultCollectionId) payload.collectionId = defaultCollectionId;

      await api.post("/tickets", payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("CREATE TICKET ERROR:", err.response?.data);
      setError(getApiErrorMessage(err, "Failed to create ticket."));
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
    <div className="modal-overlay">
      <div
        ref={modalRef}
        className="modal-panel max-w-4xl rounded-[2rem] p-8"
      >
        <div className="mb-6 border-b border-[var(--border)] pb-4">
          <h2 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text)" }}>
            Create new ticket
          </h2>
          <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
            Add a new ticket with priority, status, assignees and platform/version.
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
                  placeholder="Enter ticket title..."
                  className="field px-4 py-3 outline-none"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div>
                <label className={labelCls} style={{ color: "var(--muted)" }}>Description</label>
                <textarea
                  required
                  rows={4}
                  placeholder="What needs to be fixed? Add as much or as little detail as you like."
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
                    placeholder="https://jam.dev/c/your-recording"
                    className="field pl-10 pr-4 py-3 outline-none"
                    value={formData.jamUrl}
                    onChange={(e) => setFormData({ ...formData, jamUrl: e.target.value })}
                  />
                </div>
                <p className="mt-1.5 text-xs" style={{ color: "var(--muted)" }}>
                  Paste a Jam (jam.dev) or screen-recording link so devs can see the bug in action.
                </p>
              </div>
            </div>

            <div className="space-y-4" ref={dropdownGroupRef}>
              <div>
                <label className={labelCls} style={{ color: "var(--muted)" }}>Assign To</label>
                <AssigneeMultiSelect
                  users={users}
                  selectedIds={formData.assigneeIds}
                  onChange={(ids) => setFormData({ ...formData, assigneeIds: ids })}
                  loading={isLoadingData}
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className={labelCls} style={{ color: "var(--muted)" }}>Platform / Version</label>
                <PlatformVersionMultiSelect
                  options={platformVersions}
                  selectedIds={formData.platformVersionIds}
                  onChange={(ids) => setFormData({ ...formData, platformVersionIds: ids })}
                  loading={loadingPv}
                  disabled={isSubmitting}
                  emptyHint={defaultCollectionId ? "No platforms/versions yet — add them on the Collections page." : "Open a collection to pick a platform/version."}
                />
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
                      ? getStatusBadgeStyle(statuses.find((s) => String(s.id) === formData.statusId)?.name || "").color
                      : "var(--input-text)",
                  }}
                >
                  <span className="flex items-center gap-2">
                    {formData.statusId && (
                      <span className="inline-flex" style={{ color: getStatusBadgeStyle(statuses.find((s) => String(s.id) === formData.statusId)?.name || "").color }}>
                        {getStatusBadgeStyle(statuses.find((s) => String(s.id) === formData.statusId)?.name || "").icon}
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
                  <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${openDropdown === "status" ? "rotate-180" : ""}`} style={{ color: "var(--muted)" }} />
                </button>
                {openDropdown === "status" && (
                  <div
                    className="dropdown-menu absolute left-0 right-0 mt-2 max-h-60 overflow-auto rounded-2xl border shadow-2xl z-20 p-1"
                    style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
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
                          className={`w-full text-left px-3 py-2.5 text-sm transition dropdown-option ${formData.statusId === String(s.id) ? "selected" : ""}`}
                          style={{ color: statusStyle.color }}
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
                <label className={labelCls} style={{ color: "var(--muted)" }}>Priority</label>
                <button
                  type="button"
                  onClick={() => setOpenDropdown((prev) => (prev === "priority" ? null : "priority"))}
                  className="field flex w-full items-center justify-between px-4 py-3 text-left outline-none"
                  style={{ ...triggerStyle, color: getPriorityBadgeStyle(formData.priority).color }}
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
                          className={`w-full text-left px-3 py-2.5 text-sm transition dropdown-option ${formData.priority === option.value ? "selected" : ""}`}
                          style={{ color: priorityStyle.color }}
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
            <button type="button" onClick={onClose} className="btn btn-ghost flex-1 px-6 py-3 text-sm uppercase tracking-widest font-bold">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting || isLoadingData} className="btn btn-primary flex-1 px-6 py-3 text-sm uppercase tracking-widest font-bold">
              {isSubmitting ? (<><span className="ui-spinner h-4 w-4" /> Creating…</>) : "Submit Ticket"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTicketModal;

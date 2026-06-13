import { useState } from "react";
import { Trash2, Video, ExternalLink, Sparkles, Layers } from "lucide-react";
import type { TicketStatus, User } from "../types";
import { getPriorityBadgeClasses, getStatusMeta } from "../utils/labelStyles";
import TicketActivity from "./TicketActivity";
import TicketAiAssistant from "./TicketAiAssistant";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  ticket: any;
  statuses: TicketStatus[];
  users: User[];
  isAdmin?: boolean;
  currentUserId?: string;
  onApprove?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

const TicketDetailModal = ({
  isOpen,
  onClose,
  ticket,
  statuses,
  users,
  isAdmin,
  currentUserId,
  onApprove,
  onEdit,
  onDelete,
}: Props) => {
  const [aiOpen, setAiOpen] = useState(false);

  if (!isOpen) return null;

  const reporterId = String(
    ticket.reporter?.id || ticket.reportedBy || ticket.reported_by || "",
  ).toLowerCase();
  const isReporter = !!currentUserId && reporterId === String(currentUserId).toLowerCase();
  const canDelete = !!onDelete && (isAdmin || isReporter);

  const getStatusName = (t: any): string => {
    if (typeof t.status === "string") return t.status;
    if (t.status?.name) return t.status.name;

    const statusId = t.statusId || t.status_id || t.status?.id;
    if (statusId) {
      const match = statuses.find(
        (s) => String(s.id).toLowerCase() === String(statusId).toLowerCase(),
      );
      if (match) return match.name;
    }
    return "Unknown";
  };

  const getUserName = (input: any): string => {
    if (!input) return "Unassigned";

    if (typeof input === "string" && input.length > 0 && !input.includes("-")) {
      return input;
    }

    if (typeof input === "object" && input.name) return input.name;

    const id = typeof input === "object" ? input.id : input;
    return (
      users.find((u) => String(u.id).toLowerCase() === String(id).toLowerCase())
        ?.name || "Unknown User"
    );
  };

  const selectedStatus = getStatusName(ticket);
  const statusMeta = getStatusMeta(selectedStatus);
  const priorityClasses = getPriorityBadgeClasses(ticket.priority || "");

  const jamUrl: string | null =
    ticket.jamUrl || ticket.jam_url || null;

  return (
    <div className="modal-overlay" style={{ zIndex: 110 }}>
      <div
        className="modal-panel w-full max-w-[90vw] lg:max-w-6xl max-h-[90vh] overflow-y-auto rounded-[2rem] p-8"
        style={{ color: "var(--text)" }}
      >
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span
                className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${priorityClasses}`}
              >
                {ticket.priority}
              </span>
            </div>
            <h2 className="text-3xl font-black uppercase tracking-tighter" style={{ color: "var(--text)" }}>
              {ticket.title}
            </h2>
          </div>
          <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={() => setAiOpen(true)}
            className="btn btn-soft h-12 px-4 text-xs font-bold uppercase tracking-widest"
            title="Ask AI about this ticket"
          >
            <Sparkles className="h-4 w-4" /> AI Assistant
          </button>
          <button
            onClick={onClose}
            className="rounded-full border border-[var(--border)] p-3 text-[var(--muted)] transition duration-200 ease-out hover:text-[var(--text)] hover:border-[var(--text)] hover:bg-[var(--card)]"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
          </div>
        </div>

        <div className="grid gap-8 xl:grid-cols-[1.75fr_1fr]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-[var(--border)] bg-[var(--input)] p-6">
              <label className="block text-[10px] font-black uppercase tracking-widest mb-2 text-[var(--muted)]">
                Ticket Description
              </label>
              <p className="text-sm leading-relaxed whitespace-pre-wrap break-words text-[var(--text)]">
                {ticket.description}
              </p>
            </div>

            {jamUrl && (
              <div className="rounded-3xl border border-[var(--border)] bg-[var(--input)] p-6">
                <label className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest mb-3 text-[var(--muted)]">
                  <Video className="h-3.5 w-3.5" /> Jam Recording
                </label>
                <a
                  href={jamUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-soft inline-flex max-w-full items-center gap-2 px-4 py-2.5 text-sm font-semibold"
                >
                  <Video className="h-4 w-4 shrink-0" />
                  <span className="truncate">Watch bug recording</span>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-70" />
                </a>
                <p className="mt-2 truncate text-xs font-mono" style={{ color: "var(--muted)" }}>{jamUrl}</p>
              </div>
            )}

            <div className="rounded-3xl border border-[var(--border)] bg-[var(--input)] p-6">
              <label className="block text-[10px] font-black uppercase tracking-widest mb-2 text-[var(--muted)]">
                Review Comments
              </label>
              <p className="text-sm italic text-[var(--muted)]">
                {ticket.comment || "No review comments yet."}
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-[var(--border)] bg-[var(--input)] p-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest mb-1 text-[var(--muted)]">
                      Current Status
                    </label>
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${statusMeta.labelClass}`}
                      >
                        {statusMeta.icon}
                        <span>{selectedStatus}</span>
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest mb-1 text-[var(--muted)]">
                      {Array.isArray(ticket.assignees) && ticket.assignees.length > 1 ? "Assignees" : "Assignee"}
                    </label>
                    {Array.isArray(ticket.assignees) && ticket.assignees.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {ticket.assignees.map((a: any, i: number) => (
                          <span
                            key={a.id}
                            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold"
                            style={{ backgroundColor: "var(--accent-soft)", color: "var(--accent)" }}
                            title={i === 0 ? "Primary assignee" : a.email}
                          >
                            {i === 0 && <span className="text-[9px] font-black uppercase opacity-70">Primary</span>}
                            {a.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm font-bold text-[var(--text)]">
                        {getUserName(
                          ticket.assignee ||
                            ticket.assigneeId ||
                            ticket.assignedTo ||
                            ticket.assigned_to,
                        )}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest mb-1 text-[var(--muted)]">
                      Reporter
                    </label>
                    <p className="text-sm font-bold text-[var(--text)]">
                      {getUserName(
                        ticket.reporter || ticket.reportedBy || ticket.reported_by,
                      )}
                    </p>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest mb-1 text-[var(--muted)]">
                      Platform / Version
                    </label>
                    {ticket.platformVersion ? (
                      <span
                        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold"
                        style={{ backgroundColor: "var(--accent-soft)", color: "var(--accent)" }}
                      >
                        <Layers className="h-3.5 w-3.5" />
                        {ticket.platformVersion.platform}
                        <span className="rounded px-1.5 py-0.5 text-[10px] font-bold" style={{ backgroundColor: "var(--surface)", color: "var(--text)" }}>
                          {ticket.platformVersion.version}
                        </span>
                      </span>
                    ) : (
                      <p className="text-sm font-bold text-[var(--muted)]">Not specified</p>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest mb-1 text-[var(--muted)]">
                      Reviewed By
                    </label>
                    <p className="text-sm font-bold text-[var(--text)]">
                      {getUserName(ticket.reviewedBy || "Not reviewed")}
                    </p>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest mb-1 text-[var(--muted)]">
                      Approval Status
                    </label>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${
                        ticket.approvalStatus === "Approved"
                          ? "text-emerald-600 border-emerald-500/40 bg-emerald-500/10"
                          : ticket.approvalStatus === "Rejected"
                          ? "text-rose-600 border-rose-500/40 bg-rose-500/10"
                          : "text-[var(--muted)] border-[var(--border)] bg-[var(--accent-soft)]"
                      }`}
                    >
                      {ticket.approvalStatus === "Approved"
                        ? "Approved"
                        : ticket.approvalStatus === "Rejected"
                        ? "Rejected"
                        : "Not yet approved"}
                    </span>
                  </div>

                  <div className="grid gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest mb-1 text-[var(--muted)]">
                        Created
                      </label>
                      <p className="text-xs font-mono text-[var(--muted)]">
                        {ticket.created_at || ticket.createdAt
                          ? new Date(
                              ticket.created_at || ticket.createdAt,
                            ).toLocaleString()
                          : "N/A"}
                      </p>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest mb-1 text-[var(--muted)]">
                        Updated
                      </label>
                      <p className="text-xs font-mono text-[var(--muted)]">
                        {ticket.updated_at || ticket.updatedAt
                          ? new Date(
                              ticket.updated_at || ticket.updatedAt,
                            ).toLocaleString()
                          : "N/A"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              {canDelete ? (
                <button onClick={onDelete} className="btn btn-danger h-12 px-5 text-sm font-bold uppercase tracking-widest">
                  <Trash2 className="h-4 w-4" /> Delete
                </button>
              ) : (
                <span />
              )}
              <div className="flex items-center gap-3">
                <button onClick={onEdit} className="btn btn-ghost h-12 px-6 text-sm font-bold uppercase tracking-widest">
                  Edit Ticket
                </button>
                {isAdmin && (
                  <button
                    onClick={() => {
                      onClose();
                      onApprove?.();
                    }}
                    className="btn btn-primary h-12 px-6 text-sm font-bold uppercase tracking-widest"
                  >
                    Start Review
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t" style={{ borderColor: "var(--border)" }}>
          <TicketActivity ticketId={ticket.id} currentUserId={currentUserId} isAdmin={isAdmin} />
        </div>
      </div>

      <TicketAiAssistant
        isOpen={aiOpen}
        onClose={() => setAiOpen(false)}
        ticketId={ticket.id}
        ticketTitle={ticket.title}
      />
    </div>
  );
};

export default TicketDetailModal;

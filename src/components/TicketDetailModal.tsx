import type { TicketStatus, User } from "../types";
import { getPriorityBadgeClasses, getStatusMeta } from "../utils/labelStyles";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  ticket: any;
  statuses: TicketStatus[];
  users: User[];
  isAdmin?: boolean;
  onApprove?: () => void;
  onEdit?: () => void;
}

const TicketDetailModal = ({
  isOpen,
  onClose,
  ticket,
  statuses,
  users,
  isAdmin,
  onApprove,
  onEdit,
}: Props) => {
  if (!isOpen) return null;

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

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div
        className="w-full max-w-[90vw] lg:max-w-6xl max-h-[90vh] overflow-y-auto rounded-[2rem] border shadow-2xl bg-[var(--surface)] p-8"
        style={{ borderColor: "var(--border)", color: "var(--text)" }}
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

        <div className="grid gap-8 xl:grid-cols-[1.75fr_1fr]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-[var(--border)] bg-[var(--input)] p-6">
              <label className="block text-[10px] font-black uppercase tracking-widest mb-2 text-[var(--muted)]">
                Ticket Description
              </label>
              <p className="text-sm leading-relaxed text-[var(--text)]">
                {ticket.description}
              </p>
            </div>

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
                      Assignee
                    </label>
                    <p className="text-sm font-bold text-[var(--text)]">
                      {getUserName(
                        ticket.assignee ||
                          ticket.assigneeId ||
                          ticket.assignedTo ||
                          ticket.assigned_to,
                      )}
                    </p>
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
                      className={`text-[10px] font-black uppercase ${
                        ticket.approvalStatus === "Approved"
                          ? "text-emerald-400"
                          : ticket.approvalStatus === "Rejected"
                          ? "text-rose-400"
                          : "text-[var(--muted)]"
                      }`}
                    >
                      {ticket.approvalStatus || "Pending"}
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

            <div className="flex flex-wrap items-center justify-end gap-3">
              <button
                onClick={onEdit}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-8 py-3 text-sm font-bold uppercase tracking-widest text-[var(--text)] transition duration-200 ease-out transform hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/10"
              >
                Edit Ticket
              </button>
              {isAdmin && (
                <button
                  onClick={() => {
                    onClose();
                    onApprove?.();
                  }}
                  className="rounded-xl border border-[var(--border)] bg-[var(--button-bg)] px-8 py-3 text-sm font-bold uppercase tracking-widest text-[var(--button-text)] transition duration-200 ease-out transform hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/10"
                >
                  Start Review
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TicketDetailModal;

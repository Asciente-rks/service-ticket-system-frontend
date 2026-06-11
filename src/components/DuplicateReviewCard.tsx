import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CopyX, Trash2, ArrowUpRight, CheckCircle2, Clock3 } from "lucide-react";
import api from "../services/api";
import { getApiErrorMessage } from "../utils/apiError";
import ConfirmDialog from "./ConfirmDialog";
import type { AiDuplicateGroup, AiTicketRef } from "../types";

interface Props {
  groups: AiDuplicateGroup[];
  /** Called when the user chooses to keep everything (sends a chat message). */
  onKeepAll?: () => void;
  /** Called after a successful deletion so the parent can react if needed. */
  onTicketDeleted?: (ticketId: string) => void;
}

/**
 * Interactive duplicate-review controls rendered under an AI message that
 * carries duplicateGroups meta. Deletion happens through the normal ticket
 * API with the user's own permissions (admins or the ticket's reporter) —
 * the AI itself never deletes anything.
 */
const DuplicateReviewCard = ({ groups, onKeepAll, onTicketDeleted }: Props) => {
  const navigate = useNavigate();
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [confirmTicket, setConfirmTicket] = useState<AiTicketRef | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [keptAll, setKeptAll] = useState(false);

  const priorityColor = (p?: string) =>
    p === "High" ? "#ef4444" : p === "Medium" ? "#f59e0b" : p === "Low" ? "#10b981" : "var(--muted)";

  const confirmDelete = async () => {
    if (!confirmTicket) return;
    setBusy(true);
    setError("");
    try {
      await api.delete(`/tickets/${confirmTicket.id}`);
      setDeletedIds((prev) => new Set(prev).add(confirmTicket.id));
      onTicketDeleted?.(confirmTicket.id);
      setConfirmTicket(null);
    } catch (err: any) {
      setError(getApiErrorMessage(err, "Couldn't delete this ticket. Only admins or the ticket's reporter can delete it."));
      setConfirmTicket(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-3 rounded-2xl border overflow-hidden" style={{ borderColor: "rgba(245,158,11,0.4)" }}>
      <div className="flex items-center gap-2 px-4 py-2.5" style={{ backgroundColor: "rgba(245,158,11,0.1)" }}>
        <CopyX className="h-4 w-4 shrink-0" style={{ color: "#f59e0b" }} />
        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#b45309" }}>
          Duplicate review — choose an action
        </p>
      </div>

      <div className="p-3 space-y-3" style={{ backgroundColor: "var(--bg)" }}>
        {groups.map((group, gi) => (
          <div key={gi} className="rounded-xl border p-3" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}>
            <p className="mb-2 text-xs font-semibold" style={{ color: "var(--muted)" }}>
              Group {gi + 1} · {group.reason}
            </p>
            <div className="space-y-1.5">
              {group.tickets.map((t) => {
                const isDeleted = deletedIds.has(t.id);
                return (
                  <div
                    key={t.id}
                    className="flex items-center gap-2.5 rounded-lg border px-3 py-2"
                    style={{ borderColor: "var(--border)", backgroundColor: "var(--bg)", opacity: isDeleted ? 0.55 : 1 }}
                  >
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-sm font-semibold ${isDeleted ? "line-through" : ""}`} style={{ color: "var(--text)" }}>
                        {t.title}
                      </p>
                      <p className="text-[11px]" style={{ color: "var(--muted)" }}>
                        {t.status || "Unknown"}
                        {t.priority && (
                          <>
                            {" · "}
                            <span className="font-bold" style={{ color: priorityColor(t.priority) }}>{t.priority}</span>
                          </>
                        )}
                      </p>
                    </div>

                    {isDeleted ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold" style={{ color: "#10b981" }}>
                        <CheckCircle2 className="h-3.5 w-3.5" /> Deleted
                      </span>
                    ) : (
                      <div className="flex shrink-0 items-center gap-1.5">
                        <button
                          onClick={() => navigate(`/dashboard?ticketId=${t.id}`)}
                          className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition hover:bg-[var(--accent-soft)]"
                          style={{ borderColor: "var(--border)", color: "var(--accent)" }}
                          title="Open this ticket"
                        >
                          Open <ArrowUpRight className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => { setError(""); setConfirmTicket(t); }}
                          className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition hover:bg-red-500/10"
                          style={{ borderColor: "rgba(239,68,68,0.4)", color: "#ef4444" }}
                          title="Delete this duplicate ticket"
                        >
                          <Trash2 className="h-3 w-3" /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {error && <p className="text-xs font-semibold" style={{ color: "#ef4444" }}>{error}</p>}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pt-1">
          <p className="text-[11px]" style={{ color: "var(--muted)" }}>
            Deleting is permanent. Keep the original ticket and remove only the extra copies.
          </p>
          {!keptAll ? (
            <button
              onClick={() => { setKeptAll(true); onKeepAll?.(); }}
              className="btn btn-ghost h-9 shrink-0 px-4 text-xs font-bold"
            >
              <Clock3 className="h-3.5 w-3.5" /> Keep everything — review later
            </button>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold shrink-0" style={{ color: "var(--muted)" }}>
              <CheckCircle2 className="h-3.5 w-3.5" /> Kept for later review
            </span>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={!!confirmTicket}
        title="Delete this duplicate ticket?"
        message={
          <>
            "{confirmTicket?.title}" will be permanently removed along with its comments and history. This cannot be undone.
          </>
        }
        confirmLabel="Delete ticket"
        variant="danger"
        loading={busy}
        onConfirm={confirmDelete}
        onCancel={() => { if (!busy) setConfirmTicket(null); }}
      />
    </div>
  );
};

export default DuplicateReviewCard;

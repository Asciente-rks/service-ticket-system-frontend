import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CopyX, Trash2, ArrowUpRight, CheckCircle2, Clock3 } from "lucide-react";
import api from "../services/api";
import { getApiErrorMessage } from "../utils/apiError";
import ConfirmDialog from "./ConfirmDialog";
import type { AiDuplicateGroup, AiTicketRef } from "../types";

interface Props {
  groups: AiDuplicateGroup[];
  /** Fired after each successful deletion (parent triggers the AI re-check). */
  onTicketDeleted?: (ticket: AiTicketRef) => void;
  /** Open a ticket as an overlay instead of navigating away (keeps the chat in view). */
  onOpenTicket?: (id: string, collectionId?: string | null) => void;
}

const ticketUrl = (t: AiTicketRef) =>
  t.collectionId ? `/dashboard?collection=${t.collectionId}&ticketId=${t.id}` : `/dashboard?ticketId=${t.id}`;

/**
 * Interactive duplicate-review controls rendered under an AI message.
 * One independent action card per duplicate group — each with its own
 * Open/Delete controls and a per-group "keep" decision. Deletion goes
 * through the normal ticket API with the user's own permissions (admins or
 * the ticket's reporter) — the AI itself never deletes anything.
 */
const DuplicateReviewCard = ({ groups, onTicketDeleted, onOpenTicket }: Props) => {
  const navigate = useNavigate();
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [keptGroups, setKeptGroups] = useState<Set<number>>(new Set());
  const [confirmTicket, setConfirmTicket] = useState<AiTicketRef | null>(null);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<number, string>>({});

  const priorityColor = (p?: string) =>
    p === "High" ? "#ef4444" : p === "Medium" ? "#f59e0b" : p === "Low" ? "#10b981" : "var(--muted)";

  const confirmDelete = async () => {
    if (!confirmTicket) return;
    const groupIndex = groups.findIndex((g) => g.tickets.some((t) => t.id === confirmTicket.id));
    setBusy(true);
    try {
      await api.delete(`/tickets/${confirmTicket.id}`);
      setDeletedIds((prev) => new Set(prev).add(confirmTicket.id));
      setErrors((prev) => ({ ...prev, [groupIndex]: "" }));
      onTicketDeleted?.(confirmTicket);
      setConfirmTicket(null);
    } catch (err: any) {
      setErrors((prev) => ({
        ...prev,
        [groupIndex]: getApiErrorMessage(err, "Couldn't delete this ticket. Only admins or the ticket's reporter can delete it."),
      }));
      setConfirmTicket(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-3 space-y-3">
      {groups.map((group, gi) => {
        const remaining = group.tickets.filter((t) => !deletedIds.has(t.id));
        const resolved = remaining.length <= 1;
        const kept = keptGroups.has(gi);

        return (
          <div key={gi} className="overflow-hidden rounded-2xl border" style={{ borderColor: resolved ? "rgba(16,185,129,0.45)" : "rgba(245,158,11,0.45)" }}>
            {/* Group header */}
            <div
              className="flex items-center gap-2 px-4 py-2.5"
              style={{ backgroundColor: resolved ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.1)" }}
            >
              {resolved ? (
                <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: "#10b981" }} />
              ) : (
                <CopyX className="h-4 w-4 shrink-0" style={{ color: "#f59e0b" }} />
              )}
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: resolved ? "#047857" : "#b45309" }}>
                {resolved ? `Group ${gi + 1} — resolved` : `Duplicate group ${gi + 1} — choose an action`}
              </p>
              {!resolved && group.confidence && (
                <span
                  className="ml-auto shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                  style={
                    group.confidence === "high"
                      ? { backgroundColor: "rgba(239,68,68,0.12)", color: "#dc2626" }
                      : { backgroundColor: "rgba(245,158,11,0.15)", color: "#b45309" }
                  }
                >
                  {group.confidence === "high" ? "High match" : "Possible match"}
                </span>
              )}
            </div>

            <div className="space-y-2 p-3" style={{ backgroundColor: "var(--bg)" }}>
              <p className="text-xs" style={{ color: "var(--muted)" }}>{group.reason}</p>

              <div className="space-y-1.5">
                {group.tickets.map((t) => {
                  const isDeleted = deletedIds.has(t.id);
                  return (
                    <div
                      key={t.id}
                      className="flex items-center gap-2.5 rounded-lg border px-3 py-2"
                      style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)", opacity: isDeleted ? 0.55 : 1 }}
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
                            onClick={() => {
                              if (onOpenTicket) onOpenTicket(t.id, t.collectionId);
                              else navigate(ticketUrl(t));
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition hover:bg-[var(--accent-soft)]"
                            style={{ borderColor: "var(--border)", color: "var(--accent)" }}
                            title="Open this ticket"
                          >
                            Open <ArrowUpRight className="h-3 w-3" />
                          </button>
                          {!kept && (
                            <button
                              onClick={() => setConfirmTicket(t)}
                              className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition hover:bg-red-500/10"
                              style={{ borderColor: "rgba(239,68,68,0.4)", color: "#ef4444" }}
                              title="Delete this duplicate ticket"
                            >
                              <Trash2 className="h-3 w-3" /> Delete
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {errors[gi] && <p className="text-xs font-semibold" style={{ color: "#ef4444" }}>{errors[gi]}</p>}

              <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[11px]" style={{ color: "var(--muted)" }}>
                  {resolved
                    ? "This group has been handled."
                    : "Deleting is permanent — keep the original and remove only the extra copies."}
                </p>
                {!resolved && (
                  kept ? (
                    <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-bold" style={{ color: "var(--muted)" }}>
                      <CheckCircle2 className="h-3.5 w-3.5" /> Kept for later review
                    </span>
                  ) : (
                    <button
                      onClick={() => setKeptGroups((prev) => new Set(prev).add(gi))}
                      className="btn btn-ghost h-8 shrink-0 px-3 text-[11px] font-bold"
                    >
                      <Clock3 className="h-3.5 w-3.5" /> Keep this group — review later
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
        );
      })}

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

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import api from "../services/api";
import { getApiErrorMessage } from "../utils/apiError";
import { getLoggedInUser } from "../utils/auth";
import TicketDetailModal from "./TicketDetailModal";
import EditTicketModal from "./EditTicketModal";
import ApprovalModal from "./ApprovalModal";
import ConfirmDialog from "./ConfirmDialog";
import type { TicketStatus, User, Role } from "../types";

interface Props {
  /** When set, the ticket is fetched and shown as an overlay. */
  ticketId: string | null;
  onClose: () => void;
  /** Fired after the ticket was deleted from this view (e.g. to re-run a check). */
  onTicketDeleted?: (ticketId: string) => void;
  /** Fired after any change (edit/approve) so callers can refresh if needed. */
  onChanged?: () => void;
}

/**
 * Opens a ticket's full detail (with Edit / Review / Delete) as a modal overlay
 * on top of whatever screen the user is on — so reviewing a ticket from the AI
 * chat (or anywhere) never navigates the user away and back.
 *
 * Self-contained: fetches the ticket plus the reference data (statuses, users,
 * roles) it needs, and orchestrates the edit/approval/delete sub-modals.
 */
const TicketQuickView = ({ ticketId, onClose, onTicketDeleted, onChanged }: Props) => {
  const [ticket, setTicket] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [statuses, setStatuses] = useState<TicketStatus[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const currentUser = getLoggedInUser();

  // "Start Review" in the detail modal calls onClose() then onApprove() in the
  // same tick. We defer the actual close so openApproval() can cancel it —
  // otherwise the whole overlay (incl. the approval modal) would unmount.
  const pendingCloseRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestClose = useCallback(() => {
    if (pendingCloseRef.current) clearTimeout(pendingCloseRef.current);
    pendingCloseRef.current = setTimeout(() => {
      pendingCloseRef.current = null;
      onClose();
    }, 0);
  }, [onClose]);
  const openApproval = () => {
    if (pendingCloseRef.current) {
      clearTimeout(pendingCloseRef.current);
      pendingCloseRef.current = null;
    }
    setIsApproveOpen(true);
  };
  useEffect(() => () => { if (pendingCloseRef.current) clearTimeout(pendingCloseRef.current); }, []);

  // Reference data — fetched once, reused for every ticket opened in this view.
  useEffect(() => {
    let active = true;
    Promise.allSettled([
      api.get("/tickets/statuses"),
      api.get("/users"),
      api.get("/users/roles"),
    ]).then(([s, u, r]) => {
      if (!active) return;
      if (s.status === "fulfilled") setStatuses(Array.isArray(s.value.data) ? s.value.data : []);
      if (u.status === "fulfilled") setUsers(Array.isArray(u.value.data) ? u.value.data : []);
      if (r.status === "fulfilled") setRoles(Array.isArray(r.value.data) ? r.value.data : []);
    });
    return () => {
      active = false;
    };
  }, []);

  const fetchTicket = useCallback(
    async (silent = false) => {
      if (!ticketId) return;
      if (!silent) {
        setLoading(true);
        setError("");
      }
      try {
        const res = await api.get(`/tickets/${ticketId}`);
        setTicket(res.data);
      } catch (err: any) {
        if (!silent) setError(getApiErrorMessage(err, "Couldn't load this ticket."));
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [ticketId],
  );

  useEffect(() => {
    setTicket(null);
    setIsEditOpen(false);
    setIsApproveOpen(false);
    setConfirmingDelete(false);
    if (ticketId) fetchTicket();
  }, [ticketId, fetchTicket]);

  const isAdmin = useMemo(() => {
    if (!currentUser || roles.length === 0) return false;
    const userRoleId = String(currentUser.roleId).toLowerCase();
    return roles
      .filter((r) => ["admin", "administrator", "superadmin", "super admin", "super-admin", "root"].includes(r.name.toLowerCase()))
      .some((r) => String(r.id).toLowerCase() === userRoleId);
  }, [currentUser, roles]);

  const confirmDelete = async () => {
    if (!ticketId) return;
    setDeleteBusy(true);
    try {
      await api.delete(`/tickets/${ticketId}`);
      setConfirmingDelete(false);
      onTicketDeleted?.(ticketId);
      onChanged?.();
      onClose();
    } catch (err: any) {
      setError(getApiErrorMessage(err, "Couldn't delete this ticket. Only admins or the reporter can delete it."));
      setConfirmingDelete(false);
    } finally {
      setDeleteBusy(false);
    }
  };

  if (!ticketId) return null;

  // Lightweight loading / error overlay while the ticket is being fetched.
  if (!ticket) {
    return (
      <div className="modal-overlay" style={{ zIndex: 110 }} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="modal-panel max-w-sm w-full rounded-3xl p-8 text-center">
          {error ? (
            <>
              <p className="text-sm font-semibold" style={{ color: "#ef4444" }}>{error}</p>
              <button onClick={onClose} className="btn btn-ghost mt-4 px-5 py-2 text-sm font-bold">Close</button>
            </>
          ) : (
            <div className="flex flex-col items-center gap-3" style={{ color: "var(--muted)" }}>
              <span className="ui-spinner h-6 w-6" />
              <span className="text-sm">Loading ticket…</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <TicketDetailModal
        isOpen
        onClose={requestClose}
        ticket={ticket}
        statuses={statuses}
        users={users}
        isAdmin={isAdmin}
        currentUserId={currentUser?.id}
        onApprove={openApproval}
        onEdit={() => setIsEditOpen(true)}
        onDelete={() => setConfirmingDelete(true)}
      />

      <EditTicketModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSuccess={async () => {
          await fetchTicket(true);
          onChanged?.();
        }}
        ticket={ticket}
        statuses={statuses}
        users={users}
        roles={roles}
      />

      {isApproveOpen && (
        <ApprovalModal
          isOpen={isApproveOpen}
          onClose={() => setIsApproveOpen(false)}
          ticketId={ticket.id}
          onSuccess={async () => {
            await fetchTicket(true);
            onChanged?.();
          }}
        />
      )}

      <ConfirmDialog
        isOpen={confirmingDelete}
        title="Delete this ticket?"
        message={<>This permanently removes the ticket and its review history. This cannot be undone.</>}
        confirmLabel="Delete ticket"
        variant="danger"
        loading={deleteBusy}
        onConfirm={confirmDelete}
        onCancel={() => { if (!deleteBusy) setConfirmingDelete(false); }}
      />
    </>
  );
};

export default TicketQuickView;

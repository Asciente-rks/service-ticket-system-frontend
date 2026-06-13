import { useEffect, useState, useCallback } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { CheckCircle, Clock, Lock, Inbox, Eye, AlertTriangle, Circle, Trash2, Plus, Ticket as TicketIcon, FolderKanban, Sparkles, X, Layers } from "lucide-react";
import api from "../services/api";
import type { Ticket, TicketStatus, User, Role, Collection, AiDuplicateGroup } from "../types";
import CreateTicketModal from "../components/CreateTicketModal";
import TicketDetailModal from "../components/TicketDetailModal";
import ApprovalModal from "../components/ApprovalModal";
import EditTicketModal from "../components/EditTicketModal";
import ConfirmDialog from "../components/ConfirmDialog";
import { getLoggedInUser } from "../utils/auth";

const Dashboard = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [statuses, setStatuses] = useState<TicketStatus[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [approvingTicketId, setApprovingTicketId] = useState<string | null>(null);
  const [deletingTicketId, setDeletingTicketId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [dupGroups, setDupGroups] = useState<AiDuplicateGroup[]>([]);
  const [dupDismissed, setDupDismissed] = useState(false);

  const [filterType, setFilterType] = useState<"all" | "assigned" | "reported" | "closed">("all");
  const [prioritySort, setPrioritySort] = useState<string>("All");
  const [statusSort, setStatusSort] = useState<string>("All");
  const [approvalSort, setApprovalSort] = useState<"All" | "Approved" | "Pending" | "Rejected">("All");
  const [dateSort, setDateSort] = useState<"newest" | "oldest">("newest");

  const currentUser = getLoggedInUser();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [tReq, sReq, uReq, rReq, cReq] = await Promise.allSettled([
        api.get("/tickets"),
        api.get("/tickets/statuses"),
        api.get("/users"),
        api.get("/users/roles"),
        api.get("/collections"),
      ]);
      if (tReq.status === "fulfilled") setTickets(Array.isArray(tReq.value.data) ? tReq.value.data : []);
      if (cReq.status === "fulfilled") setCollections(Array.isArray(cReq.value.data) ? cReq.value.data : []);
      if (sReq.status === "fulfilled") setStatuses(Array.isArray(sReq.value.data) ? sReq.value.data : []);
      if (uReq.status === "fulfilled") setUsers(Array.isArray(uReq.value.data) ? uReq.value.data : []);
      if (rReq.status === "fulfilled") setRoles(Array.isArray(rReq.value.data) ? rReq.value.data : []);
    } catch (error) {
      console.error("Dashboard sync failed:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const requestDelete = (id: string) => {
    setDeleteError("");
    setDeletingTicketId(id);
  };

  const confirmDelete = async () => {
    if (!deletingTicketId) return;
    setIsDeleting(true);
    setDeleteError("");
    try {
      await api.delete(`/tickets/${deletingTicketId}`);
      setDeletingTicketId(null);
      setSelectedTicket(null);
      fetchData();
    } catch (err: any) {
      setDeleteError(err?.response?.data?.message || "Failed to delete ticket.");
    } finally {
      setIsDeleting(false);
    }
  };

  // AI duplicate detection for the active collection (cached server-side).
  const collectionParamForDup = searchParams.get("collection");
  useEffect(() => {
    setDupGroups([]);
    if (!collectionParamForDup) return;
    setDupDismissed(sessionStorage.getItem(`dupDismissed:${collectionParamForDup}`) === "1");

    let active = true;
    api
      .get(`/ai/duplicates?collectionId=${collectionParamForDup}`)
      .then((res) => {
        if (active && Array.isArray(res.data?.groups)) setDupGroups(res.data.groups);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [collectionParamForDup, tickets.length]);

  const dismissDuplicates = () => {
    setDupDismissed(true);
    if (collectionParamForDup) sessionStorage.setItem(`dupDismissed:${collectionParamForDup}`, "1");
  };

  const dupTicketTotal = dupGroups.reduce((n, g) => n + g.tickets.length, 0);

  // Open a ticket when arriving via ?ticketId=... (e.g. clicking a notification).
  // Tries the already-loaded list first, then falls back to fetching the single
  // ticket so it works even if the ticket isn't in the current list yet.
  useEffect(() => {
    const ticketId = searchParams.get("ticketId");
    if (!ticketId) return;

    // When the deep link has no collection, adopt the ticket's own collection
    // so the board behind the modal is its project space (strict separation).
    const clearParam = (ticket?: any) => {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("ticketId");
      const cid = ticket?.collectionId || ticket?.collection_id || null;
      if (!newParams.get("collection") && cid) newParams.set("collection", String(cid));
      setSearchParams(newParams, { replace: true });
    };

    const fromList = tickets.find((t) => String(t.id) === String(ticketId));
    if (fromList) {
      setSelectedTicket(fromList);
      clearParam(fromList);
      return;
    }

    let active = true;
    api
      .get(`/tickets/${ticketId}`)
      .then((res) => {
        if (active && res.data) {
          setSelectedTicket(res.data);
          clearParam(res.data);
        }
      })
      .catch(() => {
        if (active) clearParam();
      });
    return () => {
      active = false;
    };
  }, [tickets, searchParams, setSearchParams]);

  // Strict collection separation: the dashboard always belongs to a collection.
  // Arriving with neither a collection nor a ticket deep-link routes back to
  // the Collections page (which auto-enters a single collection).
  useEffect(() => {
    if (!searchParams.get("collection") && !searchParams.get("ticketId") && !selectedTicket) {
      navigate("/collections", { replace: true });
    }
  }, [searchParams, selectedTicket, navigate]);


  const getStatusName = (t: any): string => {
    if (typeof t.status === "string") return t.status;
    if (t.status?.name) return t.status.name;
    const statusId = t.statusId || t.status_id || t.status?.id;
    const match = statuses.find((s) => String(s.id).toLowerCase() === String(statusId).toLowerCase());
    return match?.name || "Unknown";
  };

  const getUserName = (input: any): string => {
    if (!input) return "Unassigned";
    if (typeof input === "string" && input.length > 0 && !input.includes("-")) return input;
    if (typeof input === "object" && input.name) return input.name;
    const id = typeof input === "object" ? input.id : input;
    return users.find((u) => String(u.id).toLowerCase() === String(id).toLowerCase())?.name || "Unknown";
  };

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case "High": return "border border-red-500/40 text-red-500 bg-red-500/10";
      case "Medium": return "border border-amber-500/40 text-amber-500 bg-amber-500/10";
      case "Low": return "border border-emerald-500/40 text-emerald-500 bg-emerald-500/10";
      default: return "border text-[var(--muted)]";
    }
  };

  const getStatusMeta = (statusName: string) => {
    switch (statusName) {
      case "Resolved": return { icon: <CheckCircle className="h-3.5 w-3.5" />, cls: "text-emerald-500 bg-emerald-500/10" };
      case "In Progress": return { icon: <Clock className="h-3.5 w-3.5" />, cls: "text-amber-500 bg-amber-500/10" };
      case "Open": return { icon: <Inbox className="h-3.5 w-3.5" />, cls: "text-sky-500 bg-sky-500/10" };
      case "Closed": return { icon: <Lock className="h-3.5 w-3.5" />, cls: "text-[var(--muted)] bg-[var(--accent-soft)]" };
      case "Ready for QA": return { icon: <Eye className="h-3.5 w-3.5" />, cls: "text-violet-500 bg-violet-500/10" };
      case "Error Persists": return { icon: <AlertTriangle className="h-3.5 w-3.5" />, cls: "text-rose-500 bg-rose-500/10" };
      default: return { icon: <Circle className="h-3.5 w-3.5" />, cls: "text-[var(--muted)] bg-[var(--accent-soft)]" };
    }
  };

  // Approval badge: green = Approved, rose = Rejected, gray = not yet reviewed.
  const getApprovalMeta = (t: any) => {
    const s = t.approvalStatus || t.approval_status || null;
    if (s === "Approved") return { label: "Approved", cls: "text-emerald-600 bg-emerald-500/10 border border-emerald-500/30" };
    if (s === "Rejected") return { label: "Rejected", cls: "text-rose-600 bg-rose-500/10 border border-rose-500/30" };
    return { label: "Not yet approved", cls: "text-[var(--muted)] bg-[var(--accent-soft)] border border-[var(--border)]" };
  };
  const approvalStateOf = (t: any): "Approved" | "Rejected" | "Pending" => {
    const s = t.approvalStatus || t.approval_status || null;
    return s === "Approved" ? "Approved" : s === "Rejected" ? "Rejected" : "Pending";
  };

  const adminRoleId = roles.find((r) => ["admin", "administrator"].includes(r.name.toLowerCase()))?.id;
  const superAdminRoleId = roles.find((r) => ["superadmin", "super admin", "super-admin", "root"].includes(r.name.toLowerCase()))?.id;
  const isAdmin = !!(
    currentUser?.roleId &&
    ((adminRoleId && String(currentUser.roleId).toLowerCase() === String(adminRoleId).toLowerCase()) ||
      (superAdminRoleId && String(currentUser.roleId).toLowerCase() === String(superAdminRoleId).toLowerCase()))
  );

  const activeCollectionId = searchParams.get("collection");
  const activeCollection = collections.find((c) => String(c.id) === String(activeCollectionId)) || null;

  // Remember the active collection — the AI Assistant scopes itself to it.
  useEffect(() => {
    if (activeCollection) {
      localStorage.setItem(
        "activeCollection",
        JSON.stringify({ id: activeCollection.id, name: activeCollection.name }),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCollection?.id, activeCollection?.name]);

  // Collection scope: when arriving from the Collections page, the whole
  // dashboard (stats + list) reflects only that collection's tickets.
  const scopedTickets = activeCollectionId
    ? tickets.filter((t: any) => String(t.collectionId || "") === String(activeCollectionId))
    : tickets;

  const filteredTickets = scopedTickets.filter((ticket: any) => {
    const statusName = getStatusName(ticket);
    if (filterType === "assigned") {
      const assigneeId = ticket.assignee?.id || ticket.assigneeId || ticket.assignedTo || ticket.assigned_to;
      if (String(assigneeId).toLowerCase() !== String(currentUser?.id).toLowerCase()) return false;
    }
    if (filterType === "reported") {
      const reporterId = ticket.reporter?.id || ticket.reportedBy || ticket.reported_by;
      if (String(reporterId).toLowerCase() !== String(currentUser?.id).toLowerCase()) return false;
    }
    if (filterType === "closed" && statusName !== "Closed" && statusName !== "Resolved") return false;
    if (prioritySort !== "All" && ticket.priority !== prioritySort) return false;
    if (statusSort !== "All" && statusName !== statusSort) return false;
    if (approvalSort !== "All" && approvalStateOf(ticket) !== approvalSort) return false;
    return true;
  });

  const sortedTickets = [...filteredTickets].sort((a: any, b: any) => {
    const aDate = new Date(a.created_at || a.createdAt || 0).getTime();
    const bDate = new Date(b.created_at || b.createdAt || 0).getTime();
    return dateSort === "newest" ? bDate - aDate : aDate - bDate;
  });

  const stats = [
    { label: "Total tickets", value: scopedTickets.length, icon: TicketIcon, color: "var(--accent)" },
    { label: "Open", value: scopedTickets.filter((t) => getStatusName(t) === "Open").length, icon: Inbox, color: "#0ea5e9" },
    { label: "In progress", value: scopedTickets.filter((t) => getStatusName(t) === "In Progress").length, icon: Clock, color: "#f59e0b" },
    { label: "Resolved", value: scopedTickets.filter((t) => ["Resolved", "Closed"].includes(getStatusName(t))).length, icon: CheckCircle, color: "#22c55e" },
  ];

  const tabs = [
    { id: "all", label: "All" },
    { id: "assigned", label: "Assigned to me" },
    { id: "reported", label: "My reports" },
    { id: "closed", label: "Resolved" },
  ];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto" style={{ color: "var(--text)" }}>
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          {activeCollection && (
            <Link
              to="/collections?all=1"
              className="inline-flex items-center gap-1.5 text-xs font-semibold mb-1.5 transition hover:opacity-80"
              style={{ color: "var(--accent)" }}
            >
              <FolderKanban className="h-3.5 w-3.5" /> Collections
            </Link>
          )}
          <h1 className="text-2xl font-bold tracking-tight">{activeCollection ? activeCollection.name : "Tickets"}</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
            {activeCollection
              ? activeCollection.description || "Track, triage, and resolve issues in this collection."
              : "Track, triage, and resolve issues across your organization."}
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="accent-btn inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold"
        >
          <Plus className="h-4 w-4" /> New ticket
        </button>
      </header>

      {/* AI duplicate detection notice (per collection) */}
      {activeCollectionId && dupGroups.length > 0 && !dupDismissed && (
        <div
          className="mb-6 flex flex-col gap-3 rounded-2xl border px-4 py-3.5 sm:flex-row sm:items-center"
          style={{ borderColor: "rgba(245,158,11,0.45)", backgroundColor: "rgba(245,158,11,0.08)" }}
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: "rgba(245,158,11,0.15)", color: "#f59e0b" }}>
            <Sparkles className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold" style={{ color: "var(--text)" }}>
              AI detected {dupGroups.length} potential duplicate {dupGroups.length === 1 ? "group" : "groups"} ({dupTicketTotal} tickets) in this collection
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
              Review them with the AI assistant — confirm and clean up duplicates, or keep them for later.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() =>
                navigate(
                  `/ai?dupCollection=${activeCollectionId}&dupName=${encodeURIComponent(activeCollection?.name || "")}`,
                )
              }
              className="btn btn-primary h-9 px-4 text-xs font-bold"
            >
              <Sparkles className="h-3.5 w-3.5" /> Verify with AI
            </button>
            <button
              onClick={dismissDuplicates}
              className="grid h-9 w-9 place-items-center rounded-lg transition hover:bg-[var(--accent-soft)]"
              style={{ color: "var(--muted)" }}
              title="Dismiss for this session"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-2xl border p-4 flex items-center gap-4" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: `${s.color}1a`, color: s.color }}>
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-2xl font-bold leading-none">{s.value}</p>
                <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>{s.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-6">
        <div className="inline-flex rounded-xl border p-1 overflow-x-auto" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id as any)}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition"
              style={filterType === tab.id ? { backgroundColor: "var(--accent)", color: "#fff" } : { color: "var(--muted)" }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <select value={prioritySort} onChange={(e) => setPrioritySort(e.target.value)} className="app-select rounded-xl px-3 py-2 text-xs font-medium">
            <option value="All">All priorities</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
          <select value={statusSort} onChange={(e) => setStatusSort(e.target.value)} className="app-select rounded-xl px-3 py-2 text-xs font-medium">
            <option value="All">All statuses</option>
            {statuses.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
          </select>
          <select value={approvalSort} onChange={(e) => setApprovalSort(e.target.value as any)} className="app-select rounded-xl px-3 py-2 text-xs font-medium">
            <option value="All">All approvals</option>
            <option value="Approved">Approved</option>
            <option value="Pending">Not yet approved</option>
            <option value="Rejected">Rejected</option>
          </select>
          <select value={dateSort} onChange={(e) => setDateSort(e.target.value as any)} className="app-select rounded-xl px-3 py-2 text-xs font-medium">
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="w-9 h-9 rounded-full animate-spin mb-4" style={{ border: "3px solid var(--accent)", borderTopColor: "transparent" }} />
          <p className="text-xs" style={{ color: "var(--muted)" }}>Loading tickets…</p>
        </div>
      ) : sortedTickets.length === 0 ? (
        <div className="py-24 text-center border border-dashed rounded-2xl" style={{ borderColor: "var(--border)" }}>
          <TicketIcon className="h-8 w-8 mx-auto mb-3 opacity-30" />
          <p className="text-sm" style={{ color: "var(--muted)" }}>No tickets here yet.</p>
          <button onClick={() => setIsModalOpen(true)} className="mt-4 text-sm font-semibold" style={{ color: "var(--accent)" }}>Create your first ticket</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 stagger">
          {sortedTickets.map((t: any) => {
            const ticket = t;
            const statusName = getStatusName(ticket);
            const statusMeta = getStatusMeta(statusName);
            const assigneesArr: any[] = Array.isArray(ticket.assignees) ? ticket.assignees : [];
            const assigneeName = assigneesArr.length
              ? `${assigneesArr[0].name}${assigneesArr.length > 1 ? ` +${assigneesArr.length - 1}` : ""}`
              : getUserName(ticket.assignee || ticket.assigneeId || ticket.assignedTo || ticket.assigned_to);
            const assigneeTitle = assigneesArr.length ? assigneesArr.map((a) => a.name).join(", ") : assigneeName;
            return (
              <div
                key={ticket.id}
                onClick={() => setSelectedTicket(ticket)}
                className="group p-5 rounded-2xl border transition-all flex flex-col cursor-pointer hover:-translate-y-0.5 hover:shadow-lg"
                style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
              >
                <div className="flex justify-between items-center mb-3 gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide ${getPriorityStyle(ticket.priority)}`}>
                      {ticket.priority}
                    </span>
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold whitespace-nowrap ${getApprovalMeta(ticket).cls}`}>
                      {getApprovalMeta(ticket).label}
                    </span>
                  </div>
                  <span className="text-[11px] shrink-0" style={{ color: "var(--muted)" }}>
                    {ticket.created_at || ticket.createdAt ? new Date(ticket.created_at || ticket.createdAt).toLocaleDateString() : ""}
                  </span>
                </div>

                {((!activeCollectionId && ticket.collectionName) || ticket.platformVersion) && (
                  <div className="flex flex-wrap items-center gap-1.5 mb-2 -mt-1">
                    {!activeCollectionId && ticket.collectionName && (
                      <span className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: "var(--accent-soft)", color: "var(--accent)" }}>
                        <FolderKanban className="h-3 w-3" /> {ticket.collectionName}
                      </span>
                    )}
                    {ticket.platformVersion && (
                      <span className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: "var(--accent-soft)", color: "var(--accent)" }} title="Platform / version">
                        <Layers className="h-3 w-3" /> {ticket.platformVersion.platform} · {ticket.platformVersion.version}
                      </span>
                    )}
                  </div>
                )}

                <h3 className="text-base font-semibold mb-1.5 line-clamp-1 transition-colors group-hover:text-[var(--accent)]">{ticket.title}</h3>
                <p className="text-sm leading-relaxed line-clamp-2 mb-4 flex-grow" style={{ color: "var(--muted)" }}>{ticket.description}</p>

                <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: "var(--border)" }}>
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusMeta.cls}`}>
                    {statusMeta.icon}{statusName}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] truncate max-w-[110px]" style={{ color: "var(--muted)" }} title={assigneeTitle}>{assigneeName}</span>
                    {isAdmin && (
                      <>
                        <button
                          onClick={(e) => { e.stopPropagation(); requestDelete(ticket.id); }}
                          title="Delete ticket"
                          className="grid place-items-center h-7 w-7 rounded-lg transition hover:bg-red-500/10"
                          style={{ color: "#ef4444" }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setApprovingTicketId(ticket.id); }}
                          className="inline-flex items-center h-7 px-3 rounded-lg text-[11px] font-semibold transition hover:-translate-y-0.5"
                          style={{ backgroundColor: "var(--accent-soft)", color: "var(--accent)" }}
                        >
                          Review
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CreateTicketModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={fetchData} defaultCollectionId={activeCollectionId || undefined} />

      {selectedTicket && (
        <TicketDetailModal
          isOpen={!!selectedTicket}
          onClose={() => setSelectedTicket(null)}
          ticket={selectedTicket}
          statuses={statuses}
          users={users}
          isAdmin={isAdmin}
          currentUserId={currentUser?.id}
          onApprove={() => setApprovingTicketId(selectedTicket.id)}
          onEdit={() => setIsEditModalOpen(true)}
          onDelete={() => requestDelete(selectedTicket.id)}
        />
      )}

      <ConfirmDialog
        isOpen={!!deletingTicketId}
        title="Delete this ticket?"
        message={
          <>
            This action cannot be undone — the ticket and its review history will be permanently removed.
            {deleteError && (
              <span className="mt-2 block font-semibold text-rose-500">{deleteError}</span>
            )}
          </>
        }
        confirmLabel="Delete ticket"
        variant="danger"
        loading={isDeleting}
        onConfirm={confirmDelete}
        onCancel={() => {
          if (!isDeleting) {
            setDeletingTicketId(null);
            setDeleteError("");
          }
        }}
      />

      {selectedTicket && (
        <EditTicketModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSuccess={fetchData}
          ticket={selectedTicket}
          statuses={statuses}
          users={users}
          roles={roles}
        />
      )}

      {approvingTicketId && (
        <ApprovalModal
          isOpen={!!approvingTicketId}
          onClose={() => setApprovingTicketId(null)}
          ticketId={approvingTicketId}
          onSuccess={fetchData}
        />
      )}
    </div>
  );
};

export default Dashboard;

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { CheckCircle, Clock, Lock, Inbox, Eye, AlertTriangle, Circle, Trash2, Plus, Ticket as TicketIcon } from "lucide-react";
import api from "../services/api";
import type { Ticket, TicketStatus, User, Role } from "../types";
import CreateTicketModal from "../components/CreateTicketModal";
import TicketDetailModal from "../components/TicketDetailModal";
import ApprovalModal from "../components/ApprovalModal";
import EditTicketModal from "../components/EditTicketModal";
import { getLoggedInUser } from "../utils/auth";

const Dashboard = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [statuses, setStatuses] = useState<TicketStatus[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [approvingTicketId, setApprovingTicketId] = useState<string | null>(null);

  const [searchParams, setSearchParams] = useSearchParams();

  const [filterType, setFilterType] = useState<"all" | "assigned" | "reported" | "closed">("all");
  const [prioritySort, setPrioritySort] = useState<string>("All");
  const [statusSort, setStatusSort] = useState<string>("All");
  const [dateSort, setDateSort] = useState<"newest" | "oldest">("newest");

  const currentUser = getLoggedInUser();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [tReq, sReq, uReq, rReq] = await Promise.allSettled([
        api.get("/tickets"),
        api.get("/tickets/statuses"),
        api.get("/users"),
        api.get("/users/roles"),
      ]);
      if (tReq.status === "fulfilled") setTickets(Array.isArray(tReq.value.data) ? tReq.value.data : []);
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

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this ticket? This action cannot be undone.")) return;
    try {
      await api.delete(`/tickets/${id}`);
      setSelectedTicket(null);
      fetchData();
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to delete ticket.");
    }
  };

  useEffect(() => {
    const ticketId = searchParams.get("ticketId");
    if (ticketId && tickets.length > 0) {
      const ticket = tickets.find((t) => String(t.id) === ticketId);
      if (ticket) {
        setSelectedTicket(ticket);
        const newParams = new URLSearchParams(searchParams);
        newParams.delete("ticketId");
        setSearchParams(newParams, { replace: true });
      }
    }
  }, [tickets, searchParams, setSearchParams]);

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

  const adminRoleId = roles.find((r) => ["admin", "administrator"].includes(r.name.toLowerCase()))?.id;
  const superAdminRoleId = roles.find((r) => ["superadmin", "super admin", "super-admin", "root"].includes(r.name.toLowerCase()))?.id;
  const isAdmin = !!(
    currentUser?.roleId &&
    ((adminRoleId && String(currentUser.roleId).toLowerCase() === String(adminRoleId).toLowerCase()) ||
      (superAdminRoleId && String(currentUser.roleId).toLowerCase() === String(superAdminRoleId).toLowerCase()))
  );

  const filteredTickets = tickets.filter((ticket: any) => {
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
    return true;
  });

  const sortedTickets = [...filteredTickets].sort((a: any, b: any) => {
    const aDate = new Date(a.created_at || a.createdAt || 0).getTime();
    const bDate = new Date(b.created_at || b.createdAt || 0).getTime();
    return dateSort === "newest" ? bDate - aDate : aDate - bDate;
  });

  const stats = [
    { label: "Total tickets", value: tickets.length, icon: TicketIcon, color: "var(--accent)" },
    { label: "Open", value: tickets.filter((t) => getStatusName(t) === "Open").length, icon: Inbox, color: "#0ea5e9" },
    { label: "In progress", value: tickets.filter((t) => getStatusName(t) === "In Progress").length, icon: Clock, color: "#f59e0b" },
    { label: "Resolved", value: tickets.filter((t) => ["Resolved", "Closed"].includes(getStatusName(t))).length, icon: CheckCircle, color: "#22c55e" },
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
          <h1 className="text-2xl font-bold tracking-tight">Tickets</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>Track, triage, and resolve issues across your organization.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="accent-btn inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold"
        >
          <Plus className="h-4 w-4" /> New ticket
        </button>
      </header>

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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {sortedTickets.map((t: any) => {
            const ticket = t;
            const statusName = getStatusName(ticket);
            const statusMeta = getStatusMeta(statusName);
            const assigneeName = getUserName(ticket.assignee || ticket.assigneeId || ticket.assignedTo || ticket.assigned_to);
            return (
              <div
                key={ticket.id}
                onClick={() => setSelectedTicket(ticket)}
                className="group p-5 rounded-2xl border transition-all flex flex-col cursor-pointer hover:-translate-y-0.5 hover:shadow-lg"
                style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
              >
                <div className="flex justify-between items-center mb-3">
                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide ${getPriorityStyle(ticket.priority)}`}>
                    {ticket.priority}
                  </span>
                  <span className="text-[11px]" style={{ color: "var(--muted)" }}>
                    {ticket.created_at || ticket.createdAt ? new Date(ticket.created_at || ticket.createdAt).toLocaleDateString() : ""}
                  </span>
                </div>

                <h3 className="text-base font-semibold mb-1.5 line-clamp-1 transition-colors group-hover:text-[var(--accent)]">{ticket.title}</h3>
                <p className="text-sm leading-relaxed line-clamp-2 mb-4 flex-grow" style={{ color: "var(--muted)" }}>{ticket.description}</p>

                <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: "var(--border)" }}>
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusMeta.cls}`}>
                    {statusMeta.icon}{statusName}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px]" style={{ color: "var(--muted)" }}>{assigneeName}</span>
                    {isAdmin && (
                      <>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(ticket.id); }}
                          title="Delete ticket"
                          className="p-1.5 rounded-lg transition hover:bg-red-500/10"
                          style={{ color: "#ef4444" }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setApprovingTicketId(ticket.id); }}
                          className="text-[11px] font-semibold px-3 py-1.5 rounded-lg transition"
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

      <CreateTicketModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={fetchData} />

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
          onDelete={() => handleDelete(selectedTicket.id)}
        />
      )}

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

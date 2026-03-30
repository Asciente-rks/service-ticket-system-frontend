import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
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
  const [approvingTicketId, setApprovingTicketId] = useState<string | null>(
    null,
  );

  const [searchParams, setSearchParams] = useSearchParams();

  const [filterType, setFilterType] = useState<
    "all" | "assigned" | "reported" | "closed"
  >("all");
  const [prioritySort, setPrioritySort] = useState<string>("All");

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
      if (tReq.status === "fulfilled")
        setTickets(Array.isArray(tReq.value.data) ? tReq.value.data : []);
      if (sReq.status === "fulfilled")
        setStatuses(Array.isArray(sReq.value.data) ? sReq.value.data : []);
      if (uReq.status === "fulfilled")
        setUsers(Array.isArray(uReq.value.data) ? uReq.value.data : []);
      if (rReq.status === "fulfilled")
        setRoles(Array.isArray(rReq.value.data) ? rReq.value.data : []);
    } catch (error) {
      console.error("Dashboard sync failed:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
    const match = statuses.find(
      (s) => String(s.id).toLowerCase() === String(statusId).toLowerCase(),
    );
    return match?.name || "Unknown";
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

  const getStatusStyle = (statusName: string) => {
    switch (statusName) {
      case "Open":
        return "border-emerald-500 text-emerald-500 bg-emerald-500/5";
      case "In Progress":
        return "border-amber-500 text-amber-500 bg-amber-500/5";
      case "Resolved":
        return "border-blue-500 text-blue-500 bg-blue-500/5";
      case "Closed":
        return "border-slate-600 text-slate-500 opacity-50";
      default:
        return "border-slate-700 text-slate-400";
    }
  };

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case "High":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      case "Medium":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "Low":
        return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      default:
        return "bg-slate-500/10 text-slate-400 border-slate-700";
    }
  };

  const adminRoleId = roles.find((r) =>
    ["admin", "administrator"].includes(r.name.toLowerCase()),
  )?.id;
  const superAdminRoleId = roles.find((r) =>
    ["superadmin", "super admin", "super-admin", "root"].includes(
      r.name.toLowerCase(),
    ),
  )?.id;

  const isAdmin = !!(
    currentUser?.roleId &&
    ((adminRoleId &&
      String(currentUser.roleId).toLowerCase() ===
        String(adminRoleId).toLowerCase()) ||
      (superAdminRoleId &&
        String(currentUser.roleId).toLowerCase() ===
          String(superAdminRoleId).toLowerCase()))
  );

  const filteredTickets = tickets.filter((ticket: any) => {
    const statusName = getStatusName(ticket);

    if (filterType === "assigned") {
      const assigneeId =
        ticket.assignee?.id ||
        ticket.assigneeId ||
        ticket.assignedTo ||
        ticket.assigned_to;
      if (
        String(assigneeId).toLowerCase() !==
        String(currentUser?.id).toLowerCase()
      )
        return false;
    }
    if (filterType === "reported") {
      const reporterId =
        ticket.reporter?.id || ticket.reportedBy || ticket.reported_by;
      if (
        String(reporterId).toLowerCase() !==
        String(currentUser?.id).toLowerCase()
      )
        return false;
    }
    if (
      filterType === "closed" &&
      statusName !== "Closed" &&
      statusName !== "Resolved"
    )
      return false;

    if (prioritySort !== "All" && ticket.priority !== prioritySort)
      return false;

    return true;
  });

  return (
    <div className="min-h-screen bg-slate-950 p-6 md:p-10 text-white">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
          <div>
            <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400 uppercase tracking-tighter">
              Service Desk
            </h1>
            <p className="text-slate-500 mt-1 font-medium italic font-mono text-sm">
              Active Tickets Syncing with TiDB
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
          >
            + Create Ticket
          </button>
        </header>

        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8 bg-slate-900/30 p-2 rounded-2xl border border-slate-800/50">
          <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-xl">
            {[
              { id: "all", label: "All Tickets" },
              { id: "assigned", label: "Assigned to Me" },
              { id: "reported", label: "My Reports" },
              { id: "closed", label: "Closed" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterType(tab.id as any)}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  filterType === tab.id
                    ? "bg-indigo-600 text-white shadow-lg"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 pr-4">
            <span className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em]">
              Priority:
            </span>
            <select
              value={prioritySort}
              onChange={(e) => setPrioritySort(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-300 outline-none cursor-pointer"
            >
              <option value="All">All Priorities</option>
              <option value="High">High Only</option>
              <option value="Medium">Medium Only</option>
              <option value="Low">Low Only</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-slate-400 font-mono text-xs">
              Synchronizing Statuses...
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTickets.length > 0 ? (
              filteredTickets.map((t: any) => {
                const ticket = t;
                const statusName = getStatusName(ticket);
                const assigneeName = getUserName(
                  ticket.assignee ||
                    ticket.assigneeId ||
                    ticket.assignedTo ||
                    ticket.assigned_to,
                );
                return (
                  <div
                    key={ticket.id}
                    onClick={() => setSelectedTicket(ticket)}
                    className="bg-slate-900/50 backdrop-blur-sm p-6 rounded-3xl border border-slate-800 hover:border-indigo-500/40 transition-all flex flex-col group cursor-pointer shadow-lg hover:shadow-indigo-500/5 relative overflow-hidden"
                  >
                    <div className="flex justify-between items-center mb-4">
                      <span
                        className={`px-2.5 py-1 border rounded-lg text-[10px] font-black uppercase tracking-widest ${getPriorityStyle(ticket.priority)}`}
                      >
                        {ticket.priority}
                      </span>
                      <span className="text-slate-600 text-[10px] font-mono">
                        {ticket.created_at || ticket.createdAt
                          ? new Date(
                              ticket.created_at || ticket.createdAt,
                            ).toLocaleDateString()
                          : "N/A"}
                      </span>
                    </div>

                    <div className="flex-grow">
                      <h3 className="text-xl font-bold text-slate-100 group-hover:text-indigo-400 transition-colors mb-2 line-clamp-1">
                        {ticket.title}
                      </h3>
                      <p className="text-slate-400 text-sm leading-relaxed line-clamp-3 mb-6">
                        {ticket.description}
                      </p>
                    </div>

                    <div className="mb-6">
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">
                        Assignee
                      </p>
                      <p className="text-xs font-bold text-indigo-300">
                        {assigneeName}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-slate-800/50 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${statusName === "Open" ? "bg-emerald-500" : "bg-slate-500"}`}
                        ></div>
                        <span
                          className={`text-[11px] font-black border-b-2 pb-0.5 uppercase tracking-tighter ${getStatusStyle(statusName)}`}
                        >
                          {statusName}
                        </span>
                      </div>
                      {isAdmin && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setApprovingTicketId(ticket.id);
                          }}
                          className="text-[10px] font-black bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-500 transition-all uppercase tracking-widest shadow-lg shadow-indigo-600/20"
                        >
                          Review
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-800 rounded-3xl">
                <p className="text-slate-500 font-mono">
                  No active tickets found in TiDB.
                </p>
              </div>
            )}
          </div>
        )}

        <CreateTicketModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={fetchData}
        />

        {selectedTicket && (
          <TicketDetailModal
            isOpen={!!selectedTicket}
            onClose={() => setSelectedTicket(null)}
            ticket={selectedTicket}
            statuses={statuses}
            users={users}
            isAdmin={isAdmin}
            onApprove={() => setApprovingTicketId(selectedTicket.id)}
            onEdit={() => setIsEditModalOpen(true)}
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
    </div>
  );
};

export default Dashboard;

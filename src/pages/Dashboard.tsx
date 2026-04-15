import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { CheckCircle, Clock, Lock, Inbox, Eye, AlertTriangle, Circle } from "lucide-react";
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
  const [statusSort, setStatusSort] = useState<string>("All");
  const [dateSort, setDateSort] = useState<"newest" | "oldest">("newest");
  const [isPriorityMenuOpen, setIsPriorityMenuOpen] = useState(false);
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
  const priorityRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);

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
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        priorityRef.current &&
        !priorityRef.current.contains(event.target as Node)
      ) {
        setIsPriorityMenuOpen(false);
      }
      if (
        statusRef.current &&
        !statusRef.current.contains(event.target as Node)
      ) {
        setIsStatusMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

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

  const getStatusColor = (statusName: string) => {
    switch (statusName) {
      case "Resolved":
        return "#22c55e";
      case "In Progress":
        return "#f97316";
      case "Open":
        return "#0ea5e9";
      case "Closed":
        return "var(--muted)";
      case "Ready for QA":
        return "#8b5cf6";
      case "Error Persists":
        return "#ef4444";
      default:
        return "var(--text)";
    }
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

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case "High":
        return "border border-red-500 text-red-500 bg-transparent";
      case "Medium":
        return "border border-orange-500 text-orange-500 bg-transparent";
      case "Low":
        return "border border-emerald-500 text-emerald-500 bg-transparent";
      default:
        return "border border-white/10 text-[var(--muted)] bg-transparent";
    }
  };

  const getStatusMeta = (statusName: string) => {
    switch (statusName) {
      case "Resolved":
        return {
          icon: <CheckCircle className="h-4 w-4 text-emerald-500" />,
          style: "border border-emerald-500 text-emerald-500 bg-transparent",
        };
      case "In Progress":
        return {
          icon: <Clock className="h-4 w-4 text-orange-500" />,
          style: "border border-orange-500 text-orange-500 bg-transparent",
        };
      case "Open":
        return {
          icon: <Inbox className="h-4 w-4 text-sky-500" />,
          style: "border border-sky-500 text-sky-500 bg-transparent",
        };
      case "Closed":
        return {
          icon: <Lock className="h-4 w-4 text-[var(--muted)]" />,
          style: "border border-[var(--muted)] text-[var(--muted)] bg-transparent",
        };
      case "Ready for QA":
        return {
          icon: <Eye className="h-4 w-4 text-[#8B5CF6]" />,
          style: "border border-[#8B5CF6] text-[#8B5CF6] bg-transparent",
        };
      case "Error Persists":
        return {
          icon: <AlertTriangle className="h-4 w-4 text-rose-500" />,
          style: "border border-rose-500 text-rose-500 bg-transparent",
        };
      default:
        return {
          icon: <Circle className="h-4 w-4 text-[var(--muted)]" />,
          style: "border border-[var(--muted)] text-[var(--muted)] bg-transparent",
        };
    }
  };

  const selectedStatusMeta =
    statusSort !== "All" ? getStatusMeta(statusSort) : null;

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

    if (statusSort !== "All" && statusName !== statusSort) return false;

    return true;
  });

  const sortedTickets = [...filteredTickets].sort((a: any, b: any) => {
    const aDate = new Date(a.created_at || a.createdAt || a.createdAt || 0).getTime();
    const bDate = new Date(b.created_at || b.createdAt || b.createdAt || 0).getTime();
    return dateSort === "newest" ? bDate - aDate : aDate - bDate;
  });

  return (
    <div className="min-h-screen p-6 md:p-10" style={{ backgroundColor: "var(--bg)", color: "var(--text)" }}>
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
          <div>
            <h1 className="text-4xl font-extrabold uppercase tracking-tighter" style={{ color: "var(--text)" }}>
              Service Desk
            </h1>
            <p className="mt-1 font-medium italic font-mono text-sm" style={{ color: "var(--muted)" }}>
              Active Tickets Syncing with TiDB
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-6 py-3 rounded-xl font-bold transition duration-200 ease-out transform hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/10 active:scale-95"
            style={{
              backgroundColor: "var(--button-bg)",
              color: "var(--button-text)",
              border: "1px solid var(--border)",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.18)",
            }}
          >
            + Create Ticket
          </button>
        </header>

        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8 p-2 rounded-2xl border" style={{ backgroundColor: "rgba(255,255,255,0.03)", borderColor: "var(--border)" }}>
          <div className="flex items-center gap-1 p-1 rounded-xl" style={{ backgroundColor: "rgba(255,255,255,0.02)" }}>
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
                    ? "text-[var(--text)] bg-[rgba(255,255,255,0.08)]"
                    : "text-[var(--muted)] hover:bg-[var(--surface)]"
                }`}
                style={
                  filterType === tab.id
                    ? {
                        border: "1px solid var(--border)",
                      }
                    : undefined
                }
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 pr-4 flex-wrap">
            <span className="text-[9px] font-black uppercase tracking-[0.2em]" style={{ color: "var(--muted)" }}>
              Priority:
            </span>
            <div className="relative" ref={priorityRef}>
              <button
                type="button"
                onClick={() => setIsPriorityMenuOpen((prev) => !prev)}
                className="inline-flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs font-bold uppercase tracking-widest transition"
                style={{
                  backgroundColor: "var(--surface)",
                  color: "var(--text)",
                  borderColor: "var(--border)",
                  minWidth: "10rem",
                }}
              >
                <span>{prioritySort}</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-4 w-4"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.27a.75.75 0 01.02-1.06z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
              {isPriorityMenuOpen && (
                <div
                  className="absolute right-0 z-50 mt-2 w-44 overflow-hidden rounded-2xl border shadow-2xl"
                  style={{
                    backgroundColor: "var(--surface)",
                    borderColor: "var(--border)",
                  }}
                >
                  {[
                    { value: "All", label: "All Priorities" },
                    { value: "High", label: "High Only" },
                    { value: "Medium", label: "Medium Only" },
                    { value: "Low", label: "Low Only" },
                  ].map((option) => {
                    const optionColor =
                      option.value === "High"
                        ? "#ef4444"
                        : option.value === "Medium"
                        ? "#f97316"
                        : option.value === "Low"
                        ? "#22c55e"
                        : "var(--text)";
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setPrioritySort(option.value);
                          setIsPriorityMenuOpen(false);
                        }}
                        className={`w-full text-left px-4 py-3 text-xs uppercase tracking-widest transition dropdown-option ${prioritySort === option.value ? "selected" : ""}`}
                        style={{
                          color: optionColor,
                        }}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <span className="text-[9px] font-black uppercase tracking-[0.2em]" style={{ color: "var(--muted)" }}>
              Status:
            </span>
            <div className="relative" ref={statusRef}>
              <button
                type="button"
                onClick={() => setIsStatusMenuOpen((prev) => !prev)}
                className="inline-flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs font-bold uppercase tracking-widest transition"
                style={{
                  backgroundColor: "var(--surface)",
                  color: "var(--text)",
                  borderColor: "var(--border)",
                  minWidth: "10rem",
                }}
              >
                <span className="inline-flex items-center gap-2">
                  {selectedStatusMeta?.icon}
                  <span>{statusSort}</span>
                </span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-4 w-4"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.27a.75.75 0 01.02-1.06z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
              {isStatusMenuOpen && (
                <div
                  className="absolute right-0 z-50 mt-2 w-44 overflow-hidden rounded-2xl border shadow-2xl"
                  style={{
                    backgroundColor: "var(--surface)",
                    borderColor: "var(--border)",
                  }}
                >
                  {[{ value: "All", label: "All Statuses" }, ...statuses.map((s) => ({ value: s.name, label: s.name }))].map((option) => {
                    const optionColor =
                      option.value === "All"
                        ? "var(--text)"
                        : getStatusColor(option.value);
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setStatusSort(option.value);
                          setIsStatusMenuOpen(false);
                        }}
                        className={`w-full text-left px-4 py-3 text-xs uppercase tracking-widest transition dropdown-option ${statusSort === option.value ? "selected" : ""}`}
                        style={{
                          color: optionColor,
                        }}
                      >
                        <span className="inline-flex items-center gap-2">
                          {option.value !== "All" && getStatusMeta(option.value).icon}
                          <span>{option.label}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black uppercase tracking-[0.2em]" style={{ color: "var(--muted)" }}>
                Sort:
              </span>
              {[
                { value: "newest", label: "Newest" },
                { value: "oldest", label: "Oldest" },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setDateSort(option.value as "newest" | "oldest")}
                  className="rounded-full px-3 py-2 text-[10px] font-black uppercase tracking-widest transition"
                  style={
                    dateSort === option.value
                      ? {
                          backgroundColor: "rgba(255,255,255,0.12)",
                          color: "var(--text)",
                          border: "1px solid var(--border)",
                        }
                      : {
                          backgroundColor: "transparent",
                          color: "var(--muted)",
                          border: "1px solid transparent",
                        }
                  }
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 rounded-full animate-spin mb-4" style={{ border: "4px solid var(--button-text)", borderTopColor: "transparent" }}></div>
            <p className="font-mono text-xs" style={{ color: "var(--muted)" }}>
              Synchronizing Statuses...
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedTickets.length > 0 ? (
              sortedTickets.map((t: any) => {
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
                    className="backdrop-blur-sm p-6 rounded-3xl border transition-all flex flex-col group cursor-pointer shadow-lg relative overflow-hidden"
                    style={{
                      backgroundColor: "var(--surface)",
                      borderColor: "var(--border)",
                      boxShadow: "0 20px 40px rgba(0,0,0,0.18)",
                    }}
                  >
                    <div className="flex justify-between items-center mb-4">
                      <span
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${getPriorityStyle(ticket.priority)}`}
                      >
                        {ticket.priority}
                      </span>
                      <span className="text-[10px] font-mono" style={{ color: "var(--muted)" }}>
                        {ticket.created_at || ticket.createdAt
                          ? new Date(
                              ticket.created_at || ticket.createdAt,
                            ).toLocaleDateString()
                          : "N/A"}
                      </span>
                    </div>

                    <div className="flex-grow">
                      <h3 className="text-xl font-bold transition-colors mb-2 line-clamp-1" style={{ color: "var(--text)" }}>
                        {ticket.title}
                      </h3>
                      <p className="text-sm leading-relaxed line-clamp-3 mb-6" style={{ color: "var(--muted)" }}>
                        {ticket.description}
                      </p>
                    </div>

                    <div className="mb-6">
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] mb-1" style={{ color: "var(--muted)" }}>
                        Assignee
                      </p>
                      <p className="text-xs font-bold" style={{ color: "var(--text)" }}>
                        {assigneeName}
                      </p>
                    </div>

                    <div className="pt-4 border-t flex justify-between items-center" style={{ borderColor: "var(--border)" }}>
                      <div className="flex items-center gap-2">
                        {(() => {
                          const statusMeta = getStatusMeta(statusName);
                          return (
                            <span
                              className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-tighter ${statusMeta.style}`}
                            >
                              {statusMeta.icon}
                              {statusName}
                            </span>
                          );
                        })()}
                      </div>
                      {isAdmin && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setApprovingTicketId(ticket.id);
                          }}
                          className="text-[10px] font-black px-4 py-2 rounded-lg transition duration-200 ease-out transform hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/10 uppercase tracking-widest"
                          style={{
                            backgroundColor: "var(--button-bg)",
                            color: "var(--button-text)",
                            border: "1px solid var(--border)",
                            boxShadow: "0 10px 25px rgba(0,0,0,0.16)",
                          }}
                        >
                          Review
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-full py-20 text-center border-2 border-dashed rounded-3xl" style={{ borderColor: "var(--border)" }}>
                <p className="font-mono" style={{ color: "var(--muted)" }}>
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

import { useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import type { Ticket, TicketStatus, User } from '../types';
import CreateTicketModal from '../components/CreateTicketModal';
import TicketDetailModal from '../components/TicketDetailModal';

const Dashboard = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [statuses, setStatuses] = useState<TicketStatus[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      // Use allSettled so one flaky endpoint doesn't break the whole UI
      const [tReq, sReq, uReq] = await Promise.allSettled([
        api.get('/tickets'), api.get('/tickets/statuses'), api.get('/users')
      ]);
      if (tReq.status === 'fulfilled') setTickets(Array.isArray(tReq.value.data) ? tReq.value.data : []);
      if (sReq.status === 'fulfilled') setStatuses(Array.isArray(sReq.value.data) ? sReq.value.data : []);
      if (uReq.status === 'fulfilled') setUsers(Array.isArray(uReq.value.data) ? uReq.value.data : []);
    } catch (error) {
      console.error("Dashboard sync failed:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Robust lookup: handles nested objects, snake_case, and camelCase
  const getStatusName = (t: any): string => {
    if (typeof t.status === 'string') return t.status;
    if (t.status?.name) return t.status.name;

    const id = t.status_id || t.statusId || t.status?.id;
    if (id) {
      const match = statuses.find(s => String(s.id).toLowerCase() === String(id).toLowerCase());
      if (match) return match.name;
    }
    return 'Unknown';
  };

  const getUserName = (input: any): string => {
    if (!input) return 'Unassigned';
    if (typeof input === 'object' && input.name) return input.name;
    const id = typeof input === 'object' ? input.id : input;
    return users.find(u => String(u.id).toLowerCase() === String(id).toLowerCase())?.name || 'Unknown User';
  };

  const getStatusStyle = (statusName: string) => {
    switch (statusName) {
      case 'Open': return 'border-emerald-500 text-emerald-500 bg-emerald-500/5';
      case 'In Progress': return 'border-amber-500 text-amber-500 bg-amber-500/5';
      case 'Resolved': return 'border-blue-500 text-blue-500 bg-blue-500/5';
      case 'Closed': return 'border-slate-600 text-slate-500 opacity-50';
      default: return 'border-slate-700 text-slate-400';
    }
  };

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'High': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'Medium': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'Low': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-700';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 p-6 md:p-10 text-white">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
          <div>
            <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400 uppercase tracking-tighter">
              Service Desk
            </h1>
            <p className="text-slate-500 mt-1 font-medium italic font-mono text-sm">Active Tickets Syncing with TiDB</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
          >
            + Create Ticket
          </button>
        </header>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-slate-400 font-mono text-xs">Synchronizing Statuses...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tickets.length > 0 ? (
              tickets.map((t: any) => {
                const ticket = t;
                const statusName = getStatusName(ticket);
                const assigneeName = getUserName(ticket.assigned_to || ticket.assignedTo || ticket.assignee);
                return (
                  <div 
                    key={ticket.id} 
                    onClick={() => setSelectedTicket(ticket)}
                    className="bg-slate-900/50 backdrop-blur-sm p-6 rounded-2xl border border-slate-800 hover:border-indigo-500/40 transition-all flex flex-col group cursor-pointer shadow-lg hover:shadow-indigo-500/5"
                  >
                    <div className="flex justify-between items-center mb-4">
                      <span className={`px-2.5 py-1 border rounded-lg text-[10px] font-black uppercase tracking-widest ${getPriorityStyle(ticket.priority)}`}>
                        {ticket.priority}
                      </span>
                      <span className="text-slate-600 text-[10px] font-mono">
                        {ticket.created_at || ticket.createdAt ? new Date(ticket.created_at || ticket.createdAt).toLocaleDateString() : 'N/A'}
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
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Assignee</p>
                      <p className="text-xs font-bold text-indigo-300">
                        {assigneeName}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-slate-800/50 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${statusName === 'Open' ? 'bg-emerald-500' : 'bg-slate-500'}`}></div>
                        <span className={`text-[11px] font-black border-b-2 pb-0.5 uppercase tracking-tighter ${getStatusStyle(statusName)}`}>
                          {statusName}
                        </span>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); /* logic for archive */ }} 
                        className="text-[11px] font-bold text-slate-600 hover:text-red-500 uppercase transition-colors"
                      >
                        Archive
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-800 rounded-3xl">
                <p className="text-slate-500 font-mono">No active tickets found in TiDB.</p>
              </div>
            )}
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
          />
        )}
      </div>
    </div>
  );
};

export default Dashboard;
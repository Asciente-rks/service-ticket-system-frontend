import type { Ticket, TicketStatus, User } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  ticket: any; // Type assertion to bypass incomplete Ticket interface
  statuses: TicketStatus[];
  users: User[];
}

const TicketDetailModal = ({ isOpen, onClose, ticket, statuses, users }: Props) => {
  if (!isOpen) return null;

  const getStatusName = (t: any): string => {
    // 1. Try to find the name directly if it's already a string or nested object
    if (typeof t.status === 'string') return t.status;
    if (t.status?.name) return t.status.name;

    // 2. Try to find an ID and look it up in the statuses array
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

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-3xl p-8 shadow-2xl relative">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded text-[9px] font-black uppercase tracking-widest">
                {ticket.priority}
              </span>
              <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">ID: {ticket.id}</span>
            </div>
            <h2 className="text-3xl font-black text-white uppercase tracking-tighter">{ticket.title}</h2>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>

        {/* Description */}
        <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-6 mb-8">
          <label className="block text-[10px] font-black text-slate-600 uppercase mb-2 tracking-widest">Ticket Description</label>
          <p className="text-slate-300 leading-relaxed text-sm">{ticket.description}</p>
        </div>

        {/* Meta Info Grid */}
        <div className="grid grid-cols-2 gap-8 border-t border-slate-800 pt-8">
          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-black text-slate-600 uppercase mb-1 tracking-widest">Current Status</label>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                <span className="font-bold text-white uppercase tracking-tight text-sm">{getStatusName(ticket)}</span>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-600 uppercase mb-1 tracking-widest">Assignee</label>
              <p className="font-bold text-indigo-400 text-sm">{getUserName(ticket.assigned_to || ticket.assignedTo || ticket.assignee)}</p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-black text-slate-600 uppercase mb-1 tracking-widest">Reporter (Created By)</label>
              <p className="font-bold text-slate-200 text-sm">{getUserName(ticket.reported_by || ticket.reportedBy || ticket.createdBy || ticket.reporter)}</p>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-600 uppercase mb-1 tracking-widest">Created Date</label>
                <p className="text-xs font-mono text-slate-400">
                  {ticket.created_at || ticket.createdAt ? new Date(ticket.created_at || ticket.createdAt).toLocaleString() : 'N/A'}
                </p>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-600 uppercase mb-1 tracking-widest">Last Updated</label>
                <p className="text-xs font-mono text-slate-400">
                  {ticket.updated_at || ticket.updatedAt ? new Date(ticket.updated_at || ticket.updatedAt).toLocaleString() : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 flex justify-end">
          <button onClick={onClose} className="px-10 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition uppercase tracking-widest text-[10px]">
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
};

export default TicketDetailModal;
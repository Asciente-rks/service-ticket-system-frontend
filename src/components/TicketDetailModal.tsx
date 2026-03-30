import type { Ticket, TicketStatus, User } from '../types';

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

const TicketDetailModal = ({ isOpen, onClose, ticket, statuses, users, isAdmin, onApprove, onEdit }: Props) => {
  if (!isOpen) return null;

  const getStatusName = (t: any): string => {
    if (typeof t.status === 'string') return t.status;
    if (t.status?.name) return t.status.name;

    const statusId = t.statusId || t.status_id || t.status?.id;
    if (statusId) {
      const match = statuses.find(s => String(s.id).toLowerCase() === String(statusId).toLowerCase());
      if (match) return match.name;
    }
    return 'Unknown';
  };

  const getUserName = (input: any): string => {
    if (!input) return 'Unassigned';
    
    if (typeof input === 'string' && input.length > 0 && !input.includes('-')) {
      return input;
    }

    if (typeof input === 'object' && input.name) return input.name;
    
    const id = typeof input === 'object' ? input.id : input;
    return users.find(u => String(u.id).toLowerCase() === String(id).toLowerCase())?.name || 'Unknown User';
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-3xl p-8 shadow-2xl relative">
        <div className="flex justify-between items-start mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded text-[9px] font-black uppercase tracking-widest">
                {ticket.priority}
              </span>
            </div>
            <h2 className="text-3xl font-black text-white uppercase tracking-tighter">{ticket.title}</h2>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>

        <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-6 mb-8">
          <label className="block text-[10px] font-black text-slate-600 uppercase mb-2 tracking-widest">Ticket Description</label>
          <p className="text-slate-300 leading-relaxed text-sm">{ticket.description}</p>
        </div>

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
              <p className="font-bold text-indigo-400 text-sm">{getUserName(ticket.assignee || ticket.assigneeId || ticket.assignedTo || ticket.assigned_to)}</p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-black text-slate-600 uppercase mb-1 tracking-widest">Reporter (Created By)</label>
              <p className="font-bold text-slate-200 text-sm">{getUserName(ticket.reporter || ticket.reportedBy || ticket.reported_by)}</p>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-600 uppercase mb-1 tracking-widest">Reviewed By</label>
              <p className="font-bold text-slate-200 text-sm">{getUserName(ticket.reviewedBy || 'Not reviewed')}</p>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-600 uppercase mb-1 tracking-widest">Approval Status</label>
              <span className={`text-[10px] font-black uppercase ${ticket.approvalStatus === 'Approved' ? 'text-emerald-400' : ticket.approvalStatus === 'Rejected' ? 'text-rose-400' : 'text-slate-500'}`}>
                {ticket.approvalStatus || 'Pending'}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-4 mt-4">
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

        <div className="mt-8 bg-slate-950/30 border border-slate-800/50 rounded-2xl p-6">
          <label className="block text-[10px] font-black text-slate-600 uppercase mb-2 tracking-widest">Review Comments</label>
          <p className="text-slate-400 text-sm italic">
            {ticket.comment || "No review comments yet."}
          </p>
        </div>

        <div className="mt-10 flex justify-end gap-3 flex-wrap">
          <button 
            onClick={onEdit}
            className="px-8 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl transition uppercase tracking-widest text-[10px]"
          >
            Edit Ticket
          </button>
          <button onClick={onClose} className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition uppercase tracking-widest text-[10px]">
            Close Details
          </button>
          {isAdmin && (
            <button 
              onClick={() => {
                onClose();
                onApprove?.();
              }} 
              className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition uppercase tracking-widest text-[10px] shadow-lg shadow-indigo-600/20"
            >
              Start Review
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TicketDetailModal;
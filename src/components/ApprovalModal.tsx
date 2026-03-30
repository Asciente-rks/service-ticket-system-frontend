import { useState } from 'react';
import api from '../services/api';
import { getLoggedInUser } from '../utils/auth';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  ticketId: string;
  onSuccess: () => void;
}

const ApprovalModal = ({ isOpen, onClose, ticketId, onSuccess }: Props) => {
  const [status, setStatus] = useState<'Approved' | 'Rejected'>('Approved');
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const currentUser = getLoggedInUser();

    try {
      await api.post(`/tickets/${ticketId}/approval`, {
        status: status,
        comment: comment
      });
      onSuccess();
      onClose();
    } catch (err) {
      console.error("Approval failed:", err);
      alert("Failed to submit approval.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl p-8 shadow-2xl">
        <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-6">Review Ticket</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase mb-3 tracking-widest">Decision</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setStatus('Approved')}
                className={`py-3 rounded-xl font-bold transition-all border ${
                  status === 'Approved' ? 'bg-emerald-500 border-emerald-400 text-white' : 'bg-slate-950 border-slate-800 text-slate-500'
                }`}
              >
                APPROVE
              </button>
              <button
                type="button"
                onClick={() => setStatus('Rejected')}
                className={`py-3 rounded-xl font-bold transition-all border ${
                  status === 'Rejected' ? 'bg-rose-500 border-rose-400 text-white' : 'bg-slate-950 border-slate-800 text-slate-500'
                }`}
              >
                REJECT
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 tracking-widest">Review Comments</label>
            <textarea
              required
              rows={4}
              placeholder="Explain the reason for your decision..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:border-indigo-500 outline-none resize-none transition"
              value={comment}
              onChange={e => setComment(e.target.value)}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 px-6 py-3 border border-slate-800 text-slate-400 font-bold rounded-xl hover:bg-slate-800 transition">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="flex-1 px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-500 shadow-xl shadow-indigo-600/20 transition active:scale-95">
              {isSubmitting ? 'Processing...' : 'Submit Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ApprovalModal;
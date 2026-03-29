import { useState, useEffect } from 'react';
import api from '../services/api';
import type { Ticket, TicketStatus, User, Role } from '../types';
import { getLoggedInUser } from '../utils/auth';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  ticket: Ticket;
  statuses: TicketStatus[];
  users: User[];
  roles: Role[];
}

const EditTicketModal = ({ isOpen, onClose, onSuccess, ticket, statuses, users, roles }: Props) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'Medium',
    statusId: '',
    assigneeId: ''
  });

  const currentUser = getLoggedInUser();

  useEffect(() => {
    if (isOpen && ticket) {
      // Map incoming ticket data to form state, handling various backend naming conventions, without trimming
      setFormData({
        title: ticket.title || '',
        description: ticket.description || '',
        priority: (ticket.priority as any) || 'Medium',
        statusId: String((ticket as any).statusId || (ticket as any).status_id || (ticket as any).status?.id || ''),
        assigneeId: String((ticket as any).assigneeId || (ticket as any).assignedTo || (ticket as any).assigned_to || (ticket as any).assignee?.id || '')
      });
    }
  }, [isOpen, ticket]);

  // 1. Discover the specific UUIDs for each role from the database records
  const superAdminRoleId = roles.find(r => ['superadmin', 'super admin'].includes(r.name.toLowerCase()))?.id;
  const adminRoleId = roles.find(r => ['admin', 'administrator'].includes(r.name.toLowerCase()))?.id;
  const developerRoleId = roles.find(r => ['developer', 'dev', 'devs'].includes(r.name.toLowerCase()))?.id;
  const testerRoleId = roles.find(r => ['tester', 'qa', 'testers'].includes(r.name.toLowerCase()))?.id;
  
  const actorRoleId = currentUser?.roleId ? String(currentUser.roleId).toLowerCase() : '';

  // Identify hierarchy levels based on the roles array
  const isSuperAdmin = !!(superAdminRoleId && actorRoleId === String(superAdminRoleId).toLowerCase());
  const isRegularAdmin = !!(adminRoleId && actorRoleId === String(adminRoleId).toLowerCase());
  const isAdmin = isSuperAdmin || isRegularAdmin;

  const isReporter = !!(currentUser?.id && ticket && (
    String((ticket as any).reportedBy || (ticket as any).reported_by || (ticket as any).reporter?.id).toLowerCase() === String(currentUser.id).toLowerCase()
  ));

  // Only Admins or the original Reporter should edit the core ticket details
  const canEditCoreDetails = isAdmin || isReporter;

  if (!isOpen) return null;

  // Apply the hierarchy logic to the assignment list
  const filteredUsers = users.filter(u => {
    if (!currentUser) return false;

    const targetUserId = String(u.id).toLowerCase();
    const targetUserRoleId = String(u.roleId).toLowerCase();
    const currentUserId = String(currentUser.id).toLowerCase();

    // Normalize actor role for comparison
    const currentRole = roles.find(r => String(r.id).toLowerCase() === actorRoleId)?.name.toLowerCase() || '';

    // 1. SuperAdmin Logic: Can reassign to anyone except themselves
    if (currentRole === 'superadmin' || currentRole === 'super admin') {
      return targetUserId !== currentUserId;
    }

    // 2. Define the "Target Pool" (Anyone who is a Developer or Tester)
    const isTargetDev = developerRoleId && targetUserRoleId === String(developerRoleId).toLowerCase();
    const isTargetTester = testerRoleId && targetUserRoleId === String(testerRoleId).toLowerCase();
    const isTargetInWorkerPool = isTargetDev || isTargetTester;

    // 3. Admin Logic: Can reassign to any Dev or Tester
    if (currentRole === 'admin') {
      return isTargetInWorkerPool;
    }

    // 4. Dev & Tester Logic: Can reassign to fellow Devs or Testers
    if (['developer', 'dev', 'tester', 'qa'].includes(currentRole)) {
      return isTargetInWorkerPool;
    }

    return false;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
        statusId: formData.statusId || null,
        assigneeId: formData.assigneeId || null
      };

      await api.patch(`/tickets/${ticket.id}`, payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("UPDATE TICKET ERROR:", err.response?.data);
      alert(err.response?.data?.message || "Failed to update ticket.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl p-8 shadow-2xl">
        <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-6">Edit Ticket</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 tracking-widest">Title</label>
            <input
              required
              disabled={!canEditCoreDetails}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:border-indigo-500 outline-none transition disabled:opacity-50"
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 tracking-widest">Description</label>
            <textarea
              required
              disabled={!canEditCoreDetails}
              rows={3}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:border-indigo-500 outline-none resize-none transition disabled:opacity-50"
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 tracking-widest">Priority</label>
              <select
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:border-indigo-500 outline-none"
                value={formData.priority}
                onChange={e => setFormData({ ...formData, priority: e.target.value as any })}
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 tracking-widest">Status</label>
              <select
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:border-indigo-500 outline-none"
                value={formData.statusId}
                onChange={e => setFormData({ ...formData, statusId: e.target.value })}
              >
                <option value="" disabled>Select Status</option>
                {statuses.map(s => (
                  <option key={s.id} value={String(s.id)}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 tracking-widest">Reassign To</label>
            <select
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:border-indigo-500 outline-none cursor-pointer"
              value={formData.assigneeId}
              onChange={e => setFormData({ ...formData, assigneeId: e.target.value })}
            >
              {users.length === 0 ? (
                <option value="" disabled>No users available (Check permissions)</option>
              ) : (
                <>
                  <option value="">Unassigned</option>
                  {filteredUsers.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </>
              )}
            </select>
          </div>

          <div className="flex gap-3 mt-8">
            <button type="button" onClick={onClose} className="flex-1 px-6 py-3 border border-slate-800 text-slate-400 font-bold rounded-xl hover:bg-slate-800 transition">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="flex-1 px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-500 transition active:scale-95 disabled:bg-slate-800">
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditTicketModal;
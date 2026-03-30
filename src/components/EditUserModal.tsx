import { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import { getLoggedInUser } from '../utils/auth';
import type { User, Role } from '../types';

interface UserUpdatePayload extends Partial<User> {
  password?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  roles: Role[];
  onSuccess: () => void;
}

const EditUserModal = ({ isOpen, onClose, user, roles, onSuccess }: Props) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    roleId: '',
    password: '' 
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        roleId: String(user.roleId),
        password: '' 
      });
    }
  }, [user]);

  const currentUser = getLoggedInUser();
  const isAdmin = useMemo(() => {
    if (!currentUser || roles.length === 0) return false;
    const userRoleId = String(currentUser.roleId).toLowerCase();
    const adminRoles = roles.filter(r => 
      ['admin', 'administrator', 'superadmin', 'super admin'].includes(r.name.toLowerCase().trim())
    ).map(r => String(r.id).toLowerCase());
    return adminRoles.includes(userRoleId);
  }, [currentUser, roles]);

  if (!isOpen || !isAdmin) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload: UserUpdatePayload = {
        name: formData.name,
        email: formData.email,
        roleId: formData.roleId
      };

      if (formData.password !== '') {
        payload.password = formData.password;
      }

      await api.put(`/users/${user.id}`, payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Update failed:", err.response?.data);
      alert(err.response?.data?.message || "Failed to update user.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-8 shadow-2xl">
        <h2 className="text-2xl font-bold text-white uppercase tracking-tighter mb-6">Edit Account</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Full Name</label>
            <input
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:border-indigo-500 outline-none transition"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Access Role</label>
            <select
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:border-indigo-500 outline-none"
              value={formData.roleId}
              onChange={e => setFormData({...formData, roleId: e.target.value})}
            >
              <option value="" disabled>Select Role</option>
              {roles.map(role => (
                <option key={role.id} value={role.id}>{role.name}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 mt-8">
            <button type="button" onClick={onClose} className="flex-1 px-6 py-3 border border-slate-800 text-slate-400 font-bold rounded-xl">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="flex-1 px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-500">
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditUserModal;
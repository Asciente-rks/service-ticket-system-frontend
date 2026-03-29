import { useState } from 'react';
import api from '../services/api';
import type { Role } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  roles: Role[];
  onSuccess: () => void;
}

const CreateUserModal = ({ isOpen, onClose, roles, onSuccess }: Props) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    roleId: '' // This will now store the UUID string
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 1. UUID Validation: Just check if it's not an empty string
    if (!formData.roleId) {
      alert("Please select a valid role.");
      return;
    }

    setIsSubmitting(true);

    try {
      // 2. Prepare Payload: Keep roleId as a STRING (UUID)
      const payload = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        roleId: formData.roleId // DO NOT use Number() here
      };

      // 3. API Call
      await api.post('/users', payload);
      
      onSuccess();
      onClose();
      // Reset form
      setFormData({ name: '', email: '', password: '', roleId: '' });
    } catch (err: any) {
      console.error("CREATE USER ERROR:", err.response?.data);
      // This will now show the actual Zod/Joi error if the UUID format is wrong
      alert(err.response?.data?.message || "Input validation failed. Check UUID format or password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-8 shadow-2xl">
        <h2 className="text-2xl font-bold text-white mb-6 uppercase tracking-tighter">Add Team Member</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name Field */}
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5">Full Name</label>
            <input
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:border-indigo-500 outline-none transition"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>

          {/* Email Field */}
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5">Email Address</label>
            <input
              required
              type="email"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:border-indigo-500 outline-none transition"
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
            />
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5">Password</label>
            <input
              required
              type="password"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:border-indigo-500 outline-none transition"
              value={formData.password}
              onChange={e => setFormData({...formData, password: e.target.value})}
            />
          </div>

          {/* Role Dropdown (UUIDs) */}
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5">Assigned Role</label>
            <select
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:border-indigo-500 outline-none transition cursor-pointer"
              value={formData.roleId}
              onChange={e => setFormData({...formData, roleId: e.target.value})}
            >
              <option value="">-- Select Role (UUID) --</option>
              {roles.map(role => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 mt-8">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-slate-800 text-slate-400 font-bold rounded-xl hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-500 transition active:scale-95 shadow-lg shadow-indigo-600/20"
            >
              {isSubmitting ? 'Processing...' : 'Confirm User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateUserModal;
import { useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import type { User, Role } from '../types'; 
import CreateUserModal from '../components/CreateUserModal';
import EditUserModal from '../components/EditUserModal';

const UserManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [userRes, roleRes] = await Promise.all([
        api.get('/users'),
        api.get('/users/roles') 
      ]);
      setUsers(Array.isArray(userRes.data) ? userRes.data : []);
      setRoles(Array.isArray(roleRes.data) ? roleRes.data : []);
    } catch (err) {
      console.error("User Management sync failed:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // FIXED: Enforce string comparison for UUIDs
  const getRoleName = (roleId: string | number) => {
    return roles.find(r => String(r.id).toLowerCase() === String(roleId).toLowerCase())?.name || 'Unknown';
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8">
      <div className="flex justify-between items-end mb-10">
        <div>
          <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Team Management</h1>
          <p className="text-slate-500 text-xs font-mono mt-1 flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            TiDB Distributed Session Active
          </p>
        </div>
        <button 
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-500 px-8 py-3 rounded-2xl font-black text-sm transition-all shadow-xl shadow-indigo-600/20 active:scale-95 uppercase tracking-widest"
        >
          + Add Member
        </button>
      </div>

      <div className="bg-slate-900/40 border border-slate-800/60 rounded-3xl overflow-hidden backdrop-blur-xl shadow-2xl">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-800/30 text-slate-500 text-[10px] uppercase tracking-[0.3em] font-black">
            <tr>
              <th className="p-6">Member Profile</th>
              <th className="p-6">System Email</th>
              <th className="p-6">Access Level</th>
              <th className="p-6 text-right">Management</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40">
            {loading ? (
              <tr><td colSpan={4} className="p-32 text-center text-slate-600 font-mono text-xs tracking-widest animate-pulse">Synchronizing cluster data...</td></tr>
            ) : users.map(user => {
              const roleName = getRoleName(user.roleId);
              return (
                <tr key={user.id} className="hover:bg-indigo-500/[0.03] transition-colors group">
                  <td className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 border border-indigo-500/20 flex items-center justify-center font-black text-indigo-400 text-sm shadow-inner">
                        {user.name ? user.name[0].toUpperCase() : '?'}
                      </div>
                      <span className="font-bold text-slate-200 group-hover:text-white transition-colors uppercase tracking-tight">
                        {user.name}
                      </span>
                    </div>
                  </td>
                  <td className="p-6 text-slate-400 font-mono text-sm tracking-tighter">{user.email}</td>
                  <td className="p-6">
                    <span className={`px-3 py-1 rounded-lg border text-[10px] font-black uppercase tracking-widest ${
                      ['superadmin', 'super admin'].includes(roleName.toLowerCase())
                      ? 'border-purple-500/50 text-purple-400 bg-purple-500/5'
                      : roleName.toLowerCase() === 'admin'
                      ? 'border-rose-500/50 text-rose-400 bg-rose-500/5'
                      : 'border-slate-700 text-slate-500 bg-slate-800/50'
                    }`}>
                      {roleName}
                    </span>
                  </td>
                  <td className="p-6 text-right">
                    <button 
                      onClick={() => handleEdit(user)}
                      className="inline-flex items-center gap-3 bg-slate-800/50 hover:bg-indigo-600 hover:text-white text-slate-300 px-5 py-2.5 rounded-xl border border-slate-700/50 transition-all active:scale-95 group/btn"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/>
                      </svg>
                      <span className="text-[10px] font-black uppercase tracking-widest">Edit Account</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <CreateUserModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
        roles={roles} 
        onSuccess={fetchData} 
      />

      {editingUser && (
        <EditUserModal
          isOpen={!!editingUser}
          onClose={() => setEditingUser(null)}
          user={editingUser}
          roles={roles}
          onSuccess={fetchData}
        />
      )}
    </div>
  );
};

export default UserManagement;
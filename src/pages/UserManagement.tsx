import { useEffect, useState, useCallback } from "react";
import api from "../services/api";
import type { User, Role } from "../types";
import CreateUserModal from "../components/CreateUserModal";
import EditUserModal from "../components/EditUserModal";

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
        api.get("/users"),
        api.get("/users/roles"),
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

  const getRoleName = (roleId: string | number) => {
    return (
      roles.find(
        (r) => String(r.id).toLowerCase() === String(roleId).toLowerCase(),
      )?.name || "Unknown"
    );
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8">
      <div className="flex justify-between items-end mb-10">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter" style={{ color: "var(--text)" }}>
            Team Management
          </h1>
          <p className="text-xs font-mono mt-1 flex items-center gap-2" style={{ color: "var(--muted)" }}>
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: "#22c55e" }}></span>
            TiDB Distributed Session Active
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-8 py-3 rounded-3xl font-black text-sm uppercase tracking-widest transition duration-200 ease-out transform hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/10 hover:bg-[var(--card)] active:scale-95"
          style={{
            backgroundColor: "var(--button-bg)",
            color: "var(--button-text)",
            border: "1px solid var(--border)",
            boxShadow: "0 20px 40px rgba(0,0,0,0.12)",
          }}
        >
          + Add Member
        </button>
      </div>

      <div className="rounded-3xl overflow-hidden shadow-2xl" style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
        <table className="w-full text-left border-collapse">
          <thead className="text-[10px] uppercase tracking-[0.3em] font-black" style={{ color: "var(--muted)", backgroundColor: "var(--surface)" }}>
            <tr>
              <th className="p-6">Member Profile</th>
              <th className="p-6">System Email</th>
              <th className="p-6">Access Level</th>
              <th className="p-6 text-right">Management</th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
            {loading ? (
              <tr>
                <td
                  colSpan={4}
                  className="p-32 text-center text-slate-600 font-mono text-xs tracking-widest animate-pulse"
                >
                  Synchronizing cluster data...
                </td>
              </tr>
            ) : (
              users.map((user) => {
                const roleName = getRoleName(user.roleId);
                return (
                  <tr
                    key={user.id}
                    className="transition-colors group"
                    style={{ backgroundColor: "transparent" }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLTableRowElement).style.backgroundColor = "rgba(255,255,255,0.04)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLTableRowElement).style.backgroundColor = "transparent";
                    }}
                  >
                    <td className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl border flex items-center justify-center font-black text-sm shadow-inner"
                          style={{
                            backgroundColor: "var(--surface)",
                            borderColor: "var(--border)",
                            color: "var(--text)",
                          }}
                        >
                          {user.name ? user.name[0].toUpperCase() : "?"}
                        </div>
                        <span className="font-bold transition-colors uppercase tracking-tight"
                          style={{ color: "var(--text)" }}
                        >
                          {user.name}
                        </span>
                      </div>
                    </td>
                    <td className="p-6 font-mono text-sm tracking-tighter" style={{ color: "var(--muted)" }}>
                      {user.email}
                    </td>
                    <td className="p-6">
                      <span
                        className="px-3 py-1 rounded-lg border text-[10px] font-black uppercase tracking-widest"
                        style={{
                          borderColor: "var(--border)",
                          color: "var(--text)",
                          backgroundColor: "var(--surface)",
                        }}
                      >
                        {roleName}
                      </span>
                    </td>
                    <td className="p-6 text-right">
                      <button
                        onClick={() => handleEdit(user)}
                        className="inline-flex items-center gap-3 px-5 py-2.5 rounded-xl border transition duration-200 ease-out transform hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/10 active:scale-95 group/btn"
                        style={{
                          backgroundColor: "var(--button-bg)",
                          color: "var(--button-text)",
                          borderColor: "var(--border)",
                        }}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                          <path d="m15 5 4 4" />
                        </svg>
                        <span className="text-[10px] font-black uppercase tracking-widest">
                          Edit Account
                        </span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
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

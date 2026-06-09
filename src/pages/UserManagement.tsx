import { useEffect, useState, useCallback } from "react";
import { Copy, Check, UserPlus, Pencil, Users } from "lucide-react";
import api from "../services/api";
import type { User, Role, Organization } from "../types";
import CreateUserModal from "../components/CreateUserModal";
import EditUserModal from "../components/EditUserModal";

const roleBadge = (name: string): { bg: string; color: string } => {
  switch (name.toLowerCase()) {
    case "superadmin": return { bg: "rgba(139,92,246,0.14)", color: "#8b5cf6" };
    case "admin": return { bg: "var(--accent-soft)", color: "var(--accent)" };
    case "developer": return { bg: "rgba(14,165,233,0.14)", color: "#0ea5e9" };
    case "tester": return { bg: "rgba(34,197,94,0.14)", color: "#22c55e" };
    default: return { bg: "var(--accent-soft)", color: "var(--muted)" };
  }
};

const UserManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [org, setOrg] = useState<Organization | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [userRes, roleRes, orgRes] = await Promise.allSettled([
        api.get("/users"),
        api.get("/users/roles"),
        api.get("/organizations/me"),
      ]);
      if (userRes.status === "fulfilled") setUsers(Array.isArray(userRes.value.data) ? userRes.value.data : []);
      if (roleRes.status === "fulfilled") setRoles(Array.isArray(roleRes.value.data) ? roleRes.value.data : []);
      if (orgRes.status === "fulfilled") setOrg(orgRes.value.data);
    } catch (err) {
      console.error("Team sync failed:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getRoleName = (roleId: string | number | null) =>
    roles.find((r) => String(r.id).toLowerCase() === String(roleId).toLowerCase())?.name || "Unknown";

  const copyInvite = () => {
    if (!org?.inviteCode) return;
    navigator.clipboard?.writeText(org.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto" style={{ color: "var(--text)" }}>
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Team</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
            Manage members of {org?.name || "your organization"} and their roles.
          </p>
        </div>
        <button onClick={() => setIsCreateModalOpen(true)} className="accent-btn inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold">
          <UserPlus className="h-4 w-4" /> Add member
        </button>
      </header>

      {/* Invite card */}
      {org?.inviteCode && (
        <div className="rounded-2xl border p-5 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: "var(--accent-soft)", color: "var(--accent)" }}>
              <Users className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold">Invite people to {org.name}</p>
              <p className="text-xs" style={{ color: "var(--muted)" }}>Share this code — new members join as Testers; promote them anytime.</p>
            </div>
          </div>
          <button onClick={copyInvite} className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 font-mono text-sm font-semibold transition hover:-translate-y-0.5" style={{ borderColor: "var(--border)", color: "var(--text)", backgroundColor: "var(--bg)" }}>
            {org.inviteCode}
            {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" style={{ color: "var(--muted)" }} />}
          </button>
        </div>
      )}

      <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}>
        <table className="w-full text-left border-collapse">
          <thead className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: "var(--muted)", backgroundColor: "var(--bg)" }}>
            <tr>
              <th className="px-5 py-3.5">Member</th>
              <th className="px-5 py-3.5 hidden sm:table-cell">Email</th>
              <th className="px-5 py-3.5">Role</th>
              <th className="px-5 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
            {loading ? (
              <tr><td colSpan={4} className="px-5 py-20 text-center text-sm" style={{ color: "var(--muted)" }}>Loading team…</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={4} className="px-5 py-20 text-center text-sm" style={{ color: "var(--muted)" }}>No members yet.</td></tr>
            ) : (
              users.map((user) => {
                const roleName = getRoleName(user.roleId);
                const badge = roleBadge(roleName);
                return (
                  <tr key={user.id} className="transition hover:bg-[var(--accent-soft)]">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm" style={{ backgroundColor: "var(--accent)", color: "#fff" }}>
                          {user.name ? user.name[0].toUpperCase() : "?"}
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{user.name}</p>
                          <p className="text-xs sm:hidden" style={{ color: "var(--muted)" }}>{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm hidden sm:table-cell" style={{ color: "var(--muted)" }}>{user.email}</td>
                    <td className="px-5 py-4">
                      <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold" style={{ backgroundColor: badge.bg, color: badge.color }}>{roleName}</span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button onClick={() => setEditingUser(user)} className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border text-xs font-semibold transition hover:-translate-y-0.5" style={{ borderColor: "var(--border)", color: "var(--text)", backgroundColor: "var(--bg)" }}>
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <CreateUserModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} roles={roles} onSuccess={fetchData} />
      {editingUser && (
        <EditUserModal isOpen={!!editingUser} onClose={() => setEditingUser(null)} user={editingUser} roles={roles} onSuccess={fetchData} />
      )}
    </div>
  );
};

export default UserManagement;

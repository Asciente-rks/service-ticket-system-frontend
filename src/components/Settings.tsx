import React, { useState, useEffect, useMemo } from "react";
import {
  Bell,
  ArrowLeft,
  Save,
  ShieldCheck,
  Ticket,
  CheckCircle,
  XCircle,
  Loader2,
  Building2,
  Copy,
  Check,
  RefreshCw,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import ConfirmDialog from "./ConfirmDialog";
import { getLoggedInUser, setToken } from "../utils/auth";
import type { Organization, Role } from "../types";

type Banner = { type: "success" | "error" | ""; text: string };

const Settings = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<Banner>({ type: "", text: "" });

  const [notifications, setNotifications] = useState({
    notifyAssignedTicket: true,
    notifyReportedTicket: true,
    notifyTicketApproved: true,
    notifyTicketRejected: true,
  });

  // Organization management
  const [org, setOrg] = useState<Organization | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [orgName, setOrgName] = useState("");
  const [savingOrg, setSavingOrg] = useState(false);
  const [orgStatus, setOrgStatus] = useState<Banner>({ type: "", text: "" });
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const currentUser = getLoggedInUser();

  const isAdmin = useMemo(() => {
    if (!currentUser || roles.length === 0) return false;
    const userRoleId = String(currentUser.roleId).toLowerCase();
    const adminRoleIds = roles
      .filter((r) => ["admin", "administrator", "superadmin", "super admin"].includes(r.name.toLowerCase().trim()))
      .map((r) => String(r.id).toLowerCase());
    return adminRoleIds.includes(userRoleId);
  }, [currentUser, roles]);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);
        const [settingsRes, orgRes, rolesRes] = await Promise.allSettled([
          api.get("/users/notification-settings"),
          api.get("/organizations/me"),
          api.get("/users/roles"),
        ]);
        if (settingsRes.status === "fulfilled" && settingsRes.value.data) {
          setNotifications(settingsRes.value.data);
        }
        if (orgRes.status === "fulfilled" && orgRes.value.data) {
          setOrg(orgRes.value.data);
          setOrgName(orgRes.value.data.name || "");
        }
        if (rolesRes.status === "fulfilled") {
          setRoles(Array.isArray(rolesRes.value.data) ? rolesRes.value.data : []);
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const handleToggle = (key: keyof typeof notifications) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    setStatus({ type: "", text: "" });
    try {
      await api.patch("/users/notification-settings", notifications);
      setStatus({ type: "success", text: "Notification preferences synced successfully." });
    } catch (err: any) {
      setStatus({ type: "error", text: err.response?.data?.message || "Failed to update settings." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRenameOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setOrgStatus({ type: "", text: "" });
    if (orgName.trim().length < 2) {
      setOrgStatus({ type: "error", text: "Organization name must be at least 2 characters." });
      return;
    }
    setSavingOrg(true);
    try {
      const res = await api.patch("/organizations/me", { name: orgName.trim() });
      setOrg((prev) => (prev ? { ...prev, name: res.data.name } : res.data));
      setOrgStatus({ type: "success", text: "Organization name updated." });
    } catch (err: any) {
      setOrgStatus({ type: "error", text: err.response?.data?.message || "Could not rename organization." });
    } finally {
      setSavingOrg(false);
    }
  };

  const copyInvite = () => {
    if (!org?.inviteCode) return;
    navigator.clipboard?.writeText(org.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const regenerateInvite = async () => {
    setRegenerating(true);
    setOrgStatus({ type: "", text: "" });
    try {
      const res = await api.post("/organizations/me/invite-code");
      setOrg((prev) => (prev ? { ...prev, inviteCode: res.data.inviteCode } : prev));
      setOrgStatus({ type: "success", text: "A new invite code has been generated." });
    } catch (err: any) {
      setOrgStatus({ type: "error", text: err.response?.data?.message || "Could not regenerate invite code." });
    } finally {
      setRegenerating(false);
    }
  };

  const confirmDeleteOrg = async () => {
    setDeleting(true);
    setDeleteError("");
    try {
      const res = await api.delete("/organizations/me");
      if (res.data?.token) setToken(res.data.token);
      // Org is gone — route back into onboarding to create/join another.
      navigate("/onboarding", { replace: true });
    } catch (err: any) {
      setDeleteError(err?.response?.data?.message || "Could not delete organization.");
      setDeleting(false);
    }
  };

  if (loading)
    return (
      <div className="flex flex-col items-center justify-center py-32" style={{ color: "var(--text)" }}>
        <div className="ui-spinner h-10 w-10 mb-4" />
        <p className="font-black uppercase tracking-[0.3em] text-[10px]" style={{ color: "var(--muted)" }}>
          Retrieving Preferences
        </p>
      </div>
    );

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 animate-fade">
      <div className="mb-12">
        <button
          onClick={() => navigate(-1)}
          className="text-[10px] font-black uppercase tracking-[0.2em] mb-4 inline-flex items-center gap-2 transition-colors hover:opacity-80"
          style={{ color: "var(--muted)" }}
        >
          <ArrowLeft size={14} />
          Return
        </button>
        <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter" style={{ color: "var(--text)" }}>
          System <span style={{ color: "var(--muted)" }}>Config</span>
        </h1>
        <p className="text-sm font-medium" style={{ color: "var(--muted)" }}>
          Configure how the ticketing cluster communicates with your account
        </p>
      </div>

      <div className="space-y-10 stagger">
        {/* Notifications */}
        <section className="rounded-[2.5rem] overflow-hidden shadow-2xl" style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="p-8 border-b flex justify-between items-center" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl border flex items-center justify-center" style={{ backgroundColor: "var(--accent-soft)", borderColor: "var(--border)" }}>
                <Bell style={{ color: "var(--accent)" }} size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight" style={{ color: "var(--text)" }}>Notification Channels</h2>
                <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "var(--muted)" }}>Real-time event subscriptions</p>
              </div>
            </div>
          </div>

          <div className="p-8 md:p-10 space-y-8">
            {status.text && <StatusBanner status={status} />}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <SettingCard title="Assignment Alerts" desc="Instant notification when a new ticket is assigned to your queue." icon={<Ticket size={18} />} enabled={notifications.notifyAssignedTicket} onToggle={() => handleToggle("notifyAssignedTicket")} />
              <SettingCard title="Report Updates" desc="Updates regarding tickets you have personally submitted to the system." icon={<ShieldCheck size={18} />} enabled={notifications.notifyReportedTicket} onToggle={() => handleToggle("notifyReportedTicket")} />
              <SettingCard title="Approval Success" desc="Alerts for when your pending tickets are granted 'Approved' status." icon={<CheckCircle size={18} />} enabled={notifications.notifyTicketApproved} onToggle={() => handleToggle("notifyTicketApproved")} />
              <SettingCard title="Rejection Alerts" desc="Notifications for tickets that failed review or were rejected by admins." icon={<XCircle size={18} />} enabled={notifications.notifyTicketRejected} onToggle={() => handleToggle("notifyTicketRejected")} />
            </div>
          </div>

          <div className="p-8 flex justify-end" style={{ borderTop: "1px solid var(--border)" }}>
            <button onClick={handleSave} disabled={isSubmitting} className="btn btn-primary px-10 py-4 text-[10px] uppercase tracking-[0.2em] font-black">
              {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
              {isSubmitting ? "Syncing..." : "Save Configuration"}
            </button>
          </div>
        </section>

        {/* Organization management (admins only) */}
        {isAdmin && org && (
          <section className="rounded-[2.5rem] overflow-hidden shadow-2xl" style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="p-8 border-b flex justify-between items-center" style={{ borderColor: "var(--border)" }}>
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl border flex items-center justify-center" style={{ backgroundColor: "var(--accent-soft)", borderColor: "var(--border)" }}>
                  <Building2 style={{ color: "var(--accent)" }} size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight" style={{ color: "var(--text)" }}>Organization</h2>
                  <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "var(--muted)" }}>
                    {org.memberCount ?? 0} member{(org.memberCount ?? 0) === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-8 md:p-10 space-y-8">
              {orgStatus.text && <StatusBanner status={orgStatus} />}

              {/* Rename */}
              <form onSubmit={handleRenameOrg} className="space-y-3">
                <label className="block text-[10px] font-black uppercase tracking-widest" style={{ color: "var(--muted)" }}>Organization name</label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "var(--muted)" }} />
                    <input className="field pl-10 pr-4 py-3.5 text-sm" value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="Acme Inc." />
                  </div>
                  <button type="submit" disabled={savingOrg || orgName.trim() === org.name} className="btn btn-primary px-6 py-3.5 text-sm font-semibold sm:w-auto">
                    {savingOrg ? <><span className="ui-spinner h-4 w-4" /> Saving…</> : <><Save className="h-4 w-4" /> Save name</>}
                  </button>
                </div>
              </form>

              {/* Invite code */}
              {org.inviteCode && (
                <div className="pt-7 border-t" style={{ borderColor: "var(--border)" }}>
                  <label className="block text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: "var(--muted)" }}>Invite code</label>
                  <div className="flex flex-wrap items-center gap-3">
                    <code className="rounded-xl border px-4 py-3 font-mono text-sm font-semibold" style={{ borderColor: "var(--border)", backgroundColor: "var(--input)", color: "var(--text)" }}>
                      {org.inviteCode}
                    </code>
                    <button onClick={copyInvite} className="btn btn-ghost px-4 py-3 text-sm font-semibold">
                      {copied ? <><Check className="h-4 w-4 text-emerald-500" /> Copied</> : <><Copy className="h-4 w-4" /> Copy</>}
                    </button>
                    <button onClick={regenerateInvite} disabled={regenerating} className="btn btn-ghost px-4 py-3 text-sm font-semibold">
                      <RefreshCw className={`h-4 w-4 ${regenerating ? "animate-spin" : ""}`} /> {regenerating ? "Generating…" : "Regenerate"}
                    </button>
                  </div>
                  <p className="mt-2 text-xs" style={{ color: "var(--muted)" }}>Regenerating invalidates the previous code immediately.</p>
                </div>
              )}

              {/* Danger zone — owner only */}
              {org.isOwner && (
                <div className="pt-7 border-t" style={{ borderColor: "var(--border)" }}>
                  <div
                    className="rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    style={{ border: "1px solid rgba(239,68,68,0.3)", backgroundColor: "rgba(239,68,68,0.06)" }}
                  >
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" style={{ color: "#ef4444" }} />
                      <div>
                        <p className="font-bold text-sm" style={{ color: "var(--text)" }}>Delete organization</p>
                        <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                          Permanently removes all tickets and notifications and detaches every member. This cannot be undone.
                        </p>
                      </div>
                    </div>
                    <button onClick={() => { setDeleteError(""); setConfirmDeleteOpen(true); }} className="btn btn-danger px-5 py-3 text-sm font-semibold shrink-0">
                      <Trash2 className="h-4 w-4" /> Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}
      </div>

      <ConfirmDialog
        isOpen={confirmDeleteOpen}
        title={`Delete ${org?.name || "this organization"}?`}
        message={
          <>
            This permanently deletes all tickets, approvals and notifications, and removes every member's access. Members keep their accounts but will need to create or join a new organization.
            {deleteError && <span className="mt-2 block font-semibold text-rose-500">{deleteError}</span>}
          </>
        }
        confirmLabel="Delete organization"
        variant="danger"
        loading={deleting}
        onConfirm={confirmDeleteOrg}
        onCancel={() => { if (!deleting) { setConfirmDeleteOpen(false); setDeleteError(""); } }}
      />
    </div>
  );
};

const StatusBanner = ({ status }: { status: Banner }) => (
  <div
    className="p-4 rounded-2xl text-[11px] font-bold uppercase tracking-widest flex items-center gap-3 animate-slide-down"
    style={
      status.type === "success"
        ? { backgroundColor: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", color: "#10b981" }
        : { backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#ef4444" }
    }
  >
    <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: status.type === "success" ? "#10b981" : "#ef4444" }} />
    {status.text}
  </div>
);

const SettingCard = ({
  title,
  desc,
  icon,
  enabled,
  onToggle,
}: {
  title: string;
  desc: string;
  icon: React.ReactNode;
  enabled: boolean;
  onToggle: () => void;
}) => (
  <div
    className="p-6 rounded-[2rem] border transition-all flex items-center justify-between gap-4 hover-lift"
    style={{
      backgroundColor: enabled ? "var(--accent-soft)" : "var(--input)",
      borderColor: "var(--border)",
    }}
  >
    <div className="flex items-center gap-4">
      <div
        className="w-12 h-12 rounded-xl shrink-0 grid place-items-center transition-colors"
        style={{
          backgroundColor: enabled ? "var(--accent)" : "var(--surface)",
          color: enabled ? "#fff" : "var(--muted)",
        }}
      >
        {React.cloneElement(icon as React.ReactElement<any>, {
          size: 20,
          color: enabled ? "#fff" : "var(--muted)",
        })}
      </div>
      <div>
        <p className="font-bold mb-0.5" style={{ color: "var(--text)" }}>{title}</p>
        <p className="text-xs leading-relaxed" style={{ color: "var(--muted)" }}>{desc}</p>
      </div>
    </div>
    <Toggle enabled={enabled} onChange={onToggle} />
  </div>
);

const Toggle = ({ enabled, onChange }: { enabled: boolean; onChange: () => void }) => (
  <button
    onClick={onChange}
    className="relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2"
    style={{ backgroundColor: enabled ? "var(--accent)" : "var(--border)", boxShadow: "inset 0 0 0 1px var(--border)" }}
    aria-pressed={enabled}
  >
    <span
      className={`${enabled ? "translate-x-6" : "translate-x-1"} inline-block h-5 w-5 transform rounded-full shadow-xl transition-transform duration-200`}
      style={{ backgroundColor: "#fff" }}
    />
  </button>
);

export default Settings;

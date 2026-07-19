import React, { useState, useEffect, useMemo } from "react";
import {
  Bell, ArrowLeft, Save, ShieldCheck, Ticket, CheckCircle, XCircle, Loader2,
  Building2, Copy, Check, RefreshCw, Trash2, AlertTriangle, User as UserIcon, Mail, KeyRound, Lock,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import ConfirmDialog from "./ConfirmDialog";
import PasswordConfirmModal from "./PasswordConfirmModal";
import ChangePasswordModal from "./ChangePasswordModal";
import { getApiErrorMessage } from "../utils/apiError";
import { setToken } from "../utils/auth";
import type { Organization, Role, User } from "../types";

type Banner = { type: "success" | "error" | ""; text: string };
type Tab = "notifications" | "information" | "organization";

const Settings = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("notifications");

  // Notifications
  const [notifications, setNotifications] = useState({
    notifyAssignedTicket: true,
    notifyReportedTicket: true,
    notifyTicketApproved: true,
    notifyTicketRejected: true,
  });
  const [savingNotif, setSavingNotif] = useState(false);
  const [notifStatus, setNotifStatus] = useState<Banner>({ type: "", text: "" });

  // Information (self profile)
  const [profile, setProfile] = useState<User | null>(null);
  const [infoForm, setInfoForm] = useState({ name: "", email: "" });
  const [infoStatus, setInfoStatus] = useState<Banner>({ type: "", text: "" });
  const [pwModalOpen, setPwModalOpen] = useState(false);
  const [pwModalLoading, setPwModalLoading] = useState(false);
  const [pwModalError, setPwModalError] = useState("");
  const [changePwOpen, setChangePwOpen] = useState(false);

  // Organization
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

  const roleName = useMemo(() => {
    if (!profile || roles.length === 0) return "";
    return roles.find((r) => String(r.id).toLowerCase() === String(profile.roleId).toLowerCase())?.name || "";
  }, [profile, roles]);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);
        const [settingsRes, orgRes, rolesRes, meRes] = await Promise.allSettled([
          api.get("/users/notification-settings"),
          api.get("/organizations/me"),
          api.get("/users/roles"),
          api.get("/users/me"),
        ]);
        if (settingsRes.status === "fulfilled" && settingsRes.value.data) setNotifications(settingsRes.value.data);
        if (orgRes.status === "fulfilled" && orgRes.value.data) {
          setOrg(orgRes.value.data);
          setOrgName(orgRes.value.data.name || "");
        }
        if (rolesRes.status === "fulfilled") setRoles(Array.isArray(rolesRes.value.data) ? rolesRes.value.data : []);
        if (meRes.status === "fulfilled" && meRes.value.data) {
          setProfile(meRes.value.data);
          setInfoForm({ name: meRes.value.data.name || "", email: meRes.value.data.email || "" });
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  // --- Notifications ---
  const handleToggle = (key: keyof typeof notifications) => setNotifications((p) => ({ ...p, [key]: !p[key] }));
  const saveNotifications = async () => {
    setSavingNotif(true);
    setNotifStatus({ type: "", text: "" });
    try {
      await api.patch("/users/notification-settings", notifications);
      setNotifStatus({ type: "success", text: "Notification preferences synced." });
    } catch (err: any) {
      setNotifStatus({ type: "error", text: getApiErrorMessage(err, "Failed to update settings.") });
    } finally {
      setSavingNotif(false);
    }
  };

  // --- Information (password-gated) ---
  const infoDirty = !!profile && (infoForm.name.trim() !== profile.name || infoForm.email.trim().toLowerCase() !== profile.email.toLowerCase());

  const onInfoSave = (e: React.FormEvent) => {
    e.preventDefault();
    setInfoStatus({ type: "", text: "" });
    if (!infoForm.name.trim()) { setInfoStatus({ type: "error", text: "Name cannot be empty." }); return; }
    if (!infoForm.email.trim()) { setInfoStatus({ type: "error", text: "Email cannot be empty." }); return; }
    if (!infoDirty) { setInfoStatus({ type: "error", text: "Nothing to update." }); return; }
    setPwModalError("");
    setPwModalOpen(true);
  };

  const confirmInfoSave = async (currentPassword: string) => {
    setPwModalLoading(true);
    setPwModalError("");
    try {
      const res = await api.patch("/users/me", {
        currentPassword,
        name: infoForm.name.trim(),
        email: infoForm.email.trim(),
      });
      if (res.data?.token) setToken(res.data.token);
      if (res.data?.user) {
        setProfile(res.data.user);
        setInfoForm({ name: res.data.user.name, email: res.data.user.email });
      }
      setPwModalOpen(false);
      setInfoStatus({ type: "success", text: "Your information has been updated." });
    } catch (err: any) {
      setPwModalError(getApiErrorMessage(err, "Could not update your information."));
    } finally {
      setPwModalLoading(false);
    }
  };

  // --- Organization ---
  const isOwner = !!org?.isOwner;

  const handleRenameOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setOrgStatus({ type: "", text: "" });
    if (orgName.trim().length < 2) { setOrgStatus({ type: "error", text: "Organization name must be at least 2 characters." }); return; }
    setSavingOrg(true);
    try {
      const res = await api.patch("/organizations/me", { name: orgName.trim() });
      setOrg((prev) => (prev ? { ...prev, name: res.data.name } : res.data));
      setOrgStatus({ type: "success", text: "Organization name updated." });
    } catch (err: any) {
      setOrgStatus({ type: "error", text: getApiErrorMessage(err, "Could not rename organization.") });
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
      setOrgStatus({ type: "error", text: getApiErrorMessage(err, "Could not regenerate invite code.") });
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
      navigate("/onboarding", { replace: true });
    } catch (err: any) {
      setDeleteError(getApiErrorMessage(err, "Could not delete organization."));
      setDeleting(false);
    }
  };

  if (loading)
    return (
      <div className="flex flex-col items-center justify-center py-32" style={{ color: "var(--text)" }}>
        <div className="ui-spinner h-10 w-10 mb-4" />
        <p className="font-black uppercase tracking-[0.3em] text-[10px]" style={{ color: "var(--muted)" }}>Retrieving Preferences</p>
      </div>
    );

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "notifications", label: "Notifications", icon: <Bell className="h-4 w-4" /> },
    { id: "information", label: "Information", icon: <UserIcon className="h-4 w-4" /> },
    { id: "organization", label: "Organization", icon: <Building2 className="h-4 w-4" /> },
  ];
  const labelCls = "block text-[10px] font-black uppercase tracking-widest mb-2";

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 animate-fade">
      <div className="mb-8">
        <button onClick={() => navigate(-1)} className="text-[10px] font-black uppercase tracking-[0.2em] mb-4 inline-flex items-center gap-2 transition-colors hover:opacity-80" style={{ color: "var(--muted)" }}>
          <ArrowLeft size={14} /> Return
        </button>
        <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter" style={{ color: "var(--text)" }}>
          System <span style={{ color: "var(--muted)" }}>Config</span>
        </h1>
        <p className="text-sm font-medium" style={{ color: "var(--muted)" }}>Manage notifications, your information, and your organization.</p>
      </div>

      {/* Tabs */}
      <div className="inline-flex rounded-2xl border p-1 mb-8 overflow-x-auto" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition"
            style={tab === t.id ? { backgroundColor: "var(--accent)", color: "#fff" } : { color: "var(--muted)" }}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* Notifications tab */}
      {tab === "notifications" && (
        <section className="rounded-[2.5rem] overflow-hidden shadow-2xl animate-fade" style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="p-8 md:p-10 space-y-8">
            {notifStatus.text && <StatusBanner status={notifStatus} />}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <SettingCard title="Assignment Alerts" desc="When a new ticket is assigned to you." icon={<Ticket size={18} />} enabled={notifications.notifyAssignedTicket} onToggle={() => handleToggle("notifyAssignedTicket")} />
              <SettingCard title="Report Updates" desc="Updates on tickets you submitted." icon={<ShieldCheck size={18} />} enabled={notifications.notifyReportedTicket} onToggle={() => handleToggle("notifyReportedTicket")} />
              <SettingCard title="Approval Success" desc="When your tickets are approved." icon={<CheckCircle size={18} />} enabled={notifications.notifyTicketApproved} onToggle={() => handleToggle("notifyTicketApproved")} />
              <SettingCard title="Rejection Alerts" desc="When tickets are rejected." icon={<XCircle size={18} />} enabled={notifications.notifyTicketRejected} onToggle={() => handleToggle("notifyTicketRejected")} />
            </div>
          </div>
          <div className="p-8 flex justify-end" style={{ borderTop: "1px solid var(--border)" }}>
            <button onClick={saveNotifications} disabled={savingNotif} className="btn btn-primary px-10 py-4 text-[10px] uppercase tracking-[0.2em] font-black">
              {savingNotif ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
              {savingNotif ? "Syncing..." : "Save Configuration"}
            </button>
          </div>
        </section>
      )}

      {/* Information tab */}
      {tab === "information" && (
        <div className="space-y-8 animate-fade">
          <section className="rounded-[2.5rem] p-8 md:p-10 shadow-2xl" style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="flex items-center gap-3 mb-7">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: "var(--accent-soft)", color: "var(--accent)" }}><UserIcon className="h-5 w-5" /></span>
              <div>
                <h3 className="text-lg font-bold tracking-tight" style={{ color: "var(--text)" }}>Your information</h3>
                <p className="text-xs" style={{ color: "var(--muted)" }}>Changing your name or email requires your current password.</p>
              </div>
            </div>
            <form onSubmit={onInfoSave} className="space-y-7">
              {infoStatus.text && <StatusBanner status={infoStatus} />}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
                <div>
                  <label className={labelCls} style={{ color: "var(--muted)" }}>Display name</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "var(--muted)" }} />
                    <input className="field pl-10 pr-4 py-3.5 text-sm" value={infoForm.name} onChange={(e) => setInfoForm({ ...infoForm, name: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className={labelCls} style={{ color: "var(--muted)" }}>Email address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "var(--muted)" }} />
                    <input type="email" className="field pl-10 pr-4 py-3.5 text-sm" value={infoForm.email} onChange={(e) => setInfoForm({ ...infoForm, email: e.target.value })} />
                  </div>
                </div>
              </div>
              <button type="submit" disabled={!infoDirty} className="btn btn-primary px-10 py-4 text-[11px] uppercase tracking-[0.2em] font-black">
                <Save className="h-4 w-4" /> Save changes
              </button>
            </form>
          </section>

          <section className="rounded-[2.5rem] p-8 md:p-10 shadow-2xl" style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: "var(--accent-soft)", color: "var(--accent)" }}><KeyRound className="h-5 w-5" /></span>
                <div>
                  <h3 className="text-lg font-bold tracking-tight" style={{ color: "var(--text)" }}>Password</h3>
                  <p className="text-xs" style={{ color: "var(--muted)" }}>Update your password with your current one.</p>
                </div>
              </div>
              <button onClick={() => setChangePwOpen(true)} className="btn btn-ghost px-6 py-3 text-sm font-semibold shrink-0">
                <Lock className="h-4 w-4" /> Change password
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Organization tab */}
      {tab === "organization" && (
        <section className="rounded-[2.5rem] p-8 md:p-10 shadow-2xl animate-fade" style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}>
          {!org ? (
            <p className="text-sm" style={{ color: "var(--muted)" }}>You are not part of an organization.</p>
          ) : (
            <div className="space-y-8">
              <div className="flex items-center gap-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: "var(--accent-soft)", color: "var(--accent)" }}><Building2 className="h-6 w-6" /></span>
                <div>
                  <h3 className="text-xl font-bold tracking-tight" style={{ color: "var(--text)" }}>{org.name}</h3>
                  <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "var(--muted)" }}>
                    {org.memberCount ?? 0} member{(org.memberCount ?? 0) === 1 ? "" : "s"}{isOwner ? " · You own this org" : ""}
                  </p>
                </div>
              </div>

              {orgStatus.text && <StatusBanner status={orgStatus} />}

              {isOwner ? (
                <>
                  <form onSubmit={handleRenameOrg} className="space-y-3 pt-6 border-t" style={{ borderColor: "var(--border)" }}>
                    <label className={labelCls} style={{ color: "var(--muted)" }}>Organization name</label>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="relative flex-1">
                        <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "var(--muted)" }} />
                        <input className="field pl-10 pr-4 py-3.5 text-sm" value={orgName} onChange={(e) => setOrgName(e.target.value)} />
                      </div>
                      <button type="submit" disabled={savingOrg || orgName.trim() === org.name} className="btn btn-primary px-6 py-3.5 text-sm font-semibold">
                        {savingOrg ? <><span className="ui-spinner h-4 w-4" /> Saving…</> : <><Save className="h-4 w-4" /> Save name</>}
                      </button>
                    </div>
                  </form>

                  {org.inviteCode && (
                    <div className="pt-7 border-t" style={{ borderColor: "var(--border)" }}>
                      <label className={labelCls} style={{ color: "var(--muted)" }}>Invite code</label>
                      <div className="flex flex-wrap items-center gap-3">
                        <code className="rounded-xl border px-4 py-3 font-mono text-sm font-semibold" style={{ borderColor: "var(--border)", backgroundColor: "var(--input)", color: "var(--text)" }}>{org.inviteCode}</code>
                        <button onClick={copyInvite} className="btn btn-ghost px-4 py-3 text-sm font-semibold">{copied ? <><Check className="h-4 w-4 text-emerald-500" /> Copied</> : <><Copy className="h-4 w-4" /> Copy</>}</button>
                        <button onClick={regenerateInvite} disabled={regenerating} className="btn btn-ghost px-4 py-3 text-sm font-semibold"><RefreshCw className={`h-4 w-4 ${regenerating ? "animate-spin" : ""}`} /> {regenerating ? "Generating…" : "Regenerate"}</button>
                      </div>
                      <p className="mt-2 text-xs" style={{ color: "var(--muted)" }}>Regenerating invalidates the previous code immediately.</p>
                    </div>
                  )}

                  <div className="pt-7 border-t" style={{ borderColor: "var(--border)" }}>
                    <div className="rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4" style={{ border: "1px solid rgba(239,68,68,0.3)", backgroundColor: "rgba(239,68,68,0.06)" }}>
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" style={{ color: "#ef4444" }} />
                        <div>
                          <p className="font-bold text-sm" style={{ color: "var(--text)" }}>Delete organization</p>
                          <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>Permanently removes all tickets, comments and notifications and detaches every member. Cannot be undone.</p>
                        </div>
                      </div>
                      <button onClick={() => { setDeleteError(""); setConfirmDeleteOpen(true); }} className="btn btn-danger px-5 py-3 text-sm font-semibold shrink-0"><Trash2 className="h-4 w-4" /> Delete</button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="pt-6 border-t grid grid-cols-1 sm:grid-cols-2 gap-6" style={{ borderColor: "var(--border)" }}>
                  <Detail label="Organization" value={org.name} />
                  <Detail label="Members" value={String(org.memberCount ?? 0)} />
                  <Detail label="Your role" value={roleName || "Member"} />
                  {org.inviteCode && <Detail label="Invite code" value={org.inviteCode} mono />}
                  <p className="sm:col-span-2 text-xs" style={{ color: "var(--muted)" }}>Only the organization owner can rename or delete the organization.</p>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      <PasswordConfirmModal
        isOpen={pwModalOpen}
        title="Confirm your changes"
        description="For your security, enter your current password to update your name or email."
        confirmLabel="Save changes"
        loading={pwModalLoading}
        error={pwModalError}
        onConfirm={confirmInfoSave}
        onCancel={() => { if (!pwModalLoading) setPwModalOpen(false); }}
      />

      <ChangePasswordModal isOpen={changePwOpen} onClose={() => setChangePwOpen(false)} onSuccess={() => setInfoStatus({ type: "success", text: "Your password has been changed." })} />

      <ConfirmDialog
        isOpen={confirmDeleteOpen}
        title={`Delete ${org?.name || "this organization"}?`}
        message={<>This permanently deletes all tickets, comments and notifications, and removes every member's access. Members keep their accounts but must create or join a new organization.{deleteError && <span className="mt-2 block font-semibold text-rose-500">{deleteError}</span>}</>}
        confirmLabel="Delete organization"
        variant="danger"
        loading={deleting}
        onConfirm={confirmDeleteOrg}
        onCancel={() => { if (!deleting) { setConfirmDeleteOpen(false); setDeleteError(""); } }}
      />
    </div>
  );
};

const Detail = ({ label, value, mono }: { label: string; value: string; mono?: boolean }) => (
  <div>
    <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: "var(--muted)" }}>{label}</p>
    <p className={`text-sm font-semibold break-all ${mono ? "font-mono" : ""}`} style={{ color: "var(--text)" }}>{value}</p>
  </div>
);

const StatusBanner = ({ status }: { status: Banner }) => (
  <div className="p-4 rounded-2xl text-[11px] font-bold uppercase tracking-widest flex items-center gap-3 animate-slide-down"
    style={status.type === "success" ? { backgroundColor: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", color: "#10b981" } : { backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#ef4444" }}>
    <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: status.type === "success" ? "#10b981" : "#ef4444" }} />
    {status.text}
  </div>
);

const SettingCard = ({ title, desc, icon, enabled, onToggle }: { title: string; desc: string; icon: React.ReactNode; enabled: boolean; onToggle: () => void; }) => (
  <div className="p-6 rounded-[2rem] border transition-all flex items-center justify-between gap-4 hover-lift" style={{ backgroundColor: enabled ? "var(--accent-soft)" : "var(--input)", borderColor: "var(--border)" }}>
    <div className="flex items-center gap-4">
      <div className="w-12 h-12 rounded-xl shrink-0 grid place-items-center transition-colors" style={{ backgroundColor: enabled ? "var(--accent)" : "var(--surface)", color: enabled ? "#fff" : "var(--muted)" }}>
        {React.cloneElement(icon as React.ReactElement<any>, { size: 20, color: enabled ? "#fff" : "var(--muted)" })}
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
  <button onClick={onChange} className="relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2" style={{ backgroundColor: enabled ? "var(--accent)" : "var(--border)", boxShadow: "inset 0 0 0 1px var(--border)" }} aria-pressed={enabled}>
    <span className={`${enabled ? "translate-x-6" : "translate-x-1"} inline-block h-5 w-5 transform rounded-full shadow-xl transition-transform duration-200`} style={{ backgroundColor: "#fff" }} />
  </button>
);

export default Settings;

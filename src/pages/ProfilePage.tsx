import { useState, useEffect, useMemo } from "react";
import { User as UserIcon, Mail, Lock, KeyRound, ShieldCheck, Save, Eye, EyeOff } from "lucide-react";
import api from "../services/api";
import { getLoggedInUser, setToken } from "../utils/auth";
import type { User, Role } from "../types";

type Banner = { type: "success" | "error" | ""; text: string };

const ProfilePage = () => {
  const [userData, setUserData] = useState<User | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  // Profile (name / email) — gated by current password.
  const [profileForm, setProfileForm] = useState({ name: "", email: "", currentPassword: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileStatus, setProfileStatus] = useState<Banner>({ type: "", text: "" });

  // Password change — current + new.
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [savingPw, setSavingPw] = useState(false);
  const [pwStatus, setPwStatus] = useState<Banner>({ type: "", text: "" });
  const [showPw, setShowPw] = useState(false);

  const currentUser = getLoggedInUser();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const [meRes, roleRes] = await Promise.allSettled([
          api.get("/users/me"),
          api.get("/users/roles"),
        ]);

        if (meRes.status === "fulfilled" && meRes.value.data) {
          const u = meRes.value.data as User;
          setUserData(u);
          setProfileForm({ name: u.name || "", email: u.email || "", currentPassword: "" });
        } else if (currentUser) {
          setUserData(currentUser as User);
          setProfileForm({
            name: (currentUser as any).name || "",
            email: (currentUser as any).email || "",
            currentPassword: "",
          });
        }

        if (roleRes.status === "fulfilled") {
          setRoles(Array.isArray(roleRes.value.data) ? roleRes.value.data : []);
        }
      } catch (err) {
        console.error("Profile load failed:", err);
      } finally {
        setLoading(false);
      }
    };

    if (currentUser && currentUser.id !== undefined && currentUser.id !== null) fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const roleName = useMemo(() => {
    if (loading) return "Syncing...";
    if (!userData) return "Standard Member";
    if (roles.length === 0) return "Access Level Verified";
    const roleId = String(userData.roleId).toLowerCase();
    return roles.find((r) => String(r.id).toLowerCase() === roleId)?.name || "Standard Member";
  }, [userData, roles, loading]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileStatus({ type: "", text: "" });

    if (!profileForm.currentPassword) {
      setProfileStatus({ type: "error", text: "Enter your current password to confirm changes." });
      return;
    }

    setSavingProfile(true);
    try {
      const res = await api.patch("/users/me", {
        currentPassword: profileForm.currentPassword,
        name: profileForm.name,
        email: profileForm.email,
      });
      if (res.data?.token) setToken(res.data.token);
      const updated = res.data?.user as User | undefined;
      if (updated) setUserData(updated);
      setProfileForm((prev) => ({ ...prev, currentPassword: "" }));
      setProfileStatus({ type: "success", text: "Your profile has been updated." });
    } catch (err: any) {
      setProfileStatus({
        type: "error",
        text: err.response?.data?.message || "Update failed.",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwStatus({ type: "", text: "" });

    if (pwForm.newPassword.length < 8) {
      setPwStatus({ type: "error", text: "New password must be at least 8 characters." });
      return;
    }
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwStatus({ type: "error", text: "New passwords do not match." });
      return;
    }

    setSavingPw(true);
    try {
      await api.post("/auth/change-password", {
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      });
      setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setPwStatus({ type: "success", text: "Your password has been changed." });
    } catch (err: any) {
      setPwStatus({
        type: "error",
        text: err.response?.data?.message || "Could not change password.",
      });
    } finally {
      setSavingPw(false);
    }
  };

  if (loading)
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <div className="ui-spinner h-10 w-10 mb-4" />
        <p className="font-black uppercase tracking-[0.3em] text-[10px]" style={{ color: "var(--muted)" }}>
          Accessing Secure Data
        </p>
      </div>
    );

  const labelCls = "block text-[10px] font-black uppercase mb-2.5 tracking-widest";

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 animate-fade">
      <div className="mb-10">
        <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter" style={{ color: "var(--text)" }}>
          My Identity
        </h1>
        <p className="text-sm font-medium" style={{ color: "var(--muted)" }}>
          Manage your profile information and authentication credentials
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 stagger">
        {/* Identity card */}
        <div className="lg:col-span-1">
          <div
            className="rounded-[2.5rem] p-8 text-center shadow-2xl relative overflow-hidden"
            style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <div className="relative pt-6">
              <div
                className="w-24 h-24 rounded-3xl mx-auto mb-6 flex items-center justify-center text-4xl font-black shadow-2xl"
                style={{ backgroundColor: "var(--accent-soft)", color: "var(--accent)", border: "1px solid var(--border)" }}
              >
                {(userData?.name || userData?.email || "A")[0].toUpperCase()}
              </div>
              <h2 className="text-2xl font-black tracking-tight leading-none" style={{ color: "var(--text)" }}>
                {userData?.name || "Administrator"}
              </h2>
              <span
                className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest"
                style={{ color: "var(--accent)", border: "1px solid var(--border)", backgroundColor: "var(--accent-soft)" }}
              >
                <ShieldCheck className="h-3 w-3" /> {roleName}
              </span>
            </div>

            <div className="mt-10 pt-8 border-t text-left space-y-6" style={{ borderColor: "var(--border)" }}>
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest mb-1" style={{ color: "var(--muted)" }}>System Email</p>
                <p className="text-sm font-mono tracking-tighter break-all" style={{ color: "var(--text)", opacity: 0.85 }}>{userData?.email}</p>
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest mb-1" style={{ color: "var(--muted)" }}>Account UUID</p>
                <p className="text-[9px] font-mono break-all opacity-50" style={{ color: "var(--muted)" }}>{userData?.id}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Forms */}
        <div className="lg:col-span-2 space-y-8">
          {/* Profile info */}
          <div className="rounded-[2.5rem] p-8 md:p-10 shadow-2xl" style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="flex items-center gap-3 mb-7">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: "var(--accent-soft)", color: "var(--accent)" }}>
                <UserIcon className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-lg font-bold tracking-tight" style={{ color: "var(--text)" }}>Profile information</h3>
                <p className="text-xs" style={{ color: "var(--muted)" }}>Changing your name or email requires your current password.</p>
              </div>
            </div>

            <form onSubmit={handleProfileSubmit} className="space-y-7">
              {profileStatus.text && <StatusBanner status={profileStatus} />}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
                <div>
                  <label className={labelCls} style={{ color: "var(--muted)" }}>Display Name</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "var(--muted)" }} />
                    <input
                      required
                      className="field pl-10 pr-4 py-3.5 text-sm"
                      value={profileForm.name}
                      onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelCls} style={{ color: "var(--muted)" }}>Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "var(--muted)" }} />
                    <input
                      required
                      type="email"
                      className="field pl-10 pr-4 py-3.5 text-sm"
                      value={profileForm.email}
                      onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-7 border-t" style={{ borderColor: "var(--border)" }}>
                <label className={labelCls} style={{ color: "var(--muted)" }}>Current Password</label>
                <div className="relative md:max-w-sm">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "var(--muted)" }} />
                  <input
                    type="password"
                    placeholder="Confirm with your password"
                    className="field pl-10 pr-4 py-3.5 text-sm"
                    value={profileForm.currentPassword}
                    onChange={(e) => setProfileForm({ ...profileForm, currentPassword: e.target.value })}
                  />
                </div>
              </div>

              <button type="submit" disabled={savingProfile} className="btn btn-primary px-10 py-4 text-[11px] uppercase tracking-[0.2em] font-black">
                {savingProfile ? (<><span className="ui-spinner h-4 w-4" /> Saving…</>) : (<><Save className="h-4 w-4" /> Save profile</>)}
              </button>
            </form>
          </div>

          {/* Change password */}
          <div className="rounded-[2.5rem] p-8 md:p-10 shadow-2xl" style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="flex items-center gap-3 mb-7">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: "var(--accent-soft)", color: "var(--accent)" }}>
                <KeyRound className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-lg font-bold tracking-tight" style={{ color: "var(--text)" }}>Change password</h3>
                <p className="text-xs" style={{ color: "var(--muted)" }}>Enter your current password, then choose a new one.</p>
              </div>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-7">
              {pwStatus.text && <StatusBanner status={pwStatus} />}

              <div>
                <label className={labelCls} style={{ color: "var(--muted)" }}>Current Password</label>
                <div className="relative md:max-w-sm">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "var(--muted)" }} />
                  <input
                    type={showPw ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    className="field pl-10 pr-4 py-3.5 text-sm"
                    value={pwForm.currentPassword}
                    onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
                <div>
                  <label className={labelCls} style={{ color: "var(--muted)" }}>New Password</label>
                  <div className="relative">
                    <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "var(--muted)" }} />
                    <input
                      type={showPw ? "text" : "password"}
                      required
                      placeholder="At least 8 characters"
                      className="field pl-10 pr-11 py-3.5 text-sm"
                      value={pwForm.newPassword}
                      onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md transition"
                      style={{ color: "var(--muted)" }}
                      aria-label={showPw ? "Hide password" : "Show password"}
                    >
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className={labelCls} style={{ color: "var(--muted)" }}>Confirm New Password</label>
                  <div className="relative">
                    <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "var(--muted)" }} />
                    <input
                      type={showPw ? "text" : "password"}
                      required
                      placeholder="Re-enter new password"
                      className="field pl-10 pr-4 py-3.5 text-sm"
                      value={pwForm.confirmPassword}
                      onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <button type="submit" disabled={savingPw} className="btn btn-primary px-10 py-4 text-[11px] uppercase tracking-[0.2em] font-black">
                {savingPw ? (<><span className="ui-spinner h-4 w-4" /> Updating…</>) : (<><KeyRound className="h-4 w-4" /> Update password</>)}
              </button>
            </form>
          </div>
        </div>
      </div>
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

export default ProfilePage;

import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { User as UserIcon, Mail, ShieldCheck, Building2, CalendarDays, Hash, Settings as SettingsIcon } from "lucide-react";
import api from "../services/api";
import { getLoggedInUser } from "../utils/auth";
import type { User, Role, Organization } from "../types";

interface ProfileData extends User {
  createdAt?: string | null;
}

const ProfilePage = () => {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [org, setOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  const currentUser = getLoggedInUser();

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [meRes, rolesRes, orgRes] = await Promise.allSettled([
          api.get("/users/me"),
          api.get("/users/roles"),
          api.get("/organizations/me"),
        ]);
        if (meRes.status === "fulfilled" && meRes.value.data) setProfile(meRes.value.data);
        else if (currentUser) setProfile(currentUser as ProfileData);
        if (rolesRes.status === "fulfilled") setRoles(Array.isArray(rolesRes.value.data) ? rolesRes.value.data : []);
        if (orgRes.status === "fulfilled" && orgRes.value.data) setOrg(orgRes.value.data);
      } catch (err) {
        console.error("Profile load failed:", err);
      } finally {
        setLoading(false);
      }
    };
    if (currentUser) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const roleName = useMemo(() => {
    if (!profile || roles.length === 0) return "Member";
    return roles.find((r) => String(r.id).toLowerCase() === String(profile.roleId).toLowerCase())?.name || "Member";
  }, [profile, roles]);

  const createdLabel = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })
    : "—";

  if (loading)
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <div className="ui-spinner h-10 w-10 mb-4" />
        <p className="font-black uppercase tracking-[0.3em] text-[10px]" style={{ color: "var(--muted)" }}>Accessing Secure Data</p>
      </div>
    );

  const details = [
    { label: "Full name", value: profile?.name || "—", icon: <UserIcon className="h-4 w-4" /> },
    { label: "Email address", value: profile?.email || "—", icon: <Mail className="h-4 w-4" /> },
    { label: "Role", value: roleName, icon: <ShieldCheck className="h-4 w-4" /> },
    { label: "Organization", value: org?.name || "—", icon: <Building2 className="h-4 w-4" /> },
    { label: "Member since", value: createdLabel, icon: <CalendarDays className="h-4 w-4" /> },
    { label: "Account ID", value: profile?.id || "—", icon: <Hash className="h-4 w-4" />, mono: true },
  ];

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 animate-fade">
      <div className="mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter" style={{ color: "var(--text)" }}>My Profile</h1>
          <p className="text-sm font-medium" style={{ color: "var(--muted)" }}>A read-only overview of your account.</p>
        </div>
        <Link to="/settings" className="btn btn-ghost px-5 py-3 text-sm font-semibold shrink-0">
          <SettingsIcon className="h-4 w-4" /> Edit in settings
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 stagger">
        {/* Identity card */}
        <div className="lg:col-span-1">
          <div className="rounded-[2.5rem] p-8 text-center shadow-2xl" style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="w-24 h-24 rounded-3xl mx-auto mb-6 flex items-center justify-center text-4xl font-black shadow-2xl" style={{ backgroundColor: "var(--accent-soft)", color: "var(--accent)", border: "1px solid var(--border)" }}>
              {(profile?.name || profile?.email || "A")[0].toUpperCase()}
            </div>
            <h2 className="text-2xl font-black tracking-tight leading-none" style={{ color: "var(--text)" }}>{profile?.name || "User"}</h2>
            <span className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest" style={{ color: "var(--accent)", border: "1px solid var(--border)", backgroundColor: "var(--accent-soft)" }}>
              <ShieldCheck className="h-3 w-3" /> {roleName}
            </span>
            <p className="mt-6 text-xs" style={{ color: "var(--muted)" }}>Member since {createdLabel}</p>
          </div>
        </div>

        {/* Details */}
        <div className="lg:col-span-2">
          <div className="rounded-[2.5rem] p-8 md:p-10 shadow-2xl" style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}>
            <h3 className="text-lg font-bold tracking-tight mb-6" style={{ color: "var(--text)" }}>Account details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-7">
              {details.map((d) => (
                <div key={d.label}>
                  <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest mb-1.5" style={{ color: "var(--muted)" }}>
                    {d.icon} {d.label}
                  </p>
                  <p className={`text-sm font-semibold break-all ${d.mono ? "font-mono text-xs opacity-70" : ""}`} style={{ color: "var(--text)" }}>{d.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;

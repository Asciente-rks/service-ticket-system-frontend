import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Users, ArrowRight, Plus } from "lucide-react";
import api from "../services/api";
import AuthShell from "../components/AuthShell";
import { setToken, getLoggedInUser, logout } from "../utils/auth";

type Mode = "choose" | "create" | "join";

const Onboarding = () => {
  const [mode, setMode] = useState<Mode>("choose");
  const [orgName, setOrgName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const user = getLoggedInUser();

  const finish = (token: string) => {
    setToken(token);
    navigate("/dashboard", { replace: true });
  };

  const createOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const res = await api.post("/organizations", { name: orgName });
      finish(res.data.token);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Couldn't create organization.");
    } finally { setLoading(false); }
  };

  const joinOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const res = await api.post("/organizations/join", { inviteCode: inviteCode.trim() });
      finish(res.data.token);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Couldn't join organization.");
    } finally { setLoading(false); }
  };

  return (
    <AuthShell
      title={`Welcome${user?.email ? `, ${user.email.split("@")[0]}` : ""}`}
      subtitle="Set up your workspace. Create a new organization or join one with an invite code."
    >
      {error && (
        <div className="mb-4 rounded-xl border px-4 py-3 text-sm" style={{ borderColor: "#f87171", backgroundColor: "rgba(248,113,113,0.1)", color: "#ef4444" }}>
          {error}
        </div>
      )}

      {mode === "choose" && (
        <div className="space-y-3">
          <button onClick={() => { setMode("create"); setError(""); }} className="w-full text-left rounded-2xl border p-5 transition hover:-translate-y-0.5 hover:shadow-lg flex items-start gap-4" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: "var(--accent-soft)", color: "var(--accent)" }}>
              <Plus className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-sm font-semibold">Create an organization</span>
              <span className="block text-xs mt-0.5" style={{ color: "var(--muted)" }}>Start fresh — you'll be the owner (SuperAdmin) and can invite your team.</span>
            </span>
          </button>

          <button onClick={() => { setMode("join"); setError(""); }} className="w-full text-left rounded-2xl border p-5 transition hover:-translate-y-0.5 hover:shadow-lg flex items-start gap-4" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: "var(--accent-soft)", color: "var(--accent)" }}>
              <Users className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-sm font-semibold">Join an organization</span>
              <span className="block text-xs mt-0.5" style={{ color: "var(--muted)" }}>Have an invite code from your team? Enter it to join their workspace.</span>
            </span>
          </button>
        </div>
      )}

      {mode === "create" && (
        <form onSubmit={createOrg} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Organization name</label>
            <div className="relative">
              <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "var(--muted)" }} />
              <input type="text" required autoFocus placeholder="Acme Inc."
                className="auth-field w-full rounded-xl pl-10 pr-4 py-2.5 text-sm"
                value={orgName} onChange={(e) => setOrgName(e.target.value)} disabled={loading} />
            </div>
          </div>
          <button type="submit" disabled={loading} className="accent-btn w-full rounded-xl px-5 py-2.5 text-sm font-semibold flex items-center justify-center gap-2">
            {loading ? "Creating…" : (<>Create organization <ArrowRight className="h-4 w-4" /></>)}
          </button>
          <button type="button" onClick={() => { setMode("choose"); setError(""); }} className="w-full text-xs font-medium" style={{ color: "var(--muted)" }}>Back</button>
        </form>
      )}

      {mode === "join" && (
        <form onSubmit={joinOrg} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Invite code</label>
            <div className="relative">
              <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "var(--muted)" }} />
              <input type="text" required autoFocus placeholder="ORG-XXXXXX"
                className="auth-field w-full rounded-xl pl-10 pr-4 py-2.5 text-sm font-mono uppercase"
                value={inviteCode} onChange={(e) => setInviteCode(e.target.value.toUpperCase())} disabled={loading} />
            </div>
            <p className="mt-1.5 text-xs" style={{ color: "var(--muted)" }}>You'll join as a Tester; an admin can change your role later.</p>
          </div>
          <button type="submit" disabled={loading} className="accent-btn w-full rounded-xl px-5 py-2.5 text-sm font-semibold flex items-center justify-center gap-2">
            {loading ? "Joining…" : (<>Join organization <ArrowRight className="h-4 w-4" /></>)}
          </button>
          <button type="button" onClick={() => { setMode("choose"); setError(""); }} className="w-full text-xs font-medium" style={{ color: "var(--muted)" }}>Back</button>
        </form>
      )}

      <p className="mt-6 text-sm text-center" style={{ color: "var(--muted)" }}>
        <button onClick={logout} className="font-semibold" style={{ color: "var(--accent)" }}>Sign out</button>
      </p>
    </AuthShell>
  );
};

export default Onboarding;

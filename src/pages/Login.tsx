import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, ArrowRight } from "lucide-react";
import api from "../services/api";
import AuthShell from "../components/AuthShell";
import { setToken, getLoggedInUser } from "../utils/auth";

const DEMO_ACCOUNTS = [
  { label: "Admin", email: "admin@test.com" },
  { label: "Developer", email: "developer@test.com" },
  { label: "Tester", email: "tester@test.com" },
];
const DEMO_PASSWORD = "Password123!";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showDemo, setShowDemo] = useState(false);
  const navigate = useNavigate();

  const performLogin = async (candidateEmail: string, candidatePassword: string) => {
    setLoading(true);
    setError("");
    try {
      const response = await api.post("/auth/login", {
        email: candidateEmail,
        password: candidatePassword,
      });
      setToken(response.data.token);
      const user = getLoggedInUser();
      navigate(user?.organizationId ? "/dashboard" : "/onboarding", { replace: true });
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 429) setError("Too many login attempts. Please wait a moment.");
      else if (status === 401) setError("Invalid email or password.");
      else if (!status) setError("Couldn't reach the server. Please try again in a moment.");
      else setError(err?.response?.data?.message || "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await performLogin(email, password);
  };

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to your workspace to continue.">
      {error && (
        <div className="mb-5 rounded-xl border px-4 py-3 text-sm" style={{ borderColor: "#f87171", backgroundColor: "rgba(248,113,113,0.1)", color: "#ef4444" }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">Email</label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "var(--muted)" }} />
            <input
              type="email"
              required
              autoComplete="email"
              placeholder="you@company.com"
              className="auth-field w-full rounded-xl pl-10 pr-4 py-2.5 text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Password</label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "var(--muted)" }} />
            <input
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="auth-field w-full rounded-xl pl-10 pr-4 py-2.5 text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>
        </div>

        <button type="submit" disabled={loading} className="accent-btn w-full rounded-xl px-5 py-2.5 text-sm font-semibold flex items-center justify-center gap-2">
          {loading ? "Signing in…" : (<>Sign in <ArrowRight className="h-4 w-4" /></>)}
        </button>
      </form>

      <p className="mt-6 text-sm text-center" style={{ color: "var(--muted)" }}>
        Don't have an account?{" "}
        <Link to="/register" className="font-semibold" style={{ color: "var(--accent)" }}>
          Create one
        </Link>
      </p>

      <div className="mt-8 pt-6 border-t" style={{ borderColor: "var(--border)" }}>
        <button type="button" onClick={() => setShowDemo((v) => !v)} className="text-xs font-medium" style={{ color: "var(--muted)" }}>
          {showDemo ? "Hide" : "Try a"} demo account
        </button>
        {showDemo && (
          <div className="mt-3 grid grid-cols-3 gap-2">
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.email}
                type="button"
                disabled={loading}
                onClick={() => performLogin(acc.email, DEMO_PASSWORD)}
                className="rounded-lg border px-3 py-2 text-xs font-semibold transition hover:-translate-y-0.5 disabled:opacity-50"
                style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)", color: "var(--text)" }}
              >
                {acc.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </AuthShell>
  );
};

export default Login;

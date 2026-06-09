import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, KeyRound, Lock, User, ArrowRight, ArrowLeft, Check } from "lucide-react";
import api from "../services/api";
import AuthShell from "../components/AuthShell";
import { setToken } from "../utils/auth";

type Step = "email" | "otp" | "password";

const Register = () => {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [registrationToken, setRegistrationToken] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const navigate = useNavigate();

  const submitEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(""); setInfo(""); setDevOtp(null);
    try {
      const res = await api.post("/auth/register", { email });
      if (res.data?.devOtp) {
        setDevOtp(res.data.devOtp);
        setInfo("Email isn't configured on the server, so here's your code for testing.");
      } else {
        setInfo("We sent a 6-digit code to your email.");
      }
      setStep("otp");
    } catch (err: any) {
      setError(err?.response?.data?.message || "Couldn't start registration.");
    } finally { setLoading(false); }
  };

  const submitOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const res = await api.post("/auth/verify-otp", { email, code: code.trim() });
      setRegistrationToken(res.data.registrationToken);
      setStep("password");
    } catch (err: any) {
      setError(err?.response?.data?.message || "Invalid or expired code.");
    } finally { setLoading(false); }
  };

  const resendCode = async () => {
    setLoading(true); setError(""); setInfo(""); setDevOtp(null);
    try {
      const res = await api.post("/auth/register", { email });
      if (res.data?.devOtp) setDevOtp(res.data.devOtp);
      setInfo("A new code has been sent.");
    } catch (err: any) {
      setError(err?.response?.data?.message || "Couldn't resend code.");
    } finally { setLoading(false); }
  };

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords don't match."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setLoading(true); setError("");
    try {
      const res = await api.post("/auth/set-password", { registrationToken, name, password });
      setToken(res.data.token);
      navigate("/onboarding", { replace: true });
    } catch (err: any) {
      setError(err?.response?.data?.message || "Couldn't create your account.");
    } finally { setLoading(false); }
  };

  const steps: Step[] = ["email", "otp", "password"];
  const stepIndex = steps.indexOf(step);

  return (
    <AuthShell
      title="Create your account"
      subtitle="Start in seconds — verify your email, set a password, then set up your organization."
    >
      {/* Stepper */}
      <div className="flex items-center gap-2 mb-6">
        {["Email", "Verify", "Password"].map((label, i) => (
          <div key={label} className="flex items-center gap-2 flex-1">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold shrink-0"
              style={
                i < stepIndex
                  ? { backgroundColor: "var(--accent)", color: "#fff" }
                  : i === stepIndex
                  ? { border: "2px solid var(--accent)", color: "var(--accent)" }
                  : { border: "1px solid var(--border)", color: "var(--muted)" }
              }
            >
              {i < stepIndex ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </div>
            <span className="text-xs font-medium hidden sm:block" style={{ color: i <= stepIndex ? "var(--text)" : "var(--muted)" }}>{label}</span>
            {i < 2 && <div className="h-px flex-1" style={{ backgroundColor: "var(--border)" }} />}
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-xl border px-4 py-3 text-sm" style={{ borderColor: "#f87171", backgroundColor: "rgba(248,113,113,0.1)", color: "#ef4444" }}>
          {error}
        </div>
      )}
      {info && !error && (
        <div className="mb-4 rounded-xl border px-4 py-3 text-sm" style={{ borderColor: "var(--accent)", backgroundColor: "var(--accent-soft)", color: "var(--text)" }}>
          {info}
          {devOtp && (
            <div className="mt-2 font-mono text-lg font-bold tracking-[0.3em]" style={{ color: "var(--accent)" }}>{devOtp}</div>
          )}
        </div>
      )}

      {step === "email" && (
        <form onSubmit={submitEmail} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Work email</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "var(--muted)" }} />
              <input type="email" required autoFocus placeholder="you@company.com"
                className="auth-field w-full rounded-xl pl-10 pr-4 py-2.5 text-sm"
                value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} />
            </div>
          </div>
          <button type="submit" disabled={loading} className="accent-btn w-full rounded-xl px-5 py-2.5 text-sm font-semibold flex items-center justify-center gap-2">
            {loading ? "Sending code…" : (<>Continue <ArrowRight className="h-4 w-4" /></>)}
          </button>
        </form>
      )}

      {step === "otp" && (
        <form onSubmit={submitOtp} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Verification code</label>
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "var(--muted)" }} />
              <input inputMode="numeric" maxLength={6} required autoFocus placeholder="123456"
                className="auth-field w-full rounded-xl pl-10 pr-4 py-2.5 text-sm tracking-[0.4em] font-mono"
                value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} disabled={loading} />
            </div>
            <p className="mt-1.5 text-xs" style={{ color: "var(--muted)" }}>
              Sent to {email}. <button type="button" onClick={resendCode} className="font-semibold" style={{ color: "var(--accent)" }}>Resend</button>
            </p>
          </div>
          <button type="submit" disabled={loading || code.length !== 6} className="accent-btn w-full rounded-xl px-5 py-2.5 text-sm font-semibold flex items-center justify-center gap-2">
            {loading ? "Verifying…" : (<>Verify <ArrowRight className="h-4 w-4" /></>)}
          </button>
          <button type="button" onClick={() => { setStep("email"); setError(""); setInfo(""); }} className="w-full text-xs font-medium flex items-center justify-center gap-1.5" style={{ color: "var(--muted)" }}>
            <ArrowLeft className="h-3.5 w-3.5" /> Use a different email
          </button>
        </form>
      )}

      {step === "password" && (
        <form onSubmit={submitPassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Full name</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "var(--muted)" }} />
              <input type="text" required autoFocus placeholder="Jane Doe"
                className="auth-field w-full rounded-xl pl-10 pr-4 py-2.5 text-sm"
                value={name} onChange={(e) => setName(e.target.value)} disabled={loading} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "var(--muted)" }} />
              <input type="password" required placeholder="At least 8 characters"
                className="auth-field w-full rounded-xl pl-10 pr-4 py-2.5 text-sm"
                value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Confirm password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "var(--muted)" }} />
              <input type="password" required placeholder="Re-enter password"
                className="auth-field w-full rounded-xl pl-10 pr-4 py-2.5 text-sm"
                value={confirm} onChange={(e) => setConfirm(e.target.value)} disabled={loading} />
            </div>
          </div>
          <button type="submit" disabled={loading} className="accent-btn w-full rounded-xl px-5 py-2.5 text-sm font-semibold flex items-center justify-center gap-2">
            {loading ? "Creating account…" : (<>Create account <ArrowRight className="h-4 w-4" /></>)}
          </button>
        </form>
      )}

      <p className="mt-6 text-sm text-center" style={{ color: "var(--muted)" }}>
        Already have an account?{" "}
        <Link to="/login" className="font-semibold" style={{ color: "var(--accent)" }}>Sign in</Link>
      </p>
    </AuthShell>
  );
};

export default Register;

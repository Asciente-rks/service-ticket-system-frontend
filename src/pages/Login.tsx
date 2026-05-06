import React, { useEffect, useRef, useState } from "react";
import api from "../services/api";
import { Moon, Sun, Settings as SettingsIcon, X, Info } from "lucide-react";
import LogoLight from "../assets/Logo.png";
import LogoNoNameDark from "../assets/LogoNoNameDark.png";
import { useTheme } from "../theme";

interface DevAccount {
  label: string;
  email: string;
  password: string;
}

const DEV_ACCOUNTS: DevAccount[] = [
  { label: "Admin", email: "admin@test.com", password: "Password123!" },
  { label: "Developer", email: "developer@test.com", password: "Password123!" },
  { label: "Tester", email: "tester@test.com", password: "Password123!" },
];

const WAKEUP_HINT_DELAY_MS = 4000;

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [devOpen, setDevOpen] = useState(false);
  const [showWakeupHint, setShowWakeupHint] = useState(false);
  const wakeupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { theme, toggleTheme } = useTheme();

  const clearWakeupTimer = () => {
    if (wakeupTimerRef.current) {
      clearTimeout(wakeupTimerRef.current);
      wakeupTimerRef.current = null;
    }
  };

  useEffect(() => clearWakeupTimer, []);

  const performLogin = async (
    candidateEmail: string,
    candidatePassword: string,
  ) => {
    setLoading(true);
    setError("");
    setShowWakeupHint(false);
    clearWakeupTimer();
    wakeupTimerRef.current = setTimeout(() => {
      setShowWakeupHint(true);
    }, WAKEUP_HINT_DELAY_MS);

    try {
      const response = await api.post("/auth/login", {
        email: candidateEmail,
        password: candidatePassword,
      });

      localStorage.setItem("token", response.data.token);
      window.location.href = "/dashboard";
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 429) {
        setError("Too many login attempts. Please wait a moment.");
      } else if (status === 401) {
        setError("Invalid email or password.");
      } else if (!status) {
        setError(
          "Couldn't reach the backend. It may still be waking up — give it ~60 seconds and try again.",
        );
      } else {
        setError(
          err?.response?.data?.message || "Something went wrong. Try again.",
        );
      }
    } finally {
      clearWakeupTimer();
      setLoading(false);
      setShowWakeupHint(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await performLogin(email, password);
  };

  const handleDevPick = (account: DevAccount) => {
    setEmail(account.email);
    setPassword(account.password);
    setDevOpen(false);
    void performLogin(account.email, account.password);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6 py-8"
      style={{ backgroundColor: "var(--bg)", color: "var(--text)" }}
    >
      <div className="absolute top-5 right-5 flex w-24 flex-col items-center gap-3 text-center">
        <span className="text-xs uppercase tracking-[0.3em] text-[var(--text)]/80">
          {theme} mode
        </span>
        <button
          type="button"
          onClick={toggleTheme}
          className="rounded-full border p-3 transition flex items-center justify-center"
          style={{
            borderColor: theme === "dark" ? "#ffffff" : "#000000",
            backgroundColor: theme === "dark" ? "#ffffff" : "#000000",
            color: theme === "dark" ? "#000000" : "#ffffff",
          }}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>

      <div
        className="w-full max-w-md rounded-[28px] p-8"
        style={{
          backgroundColor: theme === "dark" ? "#000000" : "#ffffff",
          border: theme === "dark" ? "1px solid #ffffff" : "1px solid #000000",
          boxShadow: theme === "dark" ? "0 30px 80px rgba(255,255,255,0.06)" : "0 30px 80px rgba(0,0,0,0.06)",
        }}
      >
        <div className="flex flex-col items-center gap-4 mb-6">
          <img
            src={theme === "dark" ? LogoNoNameDark : LogoLight}
            alt="Logo"
            className={`h-20 w-20 mono-logo ${theme === "dark" ? "mono-logo-dark" : "mono-logo-light"}`}
          />
          <h2
            className="text-center text-3xl font-bold"
            style={{ color: "var(--text)" }}
          >
            Service Ticket Login
          </h2>
        </div>

        {error && (
          <div
            className="mb-4 rounded-2xl border p-3 text-sm font-medium"
            style={{
              borderColor: "#f87171",
              backgroundColor: "rgba(248,113,113,0.1)",
              color: "#b91c1c",
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Email Address"
            className="w-full rounded-xl border p-3 outline-none transition"
            style={{
              borderColor: theme === "dark" ? "#ffffff" : "#000000",
              backgroundColor: theme === "dark" ? "#0c1726" : "#f8fafc",
              color: theme === "dark" ? "#f8fafc" : "#020617",
              caretColor: theme === "dark" ? "#f8fafc" : "#020617",
            }}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full rounded-xl border p-3 outline-none transition"
            style={{
              borderColor: theme === "dark" ? "#ffffff" : "#000000",
              backgroundColor: theme === "dark" ? "#0c1726" : "#f8fafc",
              color: theme === "dark" ? "#f8fafc" : "#020617",
              caretColor: theme === "dark" ? "#f8fafc" : "#020617",
            }}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl border px-5 py-3 text-sm font-semibold transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-white/10"
            style={{
              borderColor: theme === "dark" ? "#ffffff" : "#000000",
              backgroundColor: theme === "dark" ? "#0b1220" : "#000000",
              color: "#ffffff",
            }}
          >
            {loading
              ? showWakeupHint
                ? "Waking the backend..."
                : "Authenticating..."
              : "Sign In"}
          </button>

          {loading && showWakeupHint && (
            <div
              className="rounded-xl border px-3 py-2.5 text-xs font-medium flex items-start gap-2"
              style={{
                borderColor:
                  theme === "dark"
                    ? "rgba(250, 204, 21, 0.55)"
                    : "rgba(202, 138, 4, 0.55)",
                backgroundColor:
                  theme === "dark"
                    ? "rgba(250, 204, 21, 0.08)"
                    : "rgba(202, 138, 4, 0.08)",
                color: theme === "dark" ? "#facc15" : "#854d0e",
              }}
            >
              <span aria-hidden="true">⏳</span>
              <span>
                The backend is on Render's free tier — first request can take
                up to <strong>60 seconds</strong> to wake from sleep. Hang on,
                we'll get you in.
              </span>
            </div>
          )}
        </form>

        <div
          className="mt-5 flex items-start gap-2 rounded-xl border px-3 py-2.5 text-[11px]"
          style={{
            borderColor:
              theme === "dark"
                ? "rgba(255, 255, 255, 0.18)"
                : "rgba(0, 0, 0, 0.12)",
            backgroundColor:
              theme === "dark"
                ? "rgba(255, 255, 255, 0.04)"
                : "rgba(0, 0, 0, 0.03)",
            color: theme === "dark" ? "#cbd5e1" : "#475569",
          }}
          role="note"
        >
          <Info
            className="h-3.5 w-3.5 shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <span>
            Free-tier hosting heads-up: if the backend has been idle, the
            first sign-in may take up to <strong>~60 seconds</strong> while
            Render wakes the service. Subsequent requests are instant.
          </span>
        </div>

      </div>

      <button
        type="button"
        onClick={() => setDevOpen((value) => !value)}
        className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] shadow-lg transition hover:-translate-y-0.5"
        style={{
          backgroundColor: theme === "dark" ? "#0b1220" : "#ffffff",
          borderColor: theme === "dark" ? "#ffffff" : "#000000",
          color: theme === "dark" ? "#ffffff" : "#000000",
        }}
        title="Dev Tools"
        aria-label="Dev Tools"
      >
        <SettingsIcon className="h-4 w-4" />
        Dev Tools
      </button>

      {devOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setDevOpen(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Dev Tools"
            className="fixed bottom-24 right-6 z-50 w-80 rounded-2xl border p-5 shadow-2xl"
            style={{
              backgroundColor: theme === "dark" ? "#000000" : "#ffffff",
              borderColor: theme === "dark" ? "#ffffff" : "#000000",
              color: theme === "dark" ? "#ffffff" : "#000000",
            }}
          >
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-[0.25em]">
                Dev Tools
              </h3>
              <span
                className="rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.3em]"
                style={{
                  borderColor: theme === "dark" ? "#ffffff" : "#000000",
                }}
              >
                demo
              </span>
            </div>
            <p
              className="mb-4 text-xs"
              style={{ color: theme === "dark" ? "#9ca3af" : "#4b5563" }}
            >
              Quick-login as a seeded account so portfolio reviewers don't
              have to type anything.
            </p>
            <div className="flex flex-col gap-2">
              {DEV_ACCOUNTS.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  disabled={loading}
                  onClick={() => handleDevPick(account)}
                  className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                  style={{
                    borderColor: theme === "dark" ? "#374151" : "#d1d5db",
                    backgroundColor: theme === "dark" ? "#0c1726" : "#f8fafc",
                    color: theme === "dark" ? "#f8fafc" : "#020617",
                  }}
                >
                  <span className="text-xs font-black uppercase tracking-[0.18em]">
                    {account.label}
                  </span>
                  <code className="text-[10px] font-mono">
                    {account.email}
                  </code>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setDevOpen(false)}
              className="absolute top-3 right-3 rounded-full p-1 transition hover:opacity-70"
              aria-label="Close Dev Tools"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default Login;

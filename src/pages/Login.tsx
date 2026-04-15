import React, { useState } from "react";
import api from "../services/api";
import { Moon, Sun } from "lucide-react";
import LogoLight from "../assets/Logo.png";
import LogoNoNameDark from "../assets/LogoNoNameDark.png";
import { useTheme } from "../theme";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { theme, toggleTheme } = useTheme();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await api.post("/auth/login", { email, password });

      localStorage.setItem("token", response.data.token);
      window.location.href = "/dashboard";
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Something went wrong. Try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-8" style={{ backgroundColor: "var(--bg)", color: "var(--text)" }}>
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
          <h2 className="text-center text-3xl font-bold" style={{ color: "var(--text)" }}>
            Service Ticket Login
          </h2>
        </div>

        {error && (
          <div className="mb-4 rounded-2xl border p-3 text-sm font-medium" style={{ borderColor: "#f87171", backgroundColor: "rgba(248,113,113,0.1)", color: "#b91c1c" }}>
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
            {loading ? "Authenticating..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;

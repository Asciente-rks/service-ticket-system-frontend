import { Moon, Sun, ShieldCheck, Bell, GitBranch, Building2 } from "lucide-react";
import { useTheme } from "../theme";
import Logo from "../assets/Logo.png";
import LogoNoNameDark from "../assets/LogoNoNameDark.png";

interface Props {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

const FEATURES = [
  { icon: Building2, title: "Multi-tenant workspaces", desc: "Every organization gets its own isolated tickets, members, and notifications." },
  { icon: ShieldCheck, title: "Role-based access", desc: "SuperAdmin, Admin, Developer, and Tester — enforced on every request." },
  { icon: GitBranch, title: "Real approval workflow", desc: "Six-stage lifecycle with per-ticket approve / reject decisions." },
  { icon: Bell, title: "Smart notifications", desc: "Assignment, status, and approval alerts tuned to each member's preferences." },
];

const AuthShell = ({ title, subtitle, children }: Props) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen w-full flex" style={{ backgroundColor: "var(--bg)", color: "var(--text)" }}>
      {/* Brand panel */}
      <aside className="hidden lg:flex lg:w-[46%] xl:w-[42%] flex-col justify-between p-12 auth-gradient border-r" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-3">
          <img src={theme === "dark" ? LogoNoNameDark : Logo} alt="Logo" className="h-11 w-auto object-contain" />
          <span className="text-lg font-semibold tracking-tight">Service Ticket System</span>
        </div>

        <div className="max-w-md">
          <h1 className="text-4xl font-bold leading-tight tracking-tight mb-3">
            Ship fixes faster with a workflow your whole team trusts.
          </h1>
          <p className="text-sm leading-relaxed mb-10" style={{ color: "var(--muted)" }}>
            A multi-tenant ticketing and bug-tracking platform — organized by organization, secured by role, and built for real QA-to-dev handoffs.
          </p>

          <ul className="space-y-5">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <li key={f.title} className="flex items-start gap-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: "var(--accent-soft)", color: "var(--accent)" }}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{f.title}</p>
                    <p className="text-xs leading-relaxed" style={{ color: "var(--muted)" }}>{f.desc}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <p className="text-xs" style={{ color: "var(--muted)" }}>
          &copy; {new Date().getFullYear()} Service Ticket System
        </p>
      </aside>

      {/* Form panel */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-10 relative">
        <button
          type="button"
          onClick={toggleTheme}
          className="absolute top-6 right-6 rounded-full border p-2.5 transition"
          style={{ borderColor: "var(--border)", color: "var(--text)", backgroundColor: "var(--surface)" }}
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <img src={theme === "dark" ? LogoNoNameDark : Logo} alt="Logo" className="h-10 w-auto object-contain" />
            <span className="text-base font-semibold tracking-tight">Service Ticket System</span>
          </div>

          <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
          {subtitle && (
            <p className="mt-1.5 text-sm" style={{ color: "var(--muted)" }}>{subtitle}</p>
          )}

          <div className="mt-8">{children}</div>
        </div>
      </main>
    </div>
  );
};

export default AuthShell;

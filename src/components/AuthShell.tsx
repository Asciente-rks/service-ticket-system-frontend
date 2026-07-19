import { Moon, Sun } from "lucide-react";
import { useTheme } from "../theme";
import Logo from "../assets/NexusTrack_Logo_Light.png";
import LogoNoNameDark from "../assets/NexusTrack_Logo_Dark.png";

interface Props {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

const AuthShell = ({ title, subtitle, children }: Props) => {
  const { theme, toggleTheme } = useTheme();
  const logoSrc = theme === "dark" ? LogoNoNameDark : Logo;

  return (
    <div className="min-h-screen w-full flex" style={{ backgroundColor: "var(--bg)", color: "var(--text)" }}>
      {/* Form panel — LEFT */}
      <main className="order-2 lg:order-1 flex-1 flex flex-col items-center justify-center px-6 py-10 relative">
        <button
          type="button"
          onClick={toggleTheme}
          className="absolute top-6 left-6 rounded-full border p-2.5 transition hover:-translate-y-0.5"
          style={{ borderColor: "var(--border)", color: "var(--text)", backgroundColor: "var(--surface)" }}
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        <div className="w-full max-w-md animate-fade">
          {/* Mobile logo (brand panel is hidden on small screens) */}
          <div className="lg:hidden mb-8 flex justify-center">
            <span className="brand-logo brand-logo--mobile">
              <img src={logoSrc} alt="NexusTrack" />
            </span>
          </div>

          <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
          {subtitle && <p className="mt-1.5 text-sm" style={{ color: "var(--muted)" }}>{subtitle}</p>}

          <div className="mt-8">{children}</div>
        </div>
      </main>

      {/* Brand panel — RIGHT, logo is the spotlight */}
      <aside
        className="order-1 lg:order-2 hidden lg:flex lg:w-[46%] xl:w-[42%] flex-col items-center justify-center px-12 auth-gradient border-l relative overflow-hidden"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="relative z-10 flex flex-col items-center text-center max-w-md">
          <span className="brand-logo brand-logo--hero mb-10">
            <img src={logoSrc} alt="NexusTrack" />
          </span>
          <h1 className="text-3xl xl:text-4xl font-bold leading-tight tracking-tight mb-4">
            Ship fixes faster with a workflow your whole team trusts.
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
            NexusTrack keeps every bug, hand-off, and approval moving in one place — so nothing slips between QA and dev.
          </p>
        </div>
        <p className="absolute bottom-8 text-xs" style={{ color: "var(--muted)" }}>
          &copy; {new Date().getFullYear()} Nexus Track
        </p>
      </aside>
    </div>
  );
};

export default AuthShell;

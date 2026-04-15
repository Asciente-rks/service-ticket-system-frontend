import { useState, useEffect, useMemo, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Moon, Sun, Home, Users } from "lucide-react";
import { getLoggedInUser } from "../utils/auth";
import api from "../services/api";
import type { User, Role } from "../types";
import { useTheme } from "../theme";
import Logo from "../assets/Logo.png";
import LogoNoNameDark from "../assets/LogoNoNameDark.png";

const Layout = ({ children }: { children: React.ReactNode }) => {
  const { theme, toggleTheme } = useTheme();
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const profileRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target as Node)
      ) {
        setIsNotificationsOpen(false);
      }
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target as Node)
      ) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const currentUser = getLoggedInUser();
    setUser(currentUser);

    const fetchRoles = async () => {
      try {
        const res = await api.get("/users/roles");
        setRoles(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        setRoles([]);
        console.error("Layout Role Fetch Failed:", err);
      }
    };
    fetchRoles();

    const fetchUsers = async () => {
      try {
        const res = await api.get("/users");
        const usersList = Array.isArray(res.data) ? res.data : [];
        setUsers(usersList);

        if (
          currentUser &&
          !usersList.find(
            (u) =>
              String(u.id).toLowerCase() ===
              String(currentUser.id).toLowerCase(),
          )
        ) {
          try {
            const singleRes = await api.get(`/users/${currentUser.id}`);
            if (singleRes.data) {
              setUsers((prev) => [...prev, singleRes.data]);
            }
          } catch (e) {
            console.warn("Header identity fetch failed");
          }
        }
      } catch (err) {
        setUsers([]);
        console.error(
          "Layout User Fetch Failed (consider /users/me endpoint):",
          err,
        );
      }
    };
    fetchUsers();

    const fetchNotifications = async () => {
      try {
        const res = await api.get("/notifications?limit=5");
        setNotifications(
          Array.isArray(res.data) ? res.data : res.data.notifications || [],
        );
      } catch (err) {
        console.error("Notification Fetch Failed:", err);
      }
    };

    if (currentUser) fetchNotifications();
  }, []);

  const currentUserDetails = useMemo(() => {
    if (!user) return null;
    const userId = String(user.id).toLowerCase();
    const userEmail = String((user as any).email || "").toLowerCase();

    const found = users.find(
      (u) =>
        String(u.id).toLowerCase() === userId ||
        (userEmail && String(u.email || "").toLowerCase() === userEmail),
    );

    if (found) return found;

    const emailPrefix = userEmail
      ? userEmail.split("@")[0].replace(/[._]/g, " ")
      : "Administrator";

    return {
      ...user,
      name:
        (user as any).name && String((user as any).name).length > 0
          ? (user as any).name
          : emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1),
    } as User;
  }, [user, users]);

  const isAdmin = useMemo(() => {
    if (!user || roles.length === 0) return false;
    const userRoleId = String(user.roleId).toLowerCase();
    const adminRoles = roles
      .filter((r) =>
        ["admin", "administrator", "superadmin", "super admin"].includes(
          r.name.toLowerCase(),
        ),
      )
      .map((r) => String(r.id).toLowerCase());

    return adminRoles.includes(userRoleId);
  }, [user, roles]);

  const handleNotificationClick = async (notification: any) => {
    setIsNotificationsOpen(false);

    if (notification.ticketId) {
      navigate(`/dashboard?ticketId=${notification.ticketId}`);
    }
  };

  const menuItems = useMemo(() => {
    const items = [
      { name: "Dashboard", path: "/dashboard", icon: Home },
    ];
    if (isAdmin) {
      items.push({ name: "User Management", path: "/users", icon: Users });
    }
    return items;
  }, [isAdmin]);

  return (
    <div className="min-h-screen flex app-shell protected-shell">
      <aside
        className={`app-aside border-r transition-all duration-300 flex flex-col ${isCollapsed ? "w-24" : "w-72"}`}
        style={{ borderRight: theme === "dark" ? "1px solid #ffffff" : undefined }}
      >
        <div className="p-6 flex items-center justify-between">
          {!isCollapsed && (
            <h2 className="text-xl font-bold text-[var(--text)]">TICKETING</h2>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-lg text-[var(--text)] mx-auto hover:bg-[var(--surface)] transition"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>

        <nav className="flex-1 px-3 pt-4 space-y-2 flex flex-col">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center ${isCollapsed ? "justify-center" : "justify-start"} px-4 py-3 rounded-xl transition-all ${
                  isActive
                    ? "hover:bg-transparent"
                    : "text-[var(--muted)] hover:bg-[var(--surface)]"
                }`}
                style={
                  isActive
                    ? {
                        color: theme === "dark" ? "#ffffff" : "#000000",
                        border: `1px solid ${theme === "dark" ? "#ffffff" : "#000000"}`,
                      }
                    : undefined
                }
              >
                {isCollapsed ? (
                  <Icon className="h-5 w-5" />
                ) : (
                  <span className="font-medium" style={{ whiteSpace: "nowrap" }}>
                    {item.name}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col">
        <header
          className="app-header h-16 border-b flex items-center justify-between px-8 relative"
            style={{
              backgroundColor: theme === "dark" ? "var(--surface)" : "transparent",
              borderColor: theme === "dark" ? "#ffffff" : undefined,
            }}
        >
          <div className="flex items-center gap-4">
            <img
              src={theme === "dark" ? LogoNoNameDark : Logo}
              alt="Logo"
              className="h-14 w-auto object-contain"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
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

            <div className="relative" ref={notificationsRef}>
              <button
                onClick={() => {
                  setIsNotificationsOpen(!isNotificationsOpen);
                  setIsProfileOpen(false);
                }}
                className="p-2.5 text-[var(--text)] hover:bg-[var(--surface)] rounded-xl transition relative group"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
              </button>

              {isNotificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 app-card rounded-2xl shadow-2xl z-50 overflow-hidden border border-[var(--border)]">
                  <div className="p-4 border-b border-[var(--border)] flex justify-between items-center bg-[var(--surface)]/95">
                    <h3 className="font-bold text-xs uppercase tracking-widest text-[var(--muted)]">
                      Notifications
                    </h3>
                  </div>
                  <div className="max-h-80 overflow-y-auto bg-[var(--surface)]">
                    {notifications.length === 0 ? (
                      <p className="p-8 text-center text-sm text-[var(--muted)]">
                        No recent notifications
                      </p>
                    ) : (
                      notifications.slice(0, 5).map((n) => (
                        <div
                          key={n.id}
                          onClick={() => handleNotificationClick(n)}
                          className="p-4 border-b border-[var(--border)] hover:bg-[var(--surface)]/60 transition cursor-pointer"
                        >
                          <p className="text-xs leading-relaxed text-[var(--text)]">
                            {n.message}
                          </p>
                          <p className="text-[10px] text-[var(--muted)] mt-1 font-mono">
                            {new Date(n.createdAt).toLocaleString()}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                  <button
                    onClick={() => {
                      navigate("/notifications");
                      setIsNotificationsOpen(false);
                    }}
                    className="w-full p-4 text-xs font-black uppercase tracking-widest transition"
                    style={{ color: "var(--text)", backgroundColor: "var(--surface)" }}
                  >
                    View All Notifications
                  </button>
                </div>
              )}
            </div>

            <div className="relative" ref={profileRef}>
              <button
                onClick={() => {
                  setIsProfileOpen(!isProfileOpen);
                  setIsNotificationsOpen(false);
                }}
                className="flex items-center gap-3 hover:bg-[var(--surface)] p-2 rounded-xl transition"
              >
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-bold text-[var(--text)] tracking-tight">
                    {currentUserDetails?.name || "Administrator"}
                  </p>
                  <p className="text-[9px] text-[var(--muted)] font-black uppercase tracking-widest">
                    {roles.find(
                      (r) =>
                        String(r.id).toLowerCase() ===
                        String(user?.roleId).toLowerCase(),
                    )?.name || "Member"}
                  </p>
                </div>
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center font-black"
                  style={{ backgroundColor: "var(--button-bg)", color: "var(--button-text)" }}
                >
                  {(currentUserDetails?.name ||
                    currentUserDetails?.email ||
                    "A")[0].toUpperCase()}
                </div>
              </button>

            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-48 app-card rounded-xl shadow-2xl z-50 overflow-hidden border border-[var(--border)]">
                <button
                  onClick={() => {
                    navigate("/profile");
                    setIsProfileOpen(false);
                  }}
                  className="w-full text-left px-4 py-3 text-sm transition hover:bg-[rgba(0,0,0,0.05)] dark:hover:bg-[rgba(255,255,255,0.08)]"
                  style={{ color: "var(--text)" }}
                >
                  My Profile / Edit
                </button>
                <button
                  onClick={() => {
                    navigate("/settings");
                    setIsProfileOpen(false);
                  }}
                  className="w-full text-left px-4 py-3 text-sm transition hover:bg-[rgba(0,0,0,0.05)] dark:hover:bg-[rgba(255,255,255,0.08)]"
                  style={{ color: "var(--text)" }}
                >
                  Settings
                </button>
                <hr className="border-[var(--border)]" />
                <button
                  onClick={() => {
                    const currentTheme = sessionStorage.getItem("theme") || localStorage.getItem("theme");
                    localStorage.clear();
                    if (currentTheme) {
                      localStorage.setItem("theme", currentTheme);
                      sessionStorage.setItem("theme", currentTheme);
                    }
                    window.location.reload();
                  }}
                  className="w-full text-left px-4 py-3 text-sm transition hover:bg-[rgba(0,0,0,0.05)] dark:hover:bg-[rgba(255,255,255,0.08)]"
                  style={{ color: "#ff5252" }}
                >
                  Logout
                </button>
              </div>
            )}
          </div>
          </div>
        </header>

        <main className="p-8">{children}</main>
      </div>
    </div>
  );
};

export default Layout;

import { useState, useEffect, useMemo, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Moon, Sun, Home, Users, Bell, LogOut, Building2, Check, MessagesSquare, Sparkles, FolderKanban } from "lucide-react";
import { getLoggedInUser, logout } from "../utils/auth";
import api from "../services/api";
import type { User, Role, Organization, NotificationItem } from "../types";
import { useTheme } from "../theme";
import Logo from "../assets/NexusTrack_Logo_Light.png";
import LogoNoNameDark from "../assets/NexusTrack_Logo_Dark.png";

const Layout = ({ children }: { children: React.ReactNode }) => {
  const { theme, toggleTheme } = useTheme();
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [org, setOrg] = useState<Organization | null>(null);
  const [dmUnread, setDmUnread] = useState(0);

  const profileRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const currentUser = getLoggedInUser();
    setUser(currentUser);

    api.get("/users/roles").then((res) => setRoles(Array.isArray(res.data) ? res.data : [])).catch(() => setRoles([]));
    api.get("/organizations/me").then((res) => setOrg(res.data)).catch(() => setOrg(null));
    api.get("/users").then((res) => setUsers(Array.isArray(res.data) ? res.data : [])).catch(() => setUsers([]));

    if (currentUser) {
      api.get("/notifications").then((res) => {
        setNotifications(Array.isArray(res.data) ? res.data : res.data.notifications || []);
      }).catch(() => {});
    }
  }, []);

  // Poll unread direct-message count for the sidebar badge.
  useEffect(() => {
    let active = true;
    const tick = () => {
      api.get("/conversations/unread-count")
        .then((res) => { if (active) setDmUnread(Number(res.data?.count) || 0); })
        .catch(() => {});
    };
    tick();
    const id = setInterval(tick, 20000);
    return () => { active = false; clearInterval(id); };
  }, [location.pathname]);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const currentUserDetails = useMemo(() => {
    if (!user) return null;
    const userId = String(user.id).toLowerCase();
    const userEmail = String((user as any).email || "").toLowerCase();
    const found = users.find(
      (u) => String(u.id).toLowerCase() === userId || (userEmail && String(u.email || "").toLowerCase() === userEmail),
    );
    if (found) return found;
    const emailPrefix = userEmail ? userEmail.split("@")[0].replace(/[._]/g, " ") : "Member";
    return { ...user, name: (user as any).name && String((user as any).name).length > 0 ? (user as any).name : emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1) } as User;
  }, [user, users]);

  const isAdmin = useMemo(() => {
    if (!user || roles.length === 0) return false;
    const userRoleId = String(user.roleId).toLowerCase();
    const adminRoles = roles
      .filter((r) => ["admin", "administrator", "superadmin", "super admin"].includes(r.name.toLowerCase()))
      .map((r) => String(r.id).toLowerCase());
    return adminRoles.includes(userRoleId);
  }, [user, roles]);

  const markRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    try { await api.patch(`/notifications/${id}/read`); } catch { /* optimistic */ }
  };

  const markAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try { await api.patch("/notifications/read-all"); } catch { /* optimistic */ }
  };

  const handleNotificationClick = async (n: NotificationItem) => {
    setIsNotificationsOpen(false);
    if (!n.read) markRead(n.id);
    const ticketId = (n as any).ticketId ?? (n as any).ticket_id ?? (n as any).ticket?.id;
    if (ticketId) navigate(`/dashboard?ticketId=${ticketId}`);
  };

  // Sticky project space: the last opened collection becomes a first-class
  // sidebar entry, so switching tabs never forces re-picking a collection.
  const activeCollection = useMemo(() => {
    try {
      const raw = localStorage.getItem("activeCollection");
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed?.id && parsed?.name ? { id: String(parsed.id), name: String(parsed.name) } : null;
    } catch {
      return null;
    }
    // location dep: re-read after navigation (e.g. entering another collection)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, location.search]);

  const menuItems = useMemo(() => {
    const items: { name: string; path: string; icon: typeof Home; badge?: number }[] = [
      { name: "Collections", path: "/collections?all=1", icon: FolderKanban },
    ];
    if (activeCollection) {
      items.push({ name: activeCollection.name, path: `/dashboard?collection=${activeCollection.id}`, icon: Home });
    }
    items.push(
      { name: "Conversations", path: "/conversations", icon: MessagesSquare, badge: dmUnread },
      { name: "AI Assistant", path: "/ai", icon: Sparkles },
    );
    if (isAdmin) items.push({ name: "Team", path: "/users", icon: Users });
    return items;
  }, [isAdmin, dmUnread, activeCollection]);

  const roleName = roles.find((r) => String(r.id).toLowerCase() === String(user?.roleId).toLowerCase())?.name || "Member";

  return (
    <div className="min-h-screen flex app-shell protected-shell">
      <aside
        className={`app-aside border-r transition-all duration-300 flex flex-col ${isCollapsed ? "w-20" : "w-72"}`}
        style={{ borderColor: "var(--border)" }}
      >
        <div className="p-5 flex items-center justify-between gap-2">
          {!isCollapsed && (
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: "var(--muted)" }}>Workspace</p>
              <p className="text-sm font-bold truncate" style={{ color: "var(--text)" }}>{org?.name || "Service Desk"}</p>
            </div>
          )}
          <button onClick={() => setIsCollapsed(!isCollapsed)} className="p-2 rounded-lg transition hover:bg-[var(--surface)]" style={{ color: "var(--text)" }}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
        </div>

        <nav className="flex-1 px-3 pt-3 space-y-1.5">
          {menuItems.map((item) => {
            const basePath = item.path.split("?")[0];
            const isActive =
              basePath === "/dashboard"
                ? location.pathname === "/dashboard"
                : basePath === "/collections"
                  ? location.pathname === "/collections" || (location.pathname === "/dashboard" && !activeCollection)
                  : location.pathname === basePath;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`relative flex items-center gap-3 ${isCollapsed ? "justify-center" : ""} px-3.5 py-2.5 rounded-xl transition-all text-sm font-medium`}
                style={isActive ? { backgroundColor: "var(--accent-soft)", color: "var(--accent)" } : { color: "var(--muted)" }}
              >
                <span className="relative shrink-0">
                  <Icon className="h-[18px] w-[18px]" />
                  {isCollapsed && !!item.badge && item.badge > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 h-2.5 w-2.5 rounded-full ring-2" style={{ backgroundColor: "#ef4444", boxShadow: "0 0 0 2px var(--surface)" }} />
                  )}
                </span>
                {!isCollapsed && <span className="whitespace-nowrap flex-1">{item.name}</span>}
                {!isCollapsed && !!item.badge && item.badge > 0 && (
                  <span className="ml-auto inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: "#ef4444" }}>
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {!isCollapsed && org && (
          <div className="p-4 m-3 rounded-xl" style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="h-3.5 w-3.5" style={{ color: "var(--accent)" }} />
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>Organization</span>
            </div>
            <p className="text-xs font-bold truncate" style={{ color: "var(--text)" }}>{org.name}</p>
            {org.inviteCode && (
              <p className="text-[10px] mt-1 font-mono" style={{ color: "var(--muted)" }}>Invite: {org.inviteCode}</p>
            )}
          </div>
        )}
      </aside>

      <div className="flex-1 flex flex-col">
        <header className="app-header h-16 border-b flex items-center justify-between px-6" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}>
          <div className="flex items-center gap-3">
            <span className="brand-logo brand-logo--header">
              <img src={theme === "dark" ? LogoNoNameDark : Logo} alt="NexusTrack" />
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={toggleTheme} className="rounded-full border p-2.5 transition" style={{ borderColor: "var(--border)", color: "var(--text)", backgroundColor: "var(--bg)" }} aria-label="Toggle theme">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            <div className="relative" ref={notificationsRef}>
              <button
                onClick={() => { setIsNotificationsOpen(!isNotificationsOpen); setIsProfileOpen(false); }}
                className="relative p-2.5 rounded-full border transition"
                style={{ borderColor: "var(--border)", color: "var(--text)", backgroundColor: "var(--bg)" }}
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center" style={{ backgroundColor: "var(--accent)", color: "#fff" }}>
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {isNotificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-2xl shadow-2xl z-50 overflow-hidden border" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}>
                  <div className="p-4 border-b flex justify-between items-center" style={{ borderColor: "var(--border)" }}>
                    <h3 className="font-semibold text-sm" style={{ color: "var(--text)" }}>Notifications</h3>
                    {unreadCount > 0 && (
                      <button onClick={markAllRead} className="text-xs font-medium flex items-center gap-1" style={{ color: "var(--accent)" }}>
                        <Check className="h-3.5 w-3.5" /> Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="p-8 text-center text-sm" style={{ color: "var(--muted)" }}>No notifications yet</p>
                    ) : (
                      notifications.slice(0, 6).map((n) => (
                        <div key={n.id} onClick={() => handleNotificationClick(n)} className="p-4 border-b transition cursor-pointer hover:bg-[var(--accent-soft)] flex gap-3" style={{ borderColor: "var(--border)" }}>
                          <span className="mt-1.5 h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: n.read ? "transparent" : "var(--accent)" }} />
                          <div className="min-w-0">
                            <p className="text-xs leading-relaxed" style={{ color: "var(--text)" }}>{n.message}</p>
                            <p className="text-[10px] mt-1" style={{ color: "var(--muted)" }}>{new Date(n.createdAt).toLocaleString()}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <button onClick={() => { navigate("/notifications"); setIsNotificationsOpen(false); }} className="w-full p-3.5 text-xs font-semibold transition" style={{ color: "var(--accent)", backgroundColor: "var(--surface)" }}>
                    View all notifications
                  </button>
                </div>
              )}
            </div>

            <div className="relative" ref={profileRef}>
              <button onClick={() => { setIsProfileOpen(!isProfileOpen); setIsNotificationsOpen(false); }} className="flex items-center gap-3 p-1.5 pr-3 rounded-full border transition" style={{ borderColor: "var(--border)", backgroundColor: "var(--bg)" }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm" style={{ backgroundColor: "var(--accent)", color: "#fff" }}>
                  {(currentUserDetails?.name || currentUserDetails?.email || "U")[0].toUpperCase()}
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-xs font-semibold leading-tight" style={{ color: "var(--text)" }}>{currentUserDetails?.name || "Member"}</p>
                  <p className="text-[10px]" style={{ color: "var(--muted)" }}>{roleName}</p>
                </div>
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-52 rounded-xl shadow-2xl z-50 overflow-hidden border" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}>
                  <div className="px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
                    <p className="text-xs font-semibold truncate" style={{ color: "var(--text)" }}>{currentUserDetails?.email}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: "var(--muted)" }}>{org?.name}</p>
                  </div>
                  <button onClick={() => { navigate("/profile"); setIsProfileOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm transition hover:bg-[var(--accent-soft)]" style={{ color: "var(--text)" }}>My profile</button>
                  <button onClick={() => { navigate("/settings"); setIsProfileOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm transition hover:bg-[var(--accent-soft)]" style={{ color: "var(--text)" }}>Settings</button>
                  <button onClick={logout} className="w-full text-left px-4 py-2.5 text-sm transition flex items-center gap-2 hover:bg-[rgba(239,68,68,0.08)]" style={{ color: "#ef4444" }}>
                    <LogOut className="h-4 w-4" /> Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
};

export default Layout;

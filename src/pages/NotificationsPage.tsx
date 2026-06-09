import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bell, Check, CheckCheck } from "lucide-react";
import api from "../services/api";
import type { NotificationItem } from "../types";

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchAll = async () => {
    setLoading(true);
    try {
      const res = await api.get("/notifications");
      const data = res.data || [];
      setNotifications(Array.isArray(data) ? data : data.notifications || []);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const unread = notifications.filter((n) => !n.read).length;

  const markRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    try { await api.patch(`/notifications/${id}/read`); } catch { /* optimistic */ }
  };

  const markAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try { await api.patch("/notifications/read-all"); } catch { /* optimistic */ }
  };

  const handleClick = async (n: NotificationItem) => {
    if (!n.read) await markRead(n.id);
    const ticketId = (n as any).ticketId ?? (n as any).ticket_id ?? (n as any).ticket?.id;
    if (ticketId) navigate(`/dashboard?ticketId=${ticketId}`);
  };

  return (
    <div className="max-w-3xl mx-auto p-6 md:p-10">
      <button onClick={() => navigate(-1)} className="text-xs font-semibold mb-6 flex items-center gap-2 transition" style={{ color: "var(--muted)" }}>
        <ArrowLeft className="h-4 w-4" /> Back to dashboard
      </button>

      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ backgroundColor: "var(--accent-soft)", color: "var(--accent)" }}>
            <Bell className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text)" }}>Notifications</h1>
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              {unread > 0 ? `${unread} unread` : "You're all caught up"}
            </p>
          </div>
        </div>
        {unread > 0 && (
          <button onClick={markAllRead} className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition hover:-translate-y-0.5" style={{ borderColor: "var(--border)", color: "var(--accent)", backgroundColor: "var(--surface)" }}>
            <CheckCheck className="h-4 w-4" /> Mark all read
          </button>
        )}
      </div>

      <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}>
        {loading ? (
          <div className="p-20 text-center">
            <div className="w-9 h-9 rounded-full animate-spin mx-auto mb-4" style={{ border: "3px solid var(--accent)", borderTopColor: "transparent" }} />
            <p className="text-xs" style={{ color: "var(--muted)" }}>Loading notifications…</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-20 text-center">
            <Bell className="h-8 w-8 mx-auto mb-3 opacity-30" />
            <p className="text-sm" style={{ color: "var(--muted)" }}>No notifications yet.</p>
          </div>
        ) : (
          <ul className="divide-y" style={{ borderColor: "var(--border)" }}>
            {notifications.map((n) => (
              <li
                key={n.id}
                onClick={() => handleClick(n)}
                className="p-5 flex items-start gap-4 cursor-pointer transition hover:bg-[var(--accent-soft)]"
                style={{ borderColor: "var(--border)" }}
              >
                <span className="mt-1.5 h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: n.read ? "var(--border)" : "var(--accent)" }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm leading-relaxed" style={{ color: "var(--text)", fontWeight: n.read ? 400 : 600 }}>{n.message}</p>
                  <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>{new Date(n.createdAt).toLocaleString()}</p>
                </div>
                {!n.read && (
                  <button
                    onClick={(e) => { e.stopPropagation(); markRead(n.id); }}
                    title="Mark as read"
                    className="shrink-0 p-1.5 rounded-lg transition hover:bg-[var(--surface)]"
                    style={{ color: "var(--accent)" }}
                  >
                    <Check className="h-4 w-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;

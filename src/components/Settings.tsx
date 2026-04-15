import React, { useState, useEffect } from "react";
import {
  Bell,
  ArrowLeft,
  Save,
  ShieldCheck,
  Ticket,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

const Settings = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<{
    type: "success" | "error" | "";
    text: string;
  }>({ type: "", text: "" });

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const [notifications, setNotifications] = useState({
    notifyAssignedTicket: true,
    notifyReportedTicket: true,
    notifyTicketApproved: true,
    notifyTicketRejected: true,
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const res = await api.get("/users/notification-settings", {
          headers: getAuthHeaders(),
        });
        if (res.data) {
          setNotifications(res.data);
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleToggle = (key: keyof typeof notifications) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    setStatus({ type: "", text: "" });
    try {
      await api.patch("/users/notification-settings", notifications, {
        headers: getAuthHeaders(),
      });
      setStatus({
        type: "success",
        text: "Notification preferences synced successfully.",
      });
    } catch (err: any) {
      setStatus({
        type: "error",
        text: err.response?.data?.message || "Failed to update settings.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading)
    return (
      <div className="flex flex-col items-center justify-center py-32" style={{ color: "var(--text)" }}>
        <Loader2 className="w-10 h-10 animate-spin mb-4" style={{ color: "var(--button-text)" }} />
        <p className="font-black uppercase tracking-[0.3em] text-[10px]" style={{ color: "var(--muted)" }}>
          Retrieving Preferences
        </p>
      </div>
    );

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 animate-in fade-in duration-500">
      <div className="mb-12">
        <button
          onClick={() => navigate(-1)}
          className="text-[10px] font-black uppercase tracking-[0.2em] mb-4 flex items-center gap-2 transition-colors"
          style={{ color: "var(--muted)" }}
        >
          <ArrowLeft size={14} />
          Return
        </button>
        <h1 className="text-5xl font-black uppercase tracking-tighter" style={{ color: "var(--text)" }}>
          System <span style={{ color: "var(--muted)" }}>Config</span>
        </h1>
        <p className="text-sm font-medium" style={{ color: "var(--muted)" }}>
          Configure how the ticketing cluster communicates with your account
        </p>
      </div>

      <div className="rounded-[2.5rem] overflow-hidden shadow-2xl" style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
        <div className="p-8 border-b flex justify-between items-center" style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}>
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl border flex items-center justify-center" style={{ backgroundColor: "rgba(255,255,255,0.04)", borderColor: "var(--border)" }}>
              <Bell className="text-[var(--text)]" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight" style={{ color: "var(--text)" }}>
                Notification Channels
              </h2>
              <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "var(--muted)" }}>
                Real-time event subscriptions
              </p>
            </div>
          </div>
        </div>

        <div className="p-10 space-y-8">
          {status.text && (
            <div
              className="p-5 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 animate-in slide-in-from-top-2"
              style={{
                backgroundColor:
                  status.type === "success"
                    ? "rgba(255,255,255,0.08)"
                    : "rgba(255,255,255,0.06)",
                border: "1px solid var(--border)",
                color: "var(--text)",
              }}
            >
              <div
                className="w-2 h-2 rounded-full animate-pulse"
                style={{
                  backgroundColor:
                    status.type === "success" ? "var(--text)" : "var(--muted)",
                }}
              ></div>
              {status.text}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SettingCard
              title="Assignment Alerts"
              desc="Instant notification when a new ticket is assigned to your queue."
              icon={<Ticket size={18} />}
              enabled={notifications.notifyAssignedTicket}
              onToggle={() => handleToggle("notifyAssignedTicket")}
            />
            <SettingCard
              title="Report Updates"
              desc="Updates regarding tickets you have personally submitted to the system."
              icon={<ShieldCheck size={18} />}
              enabled={notifications.notifyReportedTicket}
              onToggle={() => handleToggle("notifyReportedTicket")}
            />
            <SettingCard
              title="Approval Success"
              desc="Alerts for when your pending tickets are granted 'Approved' status."
              icon={<CheckCircle size={18} />}
              enabled={notifications.notifyTicketApproved}
              onToggle={() => handleToggle("notifyTicketApproved")}
            />
            <SettingCard
              title="Rejection Alerts"
              desc="Notifications for tickets that failed review or were rejected by admins."
              icon={<XCircle size={18} />}
              enabled={notifications.notifyTicketRejected}
              onToggle={() => handleToggle("notifyTicketRejected")}
            />
          </div>
        </div>

        <div className="p-8 flex justify-end" style={{ backgroundColor: "var(--surface)", borderTop: "1px solid var(--border)" }}>
          <button
            onClick={handleSave}
            disabled={isSubmitting}
            className="flex items-center gap-3 px-10 py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] transition duration-200 ease-out transform hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/10 disabled:opacity-50"
            style={{
              backgroundColor: "var(--button-bg)",
              color: "var(--button-text)",
              border: "1px solid var(--border)",
            }}
          >
            {isSubmitting ? (
              <Loader2 className="animate-spin" size={16} />
            ) : (
              <Save size={16} />
            )}
            {isSubmitting ? "Syncing..." : "Save Configuration"}
          </button>
        </div>
      </div>
    </div>
  );
};

const SettingCard = ({
  title,
  desc,
  icon,
  enabled,
  onToggle,
}: {
  title: string;
  desc: string;
  icon: React.ReactNode;
  enabled: boolean;
  onToggle: () => void;
}) => (
  <div
    className="p-6 rounded-[2rem] border transition-all flex items-center justify-between gap-4"
    style={{
      backgroundColor: enabled ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.02)",
      borderColor: "var(--border)",
      boxShadow: enabled ? "0 15px 40px rgba(255,255,255,0.03)" : undefined,
    }}
  >
    <div className="flex items-center gap-4">
      <div
        className="w-12 h-12 rounded-xl shrink-0 grid place-items-center transition-colors"
        style={{
          backgroundColor: enabled ? "var(--button-bg)" : "rgba(255,255,255,0.06)",
          color: enabled ? "var(--button-text)" : "var(--muted)",
          boxShadow: enabled ? "0 15px 30px rgba(255,255,255,0.08)" : undefined,
        }}
      >
        {React.cloneElement(icon as React.ReactElement<any>, {
          size: 20,
          color: enabled ? "var(--button-text)" : "var(--muted)",
        })}
      </div>
      <div>
        <p className="font-bold mb-0.5" style={{ color: "var(--text)" }}>{title}</p>
        <p className="text-xs leading-relaxed" style={{ color: "var(--muted)" }}>{desc}</p>
      </div>
    </div>
    <Toggle enabled={enabled} onChange={onToggle} />
  </div>
);

const Toggle = ({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: () => void;
}) => (
  <button
    onClick={onChange}
    className="relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2"
    style={{
      backgroundColor: enabled ? "var(--button-bg)" : "var(--border)",
      boxShadow: "inset 0 0 0 1px var(--border)",
      color: "var(--button-text)",
    }}
  >
    <span
      className={`${
        enabled ? "translate-x-6" : "translate-x-1"
      } inline-block h-5 w-5 transform rounded-full shadow-xl transition-transform duration-200`}
      style={{
        backgroundColor: enabled ? "var(--button-text)" : "var(--surface)",
      }}
    />
  </button>
);

export default Settings;

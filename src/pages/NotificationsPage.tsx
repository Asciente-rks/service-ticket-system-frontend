import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const navigate = useNavigate();
  const limit = 20;

  const fetchAllNotifications = async (currentPage: number) => {
    setLoading(true);
    try {
      const res = await api
        .get(`/notifications?page=${currentPage}&limit=${limit}`)
        .catch(() => ({ data: [] }));
      const data = res.data || [];

      if (Array.isArray(data)) {
        setNotifications(data);
        setTotalPages(1);
      } else {
        setNotifications(data.notifications || []);
        setTotalPages(data.totalPages || 1);
      }
    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllNotifications(page);
  }, [page]);

  const handleNotificationClick = async (notification: any) => {
    if (notification.ticketId) {
      navigate(`/dashboard?ticketId=${notification.ticketId}`);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="text-slate-500 hover:text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] mb-4 flex items-center gap-2 transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Return to Dashboard
          </button>
          <h1 className="text-5xl font-black text-white uppercase tracking-tighter leading-none">
            Notification <span className="text-indigo-500">Center</span>
          </h1>
          <p className="text-slate-500 text-sm font-medium mt-2">
            Managing your workflow updates and ticket assignments
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="bg-indigo-500/10 border border-indigo-500/20 px-4 py-2.5 rounded-xl whitespace-nowrap">
            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">
              Page {page} / {totalPages}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-slate-900/50 border border-slate-800/60 rounded-[2rem] overflow-hidden backdrop-blur-xl shadow-2xl">
        {loading ? (
          <div className="p-32 text-center">
            <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
            <p className="text-slate-500 font-mono text-xs tracking-[0.3em] uppercase">
              Syncing alerts...
            </p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-32 text-center">
            <div className="text-4xl mb-4 opacity-20">📭</div>
            <p className="text-slate-500 text-sm font-medium italic">
              Your notification history is empty.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/50">
            {notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className="p-8 hover:bg-indigo-500/[0.02] transition-all flex items-start gap-6 group cursor-pointer"
              >
                <div className="w-3 h-3 mt-1.5 rounded-full shrink-0 bg-slate-800 group-hover:bg-indigo-500 transition-all" />

                <div className="flex-1">
                  <div className="flex justify-between items-start mb-2 gap-4">
                    <p className="text-sm leading-relaxed text-slate-300 group-hover:text-white transition-colors">
                      {n.message}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 mt-3">
                    <span className="text-[10px] font-mono text-slate-600 flex items-center gap-1.5">
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      {new Date(n.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex gap-4 mt-10">
          <button
            disabled={page === 1 || loading}
            onClick={() => {
              setPage((p) => p - 1);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="flex-1 bg-slate-900/80 border border-slate-800 text-slate-400 py-5 rounded-2xl font-black hover:bg-slate-800 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-all uppercase tracking-widest text-[10px] active:scale-95 shadow-xl"
          >
            ← Previous Page
          </button>
          <button
            disabled={page === totalPages || loading}
            onClick={() => {
              setPage((p) => p + 1);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="flex-1 bg-slate-900/80 border border-slate-800 text-slate-400 py-5 rounded-2xl font-black hover:bg-slate-800 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-all uppercase tracking-widest text-[10px] active:scale-95 shadow-xl"
          >
            Next Page →
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;

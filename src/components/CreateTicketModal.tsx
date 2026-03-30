import { useState, useEffect } from "react";
import api from "../services/api";
import type { TicketStatus, User } from "../types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CreateTicketModal = ({ isOpen, onClose, onSuccess }: Props) => {
  const [statuses, setStatuses] = useState<TicketStatus[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "",
    statusId: "",
    assignedTo: "",
  });

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      setIsLoadingData(true);
      try {
        try {
          const statusRes = await api.get("/tickets/statuses");
          const fetchedStatuses = Array.isArray(statusRes.data)
            ? statusRes.data
            : [];
          if (isMounted) {
            setStatuses(fetchedStatuses);
            if (fetchedStatuses.length > 0) {
              setFormData((prev) => ({
                ...prev,
                statusId: String(fetchedStatuses[0].id),
              }));
            }
          }
        } catch (err) {
          console.error("Status fetch failed:", err);
        }

        try {
          const userRes = await api.get("/users");
          if (isMounted) {
            setUsers(Array.isArray(userRes.data) ? userRes.data : []);
          }
        } catch (err) {
          console.error("User fetch failed:", err);
        }
      } catch (err) {
        console.error("Failed to fetch modal data:", err);
      } finally {
        if (isMounted) setIsLoadingData(false);
      }
    };

    if (isOpen) {
      setFormData({
        title: "",
        description: "",
        priority: "Medium",
        statusId: "",
        assignedTo: "",
      });
      fetchData();
    }

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.statusId) {
      alert("Please wait for statuses to load or select one.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
        statusId: formData.statusId || null,
        assigneeId: formData.assignedTo || null,
      };

      await api.post("/tickets", payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("CREATE TICKET ERROR:", err.response?.data);
      alert(err.response?.data?.message || "Failed to create ticket.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl p-8 shadow-2xl">
        <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-6">
          Create New Ticket
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 tracking-widest">
              Title
            </label>
            <input
              required
              placeholder="Enter ticket title..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:border-indigo-500 outline-none transition"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 tracking-widest">
              Description
            </label>
            <textarea
              required
              rows={3}
              placeholder="What needs to be fixed?"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:border-indigo-500 outline-none resize-none transition"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 tracking-widest">
                Priority
              </label>
              <select
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:border-indigo-500 outline-none appearance-none"
                value={formData.priority}
                onChange={(e) =>
                  setFormData({ ...formData, priority: e.target.value })
                }
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 tracking-widest">
                Status
              </label>
              <select
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:border-indigo-500 outline-none disabled:opacity-50"
                value={formData.statusId}
                disabled={isLoadingData}
                onChange={(e) =>
                  setFormData({ ...formData, statusId: e.target.value })
                }
              >
                <option value="" disabled>
                  {isLoadingData ? "Loading..." : "Select Status"}
                </option>
                {statuses.map((s) => (
                  <option key={s.id} value={String(s.id)}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 tracking-widest">
              Assign To
            </label>
            <select
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:border-indigo-500 outline-none"
              value={formData.assignedTo}
              onChange={(e) =>
                setFormData({ ...formData, assignedTo: e.target.value })
              }
            >
              <option value="">Unassigned</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.email})
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 mt-8">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-slate-800 text-slate-400 font-bold rounded-xl hover:bg-slate-800 transition active:scale-95"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isLoadingData}
              className="flex-1 px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 transition disabled:bg-slate-800 disabled:text-slate-600 active:scale-95"
            >
              {isSubmitting ? "Creating..." : "Submit Ticket"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTicketModal;

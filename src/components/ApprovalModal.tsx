import { useState } from "react";
import api from "../services/api";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  ticketId: string;
  onSuccess: () => void;
}

const ApprovalModal = ({ isOpen, onClose, ticketId, onSuccess }: Props) => {
  const [status, setStatus] = useState<"Approved" | "Rejected">("Approved");
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await api.post(`/tickets/${ticketId}/approval`, {
        status: status,
        comment: comment,
      });
      onSuccess();
      onClose();
    } catch (err) {
      console.error("Approval failed:", err);
      alert("Failed to submit approval.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
      <div
        className="w-full max-w-xl rounded-[2rem] border p-8 shadow-2xl"
        style={{
          backgroundColor: "var(--surface)",
          borderColor: "var(--border)",
          color: "var(--text)",
        }}
      >
        <div className="mb-6 border-b border-[var(--border)] pb-4">
          <h2 className="text-2xl font-black uppercase tracking-[0.25em]" style={{ color: "var(--text)" }}>
            Review Ticket
          </h2>
          <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
            Choose a decision and leave your review comments.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-[0.35em] mb-3" style={{ color: "var(--muted)" }}>
              Decision
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setStatus("Approved")}
                className={`py-3 rounded-3xl font-black uppercase tracking-widest transition duration-200 ease-out transform ${
                  status === "Approved"
                    ? "bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                    : "bg-[var(--input)] border border-[var(--border)] text-[var(--text)] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/10"
                }`}
              >
                Approve
              </button>
              <button
                type="button"
                onClick={() => setStatus("Rejected")}
                className={`py-3 rounded-3xl font-black uppercase tracking-widest transition duration-200 ease-out transform ${
                  status === "Rejected"
                    ? "bg-rose-500 border-rose-500 text-white shadow-lg shadow-rose-500/20"
                    : "bg-[var(--input)] border border-[var(--border)] text-[var(--text)] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/10"
                }`}
              >
                Reject
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-[0.35em] mb-2" style={{ color: "var(--muted)" }}>
              Review Comments
            </label>
            <textarea
              required
              rows={5}
              placeholder="Explain the reason for your decision..."
              className="w-full rounded-3xl px-4 py-4 outline-none resize-none transition"
              style={{
                backgroundColor: "var(--input)",
                border: "1px solid var(--border)",
                color: "var(--input-text)",
              }}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-3xl px-6 py-3 font-black uppercase tracking-widest transition duration-200 ease-out transform hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/10"
              style={{
                backgroundColor: "transparent",
                border: "1px solid var(--border)",
                color: "var(--text)",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 rounded-3xl px-6 py-3 font-black uppercase tracking-widest transition duration-200 ease-out transform hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/10"
              style={{
                backgroundColor: "var(--button-bg)",
                color: "var(--button-text)",
                border: "1px solid var(--border)",
                opacity: isSubmitting ? 0.6 : 1,
              }}
            >
              {isSubmitting ? "Processing..." : "Submit Review"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ApprovalModal;

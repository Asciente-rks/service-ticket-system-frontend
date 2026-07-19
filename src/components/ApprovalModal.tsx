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
    <div className="modal-overlay" style={{ zIndex: 150 }}>
      <div className="modal-panel max-w-xl rounded-[2rem] p-8">
        <div className="mb-6 border-b border-[var(--border)] pb-4">
          <h2 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text)" }}>
            Review ticket
          </h2>
          <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
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
              className="field px-4 py-4 outline-none resize-y"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn btn-ghost flex-1 px-6 py-3 text-sm uppercase tracking-widest font-bold">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="btn btn-primary flex-1 px-6 py-3 text-sm uppercase tracking-widest font-bold">
              {isSubmitting ? (<><span className="ui-spinner h-4 w-4" /> Processing…</>) : "Submit Review"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ApprovalModal;

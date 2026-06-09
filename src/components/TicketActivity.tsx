import { useEffect, useState, useCallback } from "react";
import {
  Send, CornerDownRight, Trash2, Clock, Inbox, UserPlus, Repeat,
  CheckCircle2, XCircle, RefreshCw, MessageSquare,
} from "lucide-react";
import api from "../services/api";
import { getApiErrorMessage } from "../utils/apiError";
import type { TicketComment, TicketEvent } from "../types";

interface Props {
  ticketId: string;
  currentUserId?: string;
  isAdmin?: boolean;
}

const timeAgo = (iso: string): string => {
  const d = new Date(iso).getTime();
  if (!d) return "";
  const s = Math.floor((Date.now() - d) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
};

const eventMeta = (e: TicketEvent): { icon: React.ReactNode; color: string; text: string } => {
  switch (e.type) {
    case "reported":
      return { icon: <Inbox className="h-3.5 w-3.5" />, color: "#0ea5e9", text: "Reported" };
    case "assigned":
      return { icon: <UserPlus className="h-3.5 w-3.5" />, color: "var(--accent)", text: `Assigned to ${e.toValue || "someone"}` };
    case "reassigned":
      return { icon: <Repeat className="h-3.5 w-3.5" />, color: "#f59e0b", text: `Reassigned ${e.fromValue ? `from ${e.fromValue} ` : ""}to ${e.toValue || "someone"}` };
    case "status_changed":
      return { icon: <RefreshCw className="h-3.5 w-3.5" />, color: "#8b5cf6", text: `Status: ${e.fromValue || "—"} → ${e.toValue || "—"}` };
    case "approved":
      return { icon: <CheckCircle2 className="h-3.5 w-3.5" />, color: "#22c55e", text: "Approved" };
    case "rejected":
      return { icon: <XCircle className="h-3.5 w-3.5" />, color: "#ef4444", text: "Rejected" };
    default:
      return { icon: <Clock className="h-3.5 w-3.5" />, color: "var(--muted)", text: e.type };
  }
};

const Avatar = ({ name }: { name: string }) => (
  <span
    className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold"
    style={{ backgroundColor: "var(--accent-soft)", color: "var(--accent)" }}
  >
    {(name || "?")[0].toUpperCase()}
  </span>
);

const TicketActivity = ({ ticketId, currentUserId, isAdmin }: Props) => {
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [events, setEvents] = useState<TicketEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [newComment, setNewComment] = useState("");
  const [posting, setPosting] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [c, h] = await Promise.allSettled([
        api.get(`/tickets/${ticketId}/comments`),
        api.get(`/tickets/${ticketId}/history`),
      ]);
      if (c.status === "fulfilled") setComments(Array.isArray(c.value.data) ? c.value.data : []);
      if (h.status === "fulfilled") setEvents(Array.isArray(h.value.data) ? h.value.data : []);
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => { load(); }, [load]);

  const post = async (body: string, parentId?: string) => {
    if (!body.trim()) return;
    setPosting(true);
    setError("");
    try {
      await api.post(`/tickets/${ticketId}/comments`, { body: body.trim(), parentId: parentId || undefined });
      setNewComment("");
      setReplyText("");
      setReplyTo(null);
      await load();
    } catch (err: any) {
      setError(getApiErrorMessage(err, "Couldn't post your comment."));
    } finally {
      setPosting(false);
    }
  };

  const remove = async (commentId: string) => {
    try {
      await api.delete(`/tickets/${ticketId}/comments/${commentId}`);
      await load();
    } catch (err: any) {
      setError(getApiErrorMessage(err, "Couldn't delete the comment."));
    }
  };

  const canDelete = (authorId: string) => isAdmin || String(authorId) === String(currentUserId);

  const CommentBlock = ({ c, isReply = false }: { c: TicketComment; isReply?: boolean }) => (
    <div className={`flex gap-3 ${isReply ? "ml-9" : ""}`}>
      <Avatar name={c.author?.name || "?"} />
      <div className="flex-1 min-w-0">
        <div className="rounded-2xl border px-4 py-3" style={{ borderColor: "var(--border)", backgroundColor: "var(--input)" }}>
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>{c.author?.name || "Unknown"}</span>
            <span className="text-[11px] shrink-0" style={{ color: "var(--muted)" }}>{timeAgo(c.createdAt)}</span>
          </div>
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words" style={{ color: "var(--text)" }}>{c.body}</p>
        </div>
        <div className="flex items-center gap-3 mt-1.5 px-1">
          {!isReply && (
            <button
              onClick={() => { setReplyTo(replyTo === c.id ? null : c.id); setReplyText(""); }}
              className="inline-flex items-center gap-1 text-[11px] font-semibold transition hover:opacity-80"
              style={{ color: "var(--accent)" }}
            >
              <CornerDownRight className="h-3 w-3" /> Reply
            </button>
          )}
          {canDelete(c.author?.id) && (
            <button onClick={() => remove(c.id)} className="inline-flex items-center gap-1 text-[11px] font-medium transition hover:opacity-80" style={{ color: "#ef4444" }}>
              <Trash2 className="h-3 w-3" /> Delete
            </button>
          )}
        </div>

        {replyTo === c.id && (
          <div className="mt-2 flex items-end gap-2 animate-slide-down">
            <textarea
              autoFocus
              rows={2}
              placeholder={`Reply to ${c.author?.name || ""}…`}
              className="field px-3 py-2 text-sm resize-y"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
            />
            <button onClick={() => post(replyText, c.id)} disabled={posting || !replyText.trim()} className="btn btn-primary h-10 px-4 text-sm shrink-0">
              {posting ? <span className="ui-spinner h-4 w-4" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        )}

        {c.replies && c.replies.length > 0 && (
          <div className="mt-3 space-y-3">
            {c.replies.map((r) => <CommentBlock key={r.id} c={r} isReply />)}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Timeline */}
      <div>
        <h4 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest mb-4" style={{ color: "var(--muted)" }}>
          <Clock className="h-3.5 w-3.5" /> Timeline
        </h4>
        {loading ? (
          <div className="flex items-center gap-2 text-xs" style={{ color: "var(--muted)" }}>
            <span className="ui-spinner h-4 w-4" /> Loading history…
          </div>
        ) : events.length === 0 ? (
          <p className="text-xs" style={{ color: "var(--muted)" }}>No history yet.</p>
        ) : (
          <ol className="relative ml-2">
            <span className="absolute left-[11px] top-1 bottom-1 w-px" style={{ backgroundColor: "var(--border)" }} />
            {events.map((e) => {
              const m = eventMeta(e);
              return (
                <li key={e.id} className="relative flex items-start gap-3 pb-4 last:pb-0">
                  <span className="relative z-10 grid h-6 w-6 shrink-0 place-items-center rounded-full" style={{ backgroundColor: `${m.color === "var(--accent)" ? "var(--accent-soft)" : m.color + "22"}`, color: m.color }}>
                    {m.icon}
                  </span>
                  <div className="pt-0.5">
                    <p className="text-sm font-medium" style={{ color: "var(--text)" }}>{m.text}</p>
                    <p className="text-[11px]" style={{ color: "var(--muted)" }}>
                      {e.actor?.name ? `by ${e.actor.name} · ` : ""}{new Date(e.createdAt).toLocaleString()}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      {/* Comments */}
      <div>
        <h4 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest mb-4" style={{ color: "var(--muted)" }}>
          <MessageSquare className="h-3.5 w-3.5" /> Discussion {comments.length > 0 && <span className="opacity-70">({comments.length})</span>}
        </h4>

        {error && (
          <div className="mb-3 rounded-xl border px-4 py-2.5 text-sm animate-slide-down" style={{ borderColor: "#f87171", backgroundColor: "rgba(248,113,113,0.1)", color: "#ef4444" }}>
            {error}
          </div>
        )}

        {/* New comment */}
        <div className="flex items-end gap-2 mb-6">
          <textarea
            rows={2}
            placeholder="Add a comment…"
            className="field px-3.5 py-2.5 text-sm resize-y"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
          />
          <button onClick={() => post(newComment)} disabled={posting || !newComment.trim()} className="btn btn-primary h-11 px-4 text-sm shrink-0">
            {posting ? <span className="ui-spinner h-4 w-4" /> : <><Send className="h-4 w-4" /> Send</>}
          </button>
        </div>

        {loading ? null : comments.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--muted)" }}>No comments yet — start the discussion.</p>
        ) : (
          <div className="space-y-5">
            {comments.map((c) => <CommentBlock key={c.id} c={c} />)}
          </div>
        )}
      </div>
    </div>
  );
};

export default TicketActivity;

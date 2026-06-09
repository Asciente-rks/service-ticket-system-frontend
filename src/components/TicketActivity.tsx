import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Send, CornerDownRight, Trash2, Clock, Inbox, UserPlus, Repeat,
  CheckCircle2, XCircle, RefreshCw, MessageSquare, ChevronDown, ChevronRight,
} from "lucide-react";
import api from "../services/api";
import { getApiErrorMessage } from "../utils/apiError";
import type { TicketComment, TicketEvent } from "../types";

interface Props {
  ticketId: string;
  currentUserId?: string;
  isAdmin?: boolean;
}

type CommentNode = Omit<TicketComment, "replies"> & { replies: CommentNode[] };

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
    case "reported": return { icon: <Inbox className="h-3.5 w-3.5" />, color: "#0ea5e9", text: "Reported" };
    case "assigned": return { icon: <UserPlus className="h-3.5 w-3.5" />, color: "#0c7a98", text: `Assigned to ${e.toValue || "someone"}` };
    case "reassigned": return { icon: <Repeat className="h-3.5 w-3.5" />, color: "#f59e0b", text: `Reassigned ${e.fromValue ? `from ${e.fromValue} ` : ""}to ${e.toValue || "someone"}` };
    case "status_changed": return { icon: <RefreshCw className="h-3.5 w-3.5" />, color: "#8b5cf6", text: `Status: ${e.fromValue || "—"} → ${e.toValue || "—"}` };
    case "approved": return { icon: <CheckCircle2 className="h-3.5 w-3.5" />, color: "#22c55e", text: "Approved" };
    case "rejected": return { icon: <XCircle className="h-3.5 w-3.5" />, color: "#ef4444", text: "Rejected" };
    default: return { icon: <Clock className="h-3.5 w-3.5" />, color: "var(--muted)", text: e.type };
  }
};

const countDescendants = (n: CommentNode): number =>
  n.replies.reduce((sum, r) => sum + 1 + countDescendants(r), 0);

const Avatar = ({ name }: { name: string }) => (
  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold" style={{ backgroundColor: "var(--accent-soft)", color: "var(--accent)" }}>
    {(name || "?")[0].toUpperCase()}
  </span>
);

interface CommentItemProps {
  node: CommentNode;
  depth: number;
  currentUserId?: string;
  collapsed: Set<string>;
  replyOpenId: string | null;
  replyText: string;
  posting: boolean;
  onToggleReply: (id: string) => void;
  onChangeReply: (v: string) => void;
  onSubmitReply: (parentId: string) => void;
  onDelete: (id: string) => void;
  onToggleCollapse: (id: string) => void;
}

// Module-scope (stable identity) so the reply textarea never remounts mid-typing.
const CommentItem = ({
  node: c, depth, currentUserId, collapsed, replyOpenId, replyText, posting,
  onToggleReply, onChangeReply, onSubmitReply, onDelete, onToggleCollapse,
}: CommentItemProps) => {
  const canDelete = String(c.author?.id) === String(currentUserId); // author only
  const replyCount = c.replies.length ? countDescendants(c) : 0;
  const isCollapsed = collapsed.has(c.id);

  return (
    <div className="flex gap-3">
      <Avatar name={c.author?.name || "?"} />
      <div className="flex-1 min-w-0">
        <div className="rounded-2xl border px-4 py-3" style={{ borderColor: "var(--border)", backgroundColor: "var(--input)" }}>
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>{c.author?.name || "Unknown"}</span>
            <span className="text-[11px] shrink-0" style={{ color: "var(--muted)" }}>{timeAgo(c.createdAt)}</span>
          </div>
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words" style={{ color: "var(--text)" }}>{c.body}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 mt-1.5 px-1">
          <button onClick={() => onToggleReply(c.id)} className="inline-flex items-center gap-1 text-[11px] font-semibold transition hover:opacity-80" style={{ color: "var(--accent)" }}>
            <CornerDownRight className="h-3 w-3" /> Reply
          </button>
          {replyCount > 0 && (
            <button onClick={() => onToggleCollapse(c.id)} className="inline-flex items-center gap-1 text-[11px] font-semibold transition hover:opacity-80" style={{ color: "var(--muted)" }}>
              {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {isCollapsed ? `Show ${replyCount} ${replyCount === 1 ? "reply" : "replies"}` : "Hide thread"}
            </button>
          )}
          {canDelete && (
            <button onClick={() => onDelete(c.id)} className="inline-flex items-center gap-1 text-[11px] font-medium transition hover:opacity-80" style={{ color: "#ef4444" }}>
              <Trash2 className="h-3 w-3" /> Delete
            </button>
          )}
        </div>

        {replyOpenId === c.id && (
          <div className="mt-2 flex items-end gap-2 animate-slide-down">
            <textarea
              autoFocus
              rows={2}
              placeholder={`Reply to ${c.author?.name || ""}…`}
              className="field px-3 py-2 text-sm resize-y"
              value={replyText}
              onChange={(e) => onChangeReply(e.target.value)}
            />
            <button onClick={() => onSubmitReply(c.id)} disabled={posting || !replyText.trim()} className="btn btn-primary h-10 px-4 text-sm shrink-0">
              {posting ? <span className="ui-spinner h-4 w-4" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        )}

        {c.replies.length > 0 && !isCollapsed && (
          <div className="mt-3 space-y-3 border-l pl-3 sm:pl-4" style={{ borderColor: "var(--border)" }}>
            {c.replies.map((r) => (
              <CommentItem
                key={r.id}
                node={r}
                depth={depth + 1}
                currentUserId={currentUserId}
                collapsed={collapsed}
                replyOpenId={replyOpenId}
                replyText={replyText}
                posting={posting}
                onToggleReply={onToggleReply}
                onChangeReply={onChangeReply}
                onSubmitReply={onSubmitReply}
                onDelete={onDelete}
                onToggleCollapse={onToggleCollapse}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const TicketActivity = ({ ticketId, currentUserId }: Props) => {
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [events, setEvents] = useState<TicketEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [newComment, setNewComment] = useState("");
  const [posting, setPosting] = useState(false);
  const [replyOpenId, setReplyOpenId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

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

  // Build an arbitrary-depth tree from the flat comment list.
  const tree = useMemo<CommentNode[]>(() => {
    const byId = new Map<string, CommentNode>();
    comments.forEach((c) => byId.set(c.id, { ...c, replies: [] as CommentNode[] }));
    const roots: CommentNode[] = [];
    byId.forEach((node) => {
      const pid = node.parentId;
      if (pid && byId.has(pid)) byId.get(pid)!.replies.push(node);
      else roots.push(node);
    });
    return roots;
  }, [comments]);

  const post = async (body: string, parentId?: string) => {
    if (!body.trim()) return;
    setPosting(true);
    setError("");
    try {
      await api.post(`/tickets/${ticketId}/comments`, { body: body.trim(), parentId: parentId || undefined });
      setNewComment("");
      setReplyText("");
      setReplyOpenId(null);
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

  const toggleReply = (id: string) => {
    setReplyOpenId((prev) => (prev === id ? null : id));
    setReplyText("");
  };
  const toggleCollapse = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

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
                  <span className="relative z-10 grid h-6 w-6 shrink-0 place-items-center rounded-full" style={{ backgroundColor: `${m.color}22`, color: m.color }}>
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

        {loading ? null : tree.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--muted)" }}>No comments yet — start the discussion.</p>
        ) : (
          <div className="space-y-5">
            {tree.map((c) => (
              <CommentItem
                key={c.id}
                node={c}
                depth={0}
                currentUserId={currentUserId}
                collapsed={collapsed}
                replyOpenId={replyOpenId}
                replyText={replyText}
                posting={posting}
                onToggleReply={toggleReply}
                onChangeReply={setReplyText}
                onSubmitReply={(parentId) => post(replyText, parentId)}
                onDelete={remove}
                onToggleCollapse={toggleCollapse}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TicketActivity;

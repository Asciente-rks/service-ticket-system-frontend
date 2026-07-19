import { useEffect, useRef, useState } from "react";
import { Sparkles, Send, X, FileText, RefreshCw } from "lucide-react";
import api from "../services/api";
import { getApiErrorMessage } from "../utils/apiError";
import AiMessageBody from "./AiMessageBody";

interface ChatTurn {
  role: "user" | "assistant";
  body: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  ticketId: string;
  ticketTitle?: string;
}

const QUICK_PROMPTS = [
  { label: "Summarize this ticket", icon: FileText, prompt: "" }, // empty -> server default summary
  { label: "What's the current status?", icon: RefreshCw, prompt: "What is the current status of this ticket and what was the latest activity?" },
];

/**
 * Right-side AI assistant drawer for a ticket. Stateless on the server —
 * the mini conversation lives in component state and is passed as history.
 */
const TicketAiAssistant = ({ isOpen, onClose, ticketId, ticketTitle }: Props) => {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Reset the mini-chat whenever a different ticket is opened.
  useEffect(() => {
    setTurns([]);
    setDraft("");
    setError("");
  }, [ticketId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns.length, loading]);

  if (!isOpen) return null;

  const ask = async (question: string) => {
    if (loading) return;
    setError("");
    setLoading(true);

    const display = question.trim() || "Summarize this ticket";
    const history = turns.slice(-10);
    setTurns((prev) => [...prev, { role: "user", body: display }]);

    try {
      const res = await api.post(`/ai/tickets/${ticketId}/ask`, {
        question: question.trim() || undefined,
        history,
      });
      const answer = res.data?.answer || "No answer was generated.";
      setTurns((prev) => [...prev, { role: "assistant", body: answer }]);
    } catch (err: any) {
      setTurns((prev) => prev.slice(0, -1));
      setError(getApiErrorMessage(err, "The AI couldn't answer. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  const send = () => {
    const q = draft.trim();
    if (!q) return;
    setDraft("");
    ask(q);
  };

  return (
    <div
      className="fixed inset-0 z-[130] flex justify-end"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
    >
      <aside
        className="flex h-full w-full max-w-md flex-col shadow-2xl"
        style={{ backgroundColor: "var(--surface)", borderLeft: "1px solid var(--border)", color: "var(--text)" }}
      >
        {/* Header */}
        <header className="flex items-center gap-3 border-b px-4 py-3.5" style={{ borderColor: "var(--border)" }}>
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full" style={{ backgroundColor: "var(--accent-soft)", color: "var(--accent)" }}>
            <Sparkles className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">AI Assistant</p>
            <p className="truncate text-[11px]" style={{ color: "var(--muted)" }}>
              {ticketTitle ? `About: ${ticketTitle}` : "Ask about this ticket"}
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 transition hover:bg-[var(--accent-soft)]" style={{ color: "var(--muted)" }} aria-label="Close AI assistant">
            <X className="h-5 w-5" />
          </button>
        </header>

        {/* Messages */}
        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {turns.length === 0 && !loading && (
            <div className="py-8 text-center">
              <Sparkles className="mx-auto mb-3 h-8 w-8 opacity-30" />
              <p className="text-sm" style={{ color: "var(--muted)" }}>
                I've read this ticket — its description, comments and activity. Ask me anything about it.
              </p>
              <div className="mt-5 space-y-2">
                {QUICK_PROMPTS.map(({ label, icon: Icon, prompt }) => (
                  <button
                    key={label}
                    onClick={() => ask(prompt)}
                    className="flex w-full items-center gap-2.5 rounded-xl border px-4 py-3 text-left text-sm font-medium transition hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]"
                    style={{ borderColor: "var(--border)", backgroundColor: "var(--bg)", color: "var(--text)" }}
                  >
                    <Icon className="h-4 w-4 shrink-0" style={{ color: "var(--accent)" }} />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {turns.map((t, i) => {
            const mine = t.role === "user";
            return (
              <div key={i} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className="max-w-[88%] rounded-2xl px-3.5 py-2.5"
                  style={
                    mine
                      ? { backgroundColor: "var(--accent)", color: "#fff", borderBottomRightRadius: 6 }
                      : { backgroundColor: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)", borderBottomLeftRadius: 6 }
                  }
                >
                  {mine ? (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{t.body}</p>
                  ) : (
                    <AiMessageBody body={t.body} onNavigate={onClose} />
                  )}
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex justify-start">
              <div className="rounded-2xl border px-4 py-3" style={{ backgroundColor: "var(--bg)", borderColor: "var(--border)", borderBottomLeftRadius: 6 }}>
                <span className="flex items-center gap-2 text-sm" style={{ color: "var(--muted)" }}>
                  <span className="ui-spinner h-4 w-4" /> Reading the ticket…
                </span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {error && <div className="px-4 pb-1 text-sm" style={{ color: "#ef4444" }}>{error}</div>}

        {/* Composer */}
        <div className="flex items-end gap-2 border-t p-3" style={{ borderColor: "var(--border)" }}>
          <textarea
            rows={1}
            placeholder="Ask about this ticket…"
            className="field resize-none px-4 py-2.5 text-sm"
            style={{ maxHeight: 100 }}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            disabled={loading}
          />
          <button onClick={send} disabled={loading || !draft.trim()} className="btn btn-primary h-11 shrink-0 px-4 text-sm">
            {loading ? <span className="ui-spinner h-4 w-4" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </aside>
    </div>
  );
};

export default TicketAiAssistant;

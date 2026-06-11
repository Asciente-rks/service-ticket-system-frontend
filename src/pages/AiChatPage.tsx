import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import {
  Send,
  Plus,
  ArrowLeft,
  Sparkles,
  Trash2,
  Pencil,
  Check,
  X,
  Search,
} from "lucide-react";
import api from "../services/api";
import { getApiErrorMessage } from "../utils/apiError";
import AiMessageBody from "../components/AiMessageBody";
import type { AiConversation, AiMessage } from "../types";

// All times displayed in Philippine time (the system's user base).
const PH_TZ = "Asia/Manila";

const timeShort = (iso: string | null): string => {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const dayOf = (x: Date) => x.toLocaleDateString("en-US", { timeZone: PH_TZ });
  if (dayOf(d) === dayOf(now))
    return d.toLocaleTimeString("en-US", { timeZone: PH_TZ, hour: "numeric", minute: "2-digit" });
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays < 7) return d.toLocaleDateString("en-US", { timeZone: PH_TZ, weekday: "short" });
  return d.toLocaleDateString("en-US", { timeZone: PH_TZ, month: "short", day: "numeric" });
};

const SUGGESTIONS = [
  "How many tickets are assigned to me?",
  "Show me all open High priority tickets",
  "Summarize the team's current workload",
  "Which tickets were updated recently?",
];

const AiAvatar = ({ size = 34 }: { size?: number }) => (
  <span
    className="grid shrink-0 place-items-center rounded-full"
    style={{ width: size, height: size, backgroundColor: "var(--accent-soft)", color: "var(--accent)" }}
  >
    <Sparkles style={{ width: size * 0.5, height: size * 0.5 }} />
  </span>
);

const AiChatPage = () => {
  const [conversations, setConversations] = useState<AiConversation[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [search, setSearch] = useState("");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const selected = useMemo(
    () => conversations.find((c) => c.id === selectedId) || null,
    [conversations, selectedId],
  );

  const fetchConversations = useCallback(async () => {
    try {
      const res = await api.get("/ai/conversations");
      setConversations(Array.isArray(res.data) ? res.data : []);
    } catch {
      /* keep prior list */
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, sending, selectedId]);

  const openConversation = async (id: string) => {
    setSelectedId(id);
    setMessages([]);
    setError("");
    setLoadingMessages(true);
    try {
      const res = await api.get(`/ai/conversations/${id}/messages`);
      setMessages(Array.isArray(res.data?.messages) ? res.data.messages : []);
    } catch (err: any) {
      setError(getApiErrorMessage(err, "Couldn't load this conversation."));
    } finally {
      setLoadingMessages(false);
    }
  };

  const newConversation = async () => {
    setError("");
    try {
      const res = await api.post("/ai/conversations", {});
      const convo: AiConversation = res.data;
      setConversations((prev) => [convo, ...prev]);
      setSelectedId(convo.id);
      setMessages([]);
      setTimeout(() => inputRef.current?.focus(), 50);
    } catch (err: any) {
      setError(getApiErrorMessage(err, "Couldn't create a new chat."));
    }
  };

  const send = async (text?: string) => {
    const body = (text ?? draft).trim();
    if (!body || sending) return;

    setError("");
    setSending(true);
    setDraft("");

    // Ensure a conversation exists (sending from the empty state).
    let convoId = selectedId;
    if (!convoId) {
      try {
        const res = await api.post("/ai/conversations", {});
        const convo: AiConversation = res.data;
        setConversations((prev) => [convo, ...prev]);
        setSelectedId(convo.id);
        convoId = convo.id;
      } catch (err: any) {
        setError(getApiErrorMessage(err, "Couldn't start the chat."));
        setSending(false);
        setDraft(body);
        return;
      }
    }

    // Optimistic user bubble.
    const tempId = `temp-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: tempId,
        conversationId: convoId!,
        role: "user",
        body,
        ticketRefs: [],
        meta: null,
        createdAt: new Date().toISOString(),
      },
    ]);

    try {
      const res = await api.post(`/ai/conversations/${convoId}/messages`, { body });
      const { userMessage, assistantMessage, conversation } = res.data || {};
      setMessages((prev) => {
        const withoutTemp = prev.filter((m) => m.id !== tempId);
        return [...withoutTemp, userMessage, assistantMessage].filter(Boolean);
      });
      if (conversation) {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === conversation.id
              ? { ...c, title: conversation.title, lastMessageAt: new Date().toISOString(), lastMessagePreview: assistantMessage?.body?.slice(0, 120) || c.lastMessagePreview }
              : c,
          ),
        );
      }
    } catch (err: any) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setDraft(body);
      setError(getApiErrorMessage(err, "The AI couldn't respond. Please try again."));
    } finally {
      setSending(false);
    }
  };

  const startRename = (c: AiConversation) => {
    setRenamingId(c.id);
    setRenameDraft(c.title);
  };

  const confirmRename = async () => {
    if (!renamingId || !renameDraft.trim()) {
      setRenamingId(null);
      return;
    }
    const title = renameDraft.trim();
    try {
      await api.patch(`/ai/conversations/${renamingId}`, { title });
      setConversations((prev) => prev.map((c) => (c.id === renamingId ? { ...c, title } : c)));
    } catch {
      /* keep old title */
    } finally {
      setRenamingId(null);
    }
  };

  const deleteConversation = async (id: string) => {
    setDeletingId(id);
    try {
      await api.delete(`/ai/conversations/${id}`);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (selectedId === id) {
        setSelectedId(null);
        setMessages([]);
      }
    } catch (err: any) {
      setError(getApiErrorMessage(err, "Couldn't delete the chat."));
    } finally {
      setDeletingId(null);
    }
  };

  const filteredConversations = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        (c.lastMessagePreview || "").toLowerCase().includes(q),
    );
  }, [conversations, search]);

  return (
    <div className="flex" style={{ height: "calc(100dvh - 4rem)", color: "var(--text)" }}>
      {/* Thread list pane */}
      <aside
        className={`${selectedId ? "hidden md:flex" : "flex"} w-full md:w-80 lg:w-96 shrink-0 flex-col border-r`}
        style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}
      >
        <div className="p-4 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center justify-between mb-3">
            <h1 className="flex items-center gap-2 text-lg font-bold tracking-tight">
              <Sparkles className="h-5 w-5" style={{ color: "var(--accent)" }} /> AI Assistant
            </h1>
            <button onClick={newConversation} className="btn btn-primary h-9 px-3 text-sm font-semibold">
              <Plus className="h-4 w-4" /> New
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "var(--muted)" }} />
            <input
              className="field pl-9 pr-3 py-2.5 text-sm"
              placeholder="Search chats…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingList ? (
            <div className="flex items-center justify-center py-16">
              <span className="ui-spinner h-6 w-6" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <Sparkles className="h-8 w-8 mx-auto mb-3 opacity-30" />
              <p className="text-sm" style={{ color: "var(--muted)" }}>
                {search ? "No chats match your search." : "No AI chats yet."}
              </p>
              {!search && (
                <button onClick={newConversation} className="mt-4 text-sm font-semibold" style={{ color: "var(--accent)" }}>
                  Start your first chat
                </button>
              )}
            </div>
          ) : (
            filteredConversations.map((c) => {
              const active = c.id === selectedId;
              const isRenaming = renamingId === c.id;
              return (
                <div
                  key={c.id}
                  className="group relative w-full border-b transition"
                  style={{ borderColor: "var(--border)", backgroundColor: active ? "var(--accent-soft)" : "transparent" }}
                >
                  {isRenaming ? (
                    <div className="flex items-center gap-2 px-4 py-3">
                      <input
                        autoFocus
                        className="field flex-1 px-3 py-1.5 text-sm"
                        value={renameDraft}
                        onChange={(e) => setRenameDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") confirmRename();
                          if (e.key === "Escape") setRenamingId(null);
                        }}
                      />
                      <button onClick={confirmRename} className="p-1.5 rounded-lg" style={{ color: "var(--accent)" }}>
                        <Check className="h-4 w-4" />
                      </button>
                      <button onClick={() => setRenamingId(null)} className="p-1.5 rounded-lg" style={{ color: "var(--muted)" }}>
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => openConversation(c.id)} className="w-full flex items-center gap-3 px-4 py-3 text-left">
                      <AiAvatar />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>{c.title}</span>
                          <span className="text-[10px] shrink-0" style={{ color: "var(--muted)" }}>{timeShort(c.lastMessageAt)}</span>
                        </div>
                        <span className="block text-xs truncate mt-0.5" style={{ color: "var(--muted)" }}>
                          {c.lastMessagePreview || "No messages yet"}
                        </span>
                      </div>
                    </button>
                  )}

                  {!isRenaming && (
                    <div
                      className="absolute right-3 top-1/2 hidden -translate-y-1/2 items-center gap-0.5 rounded-xl border px-1 py-0.5 shadow-sm group-hover:flex"
                      style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
                    >
                      <button
                        onClick={(e) => { e.stopPropagation(); startRename(c); }}
                        className="p-1.5 rounded-lg transition hover:bg-[var(--accent-soft)]"
                        style={{ color: "var(--muted)" }}
                        title="Rename chat"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteConversation(c.id); }}
                        disabled={deletingId === c.id}
                        className="p-1.5 rounded-lg transition hover:bg-[var(--accent-soft)]"
                        style={{ color: "#ef4444" }}
                        title="Delete chat"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* Chat pane */}
      <main className={`${selectedId ? "flex" : "hidden md:flex"} flex-1 flex-col min-w-0`} style={{ backgroundColor: "var(--bg)" }}>
        {!selectedId ? (
          <div className="flex-1 flex flex-col items-center justify-center px-6">
            <AiAvatar size={56} />
            <h2 className="mt-4 text-xl font-bold tracking-tight">Ask the AI about your tickets</h2>
            <p className="mt-1 text-sm text-center max-w-md" style={{ color: "var(--muted)" }}>
              It can count, search and summarize tickets across your organization — and link you straight to them.
            </p>
            <div className="mt-6 grid w-full max-w-lg gap-2 sm:grid-cols-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  disabled={sending}
                  className="rounded-xl border px-4 py-3 text-left text-sm transition hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]"
                  style={{ borderColor: "var(--border)", color: "var(--text)", backgroundColor: "var(--surface)" }}
                >
                  {s}
                </button>
              ))}
            </div>
            {error && <p className="mt-4 text-sm" style={{ color: "#ef4444" }}>{error}</p>}
            {sending && (
              <div className="mt-6 flex items-center gap-2 text-sm" style={{ color: "var(--muted)" }}>
                <span className="ui-spinner h-4 w-4" /> Starting chat…
              </div>
            )}
          </div>
        ) : (
          <>
            <header className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}>
              <button onClick={() => setSelectedId(null)} className="md:hidden p-1.5 rounded-lg" style={{ color: "var(--text)" }}>
                <ArrowLeft className="h-5 w-5" />
              </button>
              <AiAvatar size={36} />
              <div className="min-w-0">
                <p className="text-sm font-bold truncate" style={{ color: "var(--text)" }}>{selected?.title || "AI chat"}</p>
                <p className="text-[11px] truncate" style={{ color: "var(--muted)" }}>
                  Knows your organization's tickets · responses may take a few seconds
                </p>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto px-4 py-5 space-y-3">
              {loadingMessages ? (
                <div className="flex items-center justify-center py-10">
                  <span className="ui-spinner h-6 w-6" />
                </div>
              ) : messages.length === 0 && !sending ? (
                <div className="py-10 text-center">
                  <p className="text-sm" style={{ color: "var(--muted)" }}>Ask anything about your tickets 👇</p>
                  <div className="mx-auto mt-4 grid max-w-lg gap-2 sm:grid-cols-2">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => send(s)}
                        className="rounded-xl border px-4 py-3 text-left text-sm transition hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]"
                        style={{ borderColor: "var(--border)", color: "var(--text)", backgroundColor: "var(--surface)" }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((m) => {
                  const mine = m.role === "user";
                  return (
                    <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"} items-end gap-2`}>
                      {!mine && <AiAvatar size={28} />}
                      <div
                        className="max-w-[82%] rounded-2xl px-4 py-2.5"
                        style={
                          mine
                            ? { backgroundColor: "var(--accent)", color: "#fff", borderBottomRightRadius: 6 }
                            : { backgroundColor: "var(--surface)", color: "var(--text)", border: "1px solid var(--border)", borderBottomLeftRadius: 6 }
                        }
                      >
                        {mine ? (
                          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{m.body}</p>
                        ) : (
                          <AiMessageBody body={m.body} ticketRefs={m.ticketRefs} />
                        )}
                        <span className="mt-1 block text-[10px]" style={{ color: mine ? "rgba(255,255,255,0.7)" : "var(--muted)" }}>
                          {timeShort(m.createdAt)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}

              {sending && (
                <div className="flex items-end gap-2">
                  <AiAvatar size={28} />
                  <div
                    className="rounded-2xl px-4 py-3"
                    style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderBottomLeftRadius: 6 }}
                  >
                    <span className="flex items-center gap-2 text-sm" style={{ color: "var(--muted)" }}>
                      <span className="ui-spinner h-4 w-4" /> Thinking…
                    </span>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {error && <div className="px-4 py-2 text-sm" style={{ color: "#ef4444" }}>{error}</div>}

            <div className="p-3 border-t flex items-end gap-2" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}>
              <textarea
                ref={inputRef}
                rows={1}
                placeholder="Ask about your tickets…"
                className="field px-4 py-2.5 text-sm resize-none"
                style={{ maxHeight: 120 }}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                disabled={sending}
              />
              <button onClick={() => send()} disabled={sending || !draft.trim()} className="btn btn-primary h-11 px-4 text-sm shrink-0">
                {sending ? <span className="ui-spinner h-4 w-4" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default AiChatPage;

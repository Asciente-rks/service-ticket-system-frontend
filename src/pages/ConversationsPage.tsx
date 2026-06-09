import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { Search, Send, Plus, ArrowLeft, MessagesSquare, X, Loader2 } from "lucide-react";
import api from "../services/api";
import { getApiErrorMessage } from "../utils/apiError";
import { getLoggedInUser } from "../utils/auth";
import type { Conversation, ChatMessage, User } from "../types";

const timeShort = (iso: string | null): string => {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
};

const Avatar = ({ name, size = 40 }: { name: string; size?: number }) => (
  <span
    className="grid shrink-0 place-items-center rounded-full font-bold"
    style={{ width: size, height: size, backgroundColor: "var(--accent-soft)", color: "var(--accent)", fontSize: size * 0.4 }}
  >
    {(name || "?")[0].toUpperCase()}
  </span>
);

const ConversationsPage = () => {
  const me = getLoggedInUser();
  const meId = me?.id;

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [search, setSearch] = useState("");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeOther, setActiveOther] = useState<{ id: string; name: string; email: string } | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const [pickerOpen, setPickerOpen] = useState(false);
  const [members, setMembers] = useState<User[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [startingId, setStartingId] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await api.get("/conversations");
      setConversations(Array.isArray(res.data) ? res.data : []);
    } catch {
      /* keep prior list */
    } finally {
      setLoadingList(false);
    }
  }, []);

  const fetchMessages = useCallback(async (id: string, markListRead = false) => {
    try {
      const res = await api.get(`/conversations/${id}/messages`);
      setMessages(Array.isArray(res.data?.messages) ? res.data.messages : []);
      if (res.data?.conversation?.other) setActiveOther(res.data.conversation.other);
      if (markListRead) {
        setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c)));
      }
    } catch (err: any) {
      setError(getApiErrorMessage(err, "Couldn't load messages."));
    }
  }, []);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  // Poll the conversation list (previews + unread + ordering).
  useEffect(() => {
    const id = setInterval(fetchConversations, 12000);
    return () => clearInterval(id);
  }, [fetchConversations]);

  // Poll the open conversation's messages.
  useEffect(() => {
    if (!selectedId) return;
    const id = setInterval(() => fetchMessages(selectedId), 4000);
    return () => clearInterval(id);
  }, [selectedId, fetchMessages]);

  // Auto-scroll to newest message.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, selectedId]);

  const openConversation = async (c: Conversation) => {
    setSelectedId(c.id);
    setActiveOther(c.other);
    setMessages([]);
    setError("");
    setLoadingMessages(true);
    await fetchMessages(c.id, true);
    setLoadingMessages(false);
  };

  const send = async () => {
    if (!draft.trim() || !selectedId) return;
    setSending(true);
    setError("");
    const body = draft.trim();
    setDraft("");
    try {
      const res = await api.post(`/conversations/${selectedId}/messages`, { body });
      setMessages((prev) => [...prev, res.data]);
      fetchConversations();
    } catch (err: any) {
      setError(getApiErrorMessage(err, "Couldn't send your message."));
      setDraft(body);
    } finally {
      setSending(false);
    }
  };

  const openPicker = async () => {
    setPickerOpen(true);
    setMemberSearch("");
    try {
      const res = await api.get("/users");
      setMembers(Array.isArray(res.data) ? res.data : []);
    } catch {
      setMembers([]);
    }
  };

  const startChat = async (userId: string) => {
    setStartingId(userId);
    try {
      const res = await api.post("/conversations", { userId });
      const convo: Conversation = res.data;
      setConversations((prev) => {
        const exists = prev.find((c) => c.id === convo.id);
        return exists ? prev : [convo, ...prev];
      });
      setPickerOpen(false);
      await openConversation(convo);
    } catch (err: any) {
      setError(getApiErrorMessage(err, "Couldn't start the conversation."));
    } finally {
      setStartingId(null);
    }
  };

  const filteredConversations = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter(
      (c) => c.other.name.toLowerCase().includes(q) || c.other.email.toLowerCase().includes(q),
    );
  }, [conversations, search]);

  const filteredMembers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    return members
      .filter((u) => String(u.id) !== String(meId))
      .filter((u) => !q || (u.name || "").toLowerCase().includes(q) || (u.email || "").toLowerCase().includes(q));
  }, [members, memberSearch, meId]);

  return (
    <div className="flex" style={{ height: "calc(100dvh - 4rem)", color: "var(--text)" }}>
      {/* List pane */}
      <aside
        className={`${selectedId ? "hidden md:flex" : "flex"} w-full md:w-80 lg:w-96 shrink-0 flex-col border-r`}
        style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}
      >
        <div className="p-4 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-bold tracking-tight">Conversations</h1>
            <button onClick={openPicker} className="btn btn-primary h-9 px-3 text-sm font-semibold">
              <Plus className="h-4 w-4" /> New
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "var(--muted)" }} />
            <input
              className="field pl-9 pr-3 py-2.5 text-sm"
              placeholder="Search people…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingList ? (
            <div className="flex items-center justify-center py-16"><span className="ui-spinner h-6 w-6" /></div>
          ) : filteredConversations.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <MessagesSquare className="h-8 w-8 mx-auto mb-3 opacity-30" />
              <p className="text-sm" style={{ color: "var(--muted)" }}>
                {search ? "No people match your search." : "No conversations yet."}
              </p>
              {!search && (
                <button onClick={openPicker} className="mt-4 text-sm font-semibold" style={{ color: "var(--accent)" }}>Start a conversation</button>
              )}
            </div>
          ) : (
            filteredConversations.map((c) => {
              const active = c.id === selectedId;
              return (
                <button
                  key={c.id}
                  onClick={() => openConversation(c)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left transition border-b"
                  style={{ borderColor: "var(--border)", backgroundColor: active ? "var(--accent-soft)" : "transparent" }}
                >
                  <Avatar name={c.other.name} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>{c.other.name}</span>
                      <span className="text-[10px] shrink-0" style={{ color: "var(--muted)" }}>{timeShort(c.lastMessageAt)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <span className="text-xs truncate" style={{ color: c.unreadCount ? "var(--text)" : "var(--muted)", fontWeight: c.unreadCount ? 600 : 400 }}>
                        {c.lastMessageText ? (c.lastMessageMine ? `You: ${c.lastMessageText}` : c.lastMessageText) : "No messages yet"}
                      </span>
                      {c.unreadCount > 0 && (
                        <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold text-white shrink-0" style={{ backgroundColor: "var(--accent)" }}>
                          {c.unreadCount > 99 ? "99+" : c.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* Chat pane */}
      <main className={`${selectedId ? "flex" : "hidden md:flex"} flex-1 flex-col min-w-0`} style={{ backgroundColor: "var(--bg)" }}>
        {!selectedId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
            <MessagesSquare className="h-12 w-12 mb-4 opacity-20" />
            <p className="text-sm" style={{ color: "var(--muted)" }}>Select a conversation or start a new one.</p>
          </div>
        ) : (
          <>
            <header className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}>
              <button onClick={() => setSelectedId(null)} className="md:hidden p-1.5 rounded-lg" style={{ color: "var(--text)" }}>
                <ArrowLeft className="h-5 w-5" />
              </button>
              <Avatar name={activeOther?.name || "?"} size={36} />
              <div className="min-w-0">
                <p className="text-sm font-bold truncate" style={{ color: "var(--text)" }}>{activeOther?.name || "Conversation"}</p>
                <p className="text-[11px] truncate" style={{ color: "var(--muted)" }}>{activeOther?.email}</p>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto px-4 py-5 space-y-2.5">
              {loadingMessages ? (
                <div className="flex items-center justify-center py-10"><span className="ui-spinner h-6 w-6" /></div>
              ) : messages.length === 0 ? (
                <p className="text-center text-sm py-10" style={{ color: "var(--muted)" }}>No messages yet — say hello 👋</p>
              ) : (
                messages.map((m) => {
                  const mine = String(m.senderId) === String(meId);
                  return (
                    <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div
                        className="max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words"
                        style={mine
                          ? { backgroundColor: "var(--accent)", color: "#fff", borderBottomRightRadius: 6 }
                          : { backgroundColor: "var(--surface)", color: "var(--text)", border: "1px solid var(--border)", borderBottomLeftRadius: 6 }}
                      >
                        {m.body}
                        <span className="block mt-1 text-[10px]" style={{ color: mine ? "rgba(255,255,255,0.7)" : "var(--muted)" }}>
                          {timeShort(m.createdAt)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            {error && (
              <div className="px-4 py-2 text-sm" style={{ color: "#ef4444" }}>{error}</div>
            )}

            <div className="p-3 border-t flex items-end gap-2" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}>
              <textarea
                rows={1}
                placeholder="Type a message…"
                className="field px-4 py-2.5 text-sm resize-none"
                style={{ maxHeight: 120 }}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
                }}
              />
              <button onClick={send} disabled={sending || !draft.trim()} className="btn btn-primary h-11 px-4 text-sm shrink-0">
                {sending ? <span className="ui-spinner h-4 w-4" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
          </>
        )}
      </main>

      {/* New chat member picker */}
      {pickerOpen && (
        <div className="modal-overlay" style={{ zIndex: 120 }} onMouseDown={(e) => { if (e.target === e.currentTarget) setPickerOpen(false); }}>
          <div className="modal-panel max-w-md w-full rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold tracking-tight" style={{ color: "var(--text)" }}>New conversation</h3>
              <button onClick={() => setPickerOpen(false)} className="p-1.5 rounded-lg" style={{ color: "var(--muted)" }}><X className="h-5 w-5" /></button>
            </div>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "var(--muted)" }} />
              <input autoFocus className="field pl-9 pr-3 py-2.5 text-sm" placeholder="Search a teammate…" value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)} />
            </div>
            <div className="max-h-72 overflow-y-auto -mx-2">
              {filteredMembers.length === 0 ? (
                <p className="text-sm text-center py-8" style={{ color: "var(--muted)" }}>No teammates found.</p>
              ) : (
                filteredMembers.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => startChat(String(u.id))}
                    disabled={!!startingId}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition hover:bg-[var(--accent-soft)]"
                  >
                    <Avatar name={u.name || u.email} size={36} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>{u.name || "Member"}</p>
                      <p className="text-[11px] truncate" style={{ color: "var(--muted)" }}>{u.email}</p>
                    </div>
                    {startingId === String(u.id) && <Loader2 className="h-4 w-4 animate-spin" style={{ color: "var(--accent)" }} />}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConversationsPage;

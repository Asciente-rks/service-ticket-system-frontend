import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { Search, Send, Plus, ArrowLeft, MessagesSquare, X, Loader2, AtSign, Info, Ticket as TicketIcon, FolderKanban } from "lucide-react";
import api from "../services/api";
import { getApiErrorMessage } from "../utils/apiError";
import { getLoggedInUser } from "../utils/auth";
import type { Conversation, ChatMessage, User, Role, Collection } from "../types";
import DmMessageBody from "../components/DmMessageBody";

interface MentionItem {
  kind: "ticket" | "collection";
  id: string;
  label: string;
  sub?: string;
}

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

  // @-commands: reference data + mention dropdown state.
  const [roles, setRoles] = useState<Role[]>([]);
  const [orgTickets, setOrgTickets] = useState<{ id: string; title: string; status?: string; collectionName?: string | null }[]>([]);
  const [orgCollections, setOrgCollections] = useState<Collection[]>([]);
  const [mention, setMention] = useState<{ start: number; end: number; query: string } | null>(null);
  const [mentionIdx, setMentionIdx] = useState(0);
  const [pendingRefs, setPendingRefs] = useState<{ display: string; token: string }[]>([]);
  const [commandsOpen, setCommandsOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  // Reference data for @-commands and the contact card (members + roles).
  useEffect(() => {
    let active = true;
    Promise.allSettled([
      api.get("/tickets"),
      api.get("/collections"),
      api.get("/users"),
      api.get("/users/roles"),
    ]).then(([tRes, cRes, uRes, rRes]) => {
      if (!active) return;
      if (tRes.status === "fulfilled" && Array.isArray(tRes.value.data)) {
        setOrgTickets(
          tRes.value.data.map((t: any) => ({
            id: t.id,
            title: t.title,
            status: typeof t.status === "string" ? t.status : t.status?.name,
            collectionName: t.collectionName || null,
          })),
        );
      }
      if (cRes.status === "fulfilled" && Array.isArray(cRes.value.data)) setOrgCollections(cRes.value.data);
      if (uRes.status === "fulfilled" && Array.isArray(uRes.value.data)) setMembers(uRes.value.data);
      if (rRes.status === "fulfilled" && Array.isArray(rRes.value.data)) setRoles(rRes.value.data);
    });
    return () => {
      active = false;
    };
  }, []);

  // Mention suggestions for the text after "@".
  const mentionItems = useMemo((): MentionItem[] => {
    if (!mention) return [];
    const q = mention.query.trim().toLowerCase();
    const tickets = orgTickets
      .filter((t) => !q || t.title.toLowerCase().includes(q))
      .slice(0, 6)
      .map((t): MentionItem => ({
        kind: "ticket",
        id: t.id,
        label: t.title,
        sub: [t.status, t.collectionName].filter(Boolean).join(" · "),
      }));
    const cols = orgCollections
      .filter((c) => !q || c.name.toLowerCase().includes(q))
      .slice(0, 3)
      .map((c): MentionItem => ({
        kind: "collection",
        id: c.id,
        label: c.name,
        sub: `${c.ticketCount} ${c.ticketCount === 1 ? "ticket" : "tickets"}`,
      }));
    return [...tickets, ...cols];
  }, [mention, orgTickets, orgCollections]);

  /** Locate an active "@query" immediately before the caret. */
  const detectMention = (text: string, caret: number) => {
    const upto = text.slice(0, caret);
    const at = upto.lastIndexOf("@");
    if (at === -1) return null;
    if (at > 0 && !/[\s]/.test(upto[at - 1])) return null;
    const query = upto.slice(at + 1);
    if (query.includes("\n") || query.length > 60) return null;
    return { start: at, end: caret, query };
  };

  const handleDraftChange = (value: string, caret: number) => {
    setDraft(value);
    const m = detectMention(value, caret);
    setMention(m);
    setMentionIdx(0);
  };

  const insertMention = (item: MentionItem) => {
    if (!mention) return;
    const display = item.label;
    const before = draft.slice(0, mention.start);
    const after = draft.slice(mention.end);
    setDraft(`${before}@${display} ${after}`);
    setPendingRefs((prev) => [
      ...prev,
      { display, token: `[${item.kind}:${item.id}|${display}]` },
    ]);
    setMention(null);
    setTimeout(() => composerRef.current?.focus(), 30);
  };

  /** Swap "@Title" placeholders for their reference tokens before sending. */
  const applyMentions = (text: string): string => {
    let out = text;
    const refs = [...pendingRefs].sort((a, b) => b.display.length - a.display.length);
    for (const ref of refs) {
      const needle = `@${ref.display}`;
      const idx = out.indexOf(needle);
      if (idx !== -1) out = out.slice(0, idx) + ref.token + out.slice(idx + needle.length);
    }
    return out;
  };

  const activeOtherRole = useMemo(() => {
    if (!activeOther) return "Member";
    const member = members.find((u) => String(u.id).toLowerCase() === String(activeOther.id).toLowerCase());
    if (!member?.roleId) return "Member";
    return roles.find((r) => String(r.id).toLowerCase() === String(member.roleId).toLowerCase())?.name || "Member";
  }, [activeOther, members, roles]);

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
    const raw = draft.trim();
    const body = applyMentions(raw);
    setDraft("");
    setMention(null);
    setPendingRefs([]);
    try {
      const res = await api.post(`/conversations/${selectedId}/messages`, { body });
      setMessages((prev) => [...prev, res.data]);
      fetchConversations();
    } catch (err: any) {
      setError(getApiErrorMessage(err, "Couldn't send your message."));
      setDraft(raw);
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
              <div className="ml-auto flex shrink-0 items-center gap-1.5">
                <button
                  onClick={() => setCommandsOpen(true)}
                  className="grid h-9 w-9 place-items-center rounded-full border transition hover:bg-[var(--accent-soft)]"
                  style={{ borderColor: "var(--border)", color: "var(--accent)" }}
                  title="@ commands"
                >
                  <AtSign className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setInfoOpen(true)}
                  className="grid h-9 w-9 place-items-center rounded-full border transition hover:bg-[var(--accent-soft)]"
                  style={{ borderColor: "var(--border)", color: "var(--muted)" }}
                  title={`About ${activeOther?.name || "this member"}`}
                >
                  <Info className="h-4 w-4" />
                </button>
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
                        className="max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed break-words"
                        style={mine
                          ? { backgroundColor: "var(--accent)", color: "#fff", borderBottomRightRadius: 6 }
                          : { backgroundColor: "var(--surface)", color: "var(--text)", border: "1px solid var(--border)", borderBottomLeftRadius: 6 }}
                      >
                        <DmMessageBody body={m.body} mine={mine} />
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

            <div className="relative p-3 border-t flex items-end gap-2" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}>
              {mention && mentionItems.length > 0 && (
                <div
                  className="absolute bottom-full left-3 right-3 mb-2 max-h-72 overflow-auto rounded-2xl border p-1 shadow-2xl"
                  style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)", zIndex: 30 }}
                >
                  <p className="px-3 pb-1 pt-2 text-[10px] font-black uppercase tracking-widest" style={{ color: "var(--muted)" }}>
                    Reference — {mention.query ? `"${mention.query}"` : "type to filter"}
                  </p>
                  {mentionItems.map((item, i) => (
                    <button
                      key={`${item.kind}-${item.id}`}
                      onMouseDown={(e) => { e.preventDefault(); insertMention(item); }}
                      className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left transition dropdown-option ${i === mentionIdx ? "selected" : ""}`}
                      style={{ color: "var(--text)" }}
                    >
                      {item.kind === "ticket" ? (
                        <TicketIcon className="h-4 w-4 shrink-0" style={{ color: "var(--accent)" }} />
                      ) : (
                        <FolderKanban className="h-4 w-4 shrink-0" style={{ color: "var(--accent)" }} />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{item.label}</span>
                        {item.sub && <span className="block truncate text-[11px]" style={{ color: "var(--muted)" }}>{item.sub}</span>}
                      </span>
                      <span className="shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase" style={{ backgroundColor: "var(--accent-soft)", color: "var(--accent)" }}>
                        {item.kind}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              <textarea
                ref={composerRef}
                rows={1}
                placeholder="Type a message… use @ to reference a ticket"
                className="field px-4 py-2.5 text-sm resize-none"
                style={{ maxHeight: 120 }}
                value={draft}
                onChange={(e) => handleDraftChange(e.target.value, e.target.selectionStart ?? e.target.value.length)}
                onKeyDown={(e) => {
                  if (mention && mentionItems.length > 0) {
                    if (e.key === "ArrowDown") { e.preventDefault(); setMentionIdx((i) => (i + 1) % mentionItems.length); return; }
                    if (e.key === "ArrowUp") { e.preventDefault(); setMentionIdx((i) => (i - 1 + mentionItems.length) % mentionItems.length); return; }
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); insertMention(mentionItems[mentionIdx]); return; }
                    if (e.key === "Escape") { setMention(null); return; }
                  }
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
                }}
                onBlur={() => setTimeout(() => setMention(null), 150)}
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

      {/* @ commands reference */}
      {commandsOpen && (
        <div className="modal-overlay" style={{ zIndex: 120 }} onMouseDown={(e) => { if (e.target === e.currentTarget) setCommandsOpen(false); }}>
          <div className="modal-panel max-w-md w-full rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="flex items-center gap-2 text-lg font-bold tracking-tight" style={{ color: "var(--text)" }}>
                <AtSign className="h-5 w-5" style={{ color: "var(--accent)" }} /> @ Commands
              </h3>
              <button onClick={() => setCommandsOpen(false)} className="p-1.5 rounded-lg" style={{ color: "var(--muted)" }}><X className="h-5 w-5" /></button>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3 rounded-2xl border p-3.5" style={{ borderColor: "var(--border)", backgroundColor: "var(--bg)" }}>
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl" style={{ backgroundColor: "var(--accent-soft)", color: "var(--accent)" }}>
                  <TicketIcon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold" style={{ color: "var(--text)" }}>@ + ticket title</p>
                  <p className="mt-0.5 text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
                    Reference a ticket. It's sent as a clickable button that takes your teammate straight to that ticket's details on its board.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl border p-3.5" style={{ borderColor: "var(--border)", backgroundColor: "var(--bg)" }}>
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl" style={{ backgroundColor: "var(--accent-soft)", color: "var(--accent)" }}>
                  <FolderKanban className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold" style={{ color: "var(--text)" }}>@ + collection name</p>
                  <p className="mt-0.5 text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
                    Link a whole collection. Sends a button that opens that project's ticket dashboard.
                  </p>
                </div>
              </div>
            </div>

            <p className="mt-4 rounded-xl px-3.5 py-2.5 text-xs leading-relaxed" style={{ backgroundColor: "var(--accent-soft)", color: "var(--accent)" }}>
              Tip: type <span className="font-bold">@</span> in the message box, keep typing to filter, then pick from the suggestions (↑ ↓ and Enter work too).
            </p>
          </div>
        </div>
      )}

      {/* Contact card */}
      {infoOpen && activeOther && (
        <div className="modal-overlay" style={{ zIndex: 120 }} onMouseDown={(e) => { if (e.target === e.currentTarget) setInfoOpen(false); }}>
          <div className="modal-panel max-w-sm w-full rounded-3xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold tracking-tight" style={{ color: "var(--text)" }}>Member details</h3>
              <button onClick={() => setInfoOpen(false)} className="p-1.5 rounded-lg" style={{ color: "var(--muted)" }}><X className="h-5 w-5" /></button>
            </div>

            <div className="flex flex-col items-center text-center">
              <Avatar name={activeOther.name} size={72} />
              <p className="mt-3 text-lg font-bold" style={{ color: "var(--text)" }}>{activeOther.name}</p>
              <span className="mt-1 rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-widest" style={{ borderColor: "var(--accent)", color: "var(--accent)" }}>
                {activeOtherRole}
              </span>
            </div>

            <div className="mt-5 space-y-2">
              <div className="rounded-xl border px-4 py-3" style={{ borderColor: "var(--border)", backgroundColor: "var(--bg)" }}>
                <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "var(--muted)" }}>Email</p>
                <p className="mt-0.5 truncate text-sm font-semibold" style={{ color: "var(--text)" }}>{activeOther.email}</p>
              </div>
              <div className="rounded-xl border px-4 py-3" style={{ borderColor: "var(--border)", backgroundColor: "var(--bg)" }}>
                <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "var(--muted)" }}>Role</p>
                <p className="mt-0.5 text-sm font-semibold" style={{ color: "var(--text)" }}>{activeOtherRole}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConversationsPage;

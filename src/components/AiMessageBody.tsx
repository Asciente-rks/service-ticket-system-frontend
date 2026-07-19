import { useMemo, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import { Ticket as TicketIcon, ArrowUpRight } from "lucide-react";
import type { AiTicketRef } from "../types";

/**
 * Renders an AI assistant message:
 * - [ticket:<uuid>|<title>] tokens become inline clickable ticket links
 * - light markdown: **bold**, *italic*, `code`, bullet lists, headings
 * - ticketRefs not mentioned inline render as chip buttons below the text
 *
 * Clicking a ticket navigates to /dashboard?ticketId=<id>, which opens the
 * ticket detail modal (same mechanism the notification click-through uses).
 *
 * Rendering is line-based: ticket tokens never span lines, so each line is
 * split into text/ticket segments and text segments get inline markdown.
 */

const TICKET_TOKEN = /\[ticket:([0-9a-fA-F-]{36})\|([^\]]{1,300})\]/g;

const escapeHtml = (s: string): string =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/** Inline markdown (bold/italic/code) on already-escaped text. */
const inlineMd = (s: string): string =>
  s
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>")
    .replace(
      /`([^`]+)`/g,
      '<code style="background:var(--accent-soft);padding:1px 5px;border-radius:6px;font-size:0.85em;">$1</code>',
    );

type InlineSeg = { type: "text"; text: string } | { type: "ticket"; id: string; title: string };

const splitInline = (line: string): InlineSeg[] => {
  const segs: InlineSeg[] = [];
  let last = 0;
  TICKET_TOKEN.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TICKET_TOKEN.exec(line)) !== null) {
    if (m.index > last) segs.push({ type: "text", text: line.slice(last, m.index) });
    segs.push({ type: "ticket", id: m[1], title: m[2] });
    last = m.index + m[0].length;
  }
  if (last < line.length) segs.push({ type: "text", text: line.slice(last) });
  return segs;
};

type LineBlock =
  | { kind: "bullet"; segs: InlineSeg[] }
  | { kind: "numbered"; num: string; segs: InlineSeg[] }
  | { kind: "heading"; segs: InlineSeg[] }
  | { kind: "divider" }
  | { kind: "text"; segs: InlineSeg[] }
  | { kind: "gap" };

/** Section-header-ish line: fully bold, or a short label ending with ":". */
const isHeadingLine = (line: string): boolean => {
  if (/^\*\*[^*]+\*\*:?\s*$/.test(line)) return true;
  if (line.length <= 48 && /:$/.test(line) && !line.includes("[ticket:")) return true;
  return false;
};

const toBlocks = (body: string): LineBlock[] => {
  return body.split("\n").map((rawLine): LineBlock => {
    const line = rawLine.trim();
    if (line === "") return { kind: "gap" };
    if (/^[-*_]{3,}$/.test(line)) return { kind: "divider" };
    if (/^[-*•]\s+/.test(line)) return { kind: "bullet", segs: splitInline(line.replace(/^[-*•]\s+/, "")) };
    const numbered = line.match(/^(\d{1,3})[.)]\s+(.*)$/);
    if (numbered) return { kind: "numbered", num: numbered[1], segs: splitInline(numbered[2]) };
    if (/^#{1,4}\s+/.test(line)) return { kind: "heading", segs: splitInline(line.replace(/^#{1,4}\s+/, "")) };
    if (isHeadingLine(line)) return { kind: "heading", segs: splitInline(line) };
    return { kind: "text", segs: splitInline(line) };
  });
};

const ticketUrl = (id: string, collectionId?: string | null) =>
  collectionId ? `/dashboard?collection=${collectionId}&ticketId=${id}` : `/dashboard?ticketId=${id}`;

export const TicketChip = ({
  ticket,
  onOpen,
  onOpenTicket,
}: {
  ticket: AiTicketRef;
  onOpen?: () => void;
  onOpenTicket?: (id: string, collectionId?: string | null) => void;
}) => {
  const navigate = useNavigate();
  const priorityColor =
    ticket.priority === "High"
      ? "#ef4444"
      : ticket.priority === "Medium"
        ? "#f59e0b"
        : ticket.priority === "Low"
          ? "#10b981"
          : "var(--muted)";

  return (
    <button
      onClick={() => {
        onOpen?.();
        // Prefer opening as an overlay (e.g. inside the AI chat) instead of
        // navigating away; fall back to navigation when no handler is provided.
        if (onOpenTicket) onOpenTicket(ticket.id, ticket.collectionId);
        else navigate(ticketUrl(ticket.id, ticket.collectionId));
      }}
      className="flex w-full items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]"
      style={{ borderColor: "var(--border)", backgroundColor: "var(--bg)" }}
      title={`Open ticket: ${ticket.title}`}
    >
      <TicketIcon className="h-4 w-4 shrink-0" style={{ color: "var(--accent)" }} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-semibold" style={{ color: "var(--text)" }}>
          {ticket.title}
        </span>
        {(ticket.status || ticket.priority) && (
          <span className="mt-0.5 flex items-center gap-2 text-[10px]" style={{ color: "var(--muted)" }}>
            {ticket.status && <span>{ticket.status}</span>}
            {ticket.priority && (
              <span className="font-bold" style={{ color: priorityColor }}>
                {ticket.priority}
              </span>
            )}
          </span>
        )}
      </span>
      <ArrowUpRight className="h-3.5 w-3.5 shrink-0 opacity-60" style={{ color: "var(--muted)" }} />
    </button>
  );
};

const InlineTicketLink = ({
  id,
  title,
  collectionId,
  onNavigate,
  onOpenTicket,
}: {
  id: string;
  title: string;
  collectionId?: string | null;
  onNavigate?: () => void;
  onOpenTicket?: (id: string, collectionId?: string | null) => void;
}) => {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => {
        onNavigate?.();
        if (onOpenTicket) onOpenTicket(id, collectionId);
        else navigate(ticketUrl(id, collectionId));
      }}
      className="inline-flex max-w-full items-center gap-1 rounded-lg border px-1.5 py-0.5 align-baseline text-xs font-semibold transition hover:bg-[var(--accent-soft)]"
      style={{ borderColor: "var(--accent)", color: "var(--accent)", margin: "0 2px", verticalAlign: "baseline" }}
      title={`Open ticket: ${title}`}
    >
      <TicketIcon className="h-3 w-3 shrink-0" />
      <span className="max-w-[240px] truncate">{title}</span>
    </button>
  );
};

const InlineSegments = ({
  segs,
  collectionOf,
  onNavigate,
  onOpenTicket,
}: {
  segs: InlineSeg[];
  collectionOf?: Map<string, string>;
  onNavigate?: () => void;
  onOpenTicket?: (id: string, collectionId?: string | null) => void;
}) => (
  <>
    {segs.map((seg, i) =>
      seg.type === "ticket" ? (
        <InlineTicketLink key={i} id={seg.id} title={seg.title} collectionId={collectionOf?.get(seg.id)} onNavigate={onNavigate} onOpenTicket={onOpenTicket} />
      ) : (
        <span key={i} dangerouslySetInnerHTML={{ __html: inlineMd(escapeHtml(seg.text)) }} />
      ),
    )}
  </>
);

const AiMessageBody = ({
  body,
  ticketRefs = [],
  onNavigate,
  onOpenTicket,
}: {
  body: string;
  ticketRefs?: AiTicketRef[];
  onNavigate?: () => void;
  onOpenTicket?: (id: string, collectionId?: string | null) => void;
}) => {
  const blocks = useMemo(() => toBlocks(body), [body]);

  const inlineIds = useMemo(() => {
    const ids = new Set<string>();
    for (const b of blocks) {
      if (b.kind === "gap" || b.kind === "divider") continue;
      for (const s of b.segs) if (s.type === "ticket") ids.add(s.id);
    }
    return ids;
  }, [blocks]);

  const chipRefs = ticketRefs.filter((r) => !inlineIds.has(r.id)).slice(0, 8);

  const collectionOf = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of ticketRefs) if (r.collectionId) map.set(r.id, String(r.collectionId));
    return map;
  }, [ticketRefs]);

  return (
    <div>
      <div className="text-sm leading-relaxed break-words">
        {blocks.map((block, i) => {
          if (block.kind === "gap") {
            // Collapse runs of blank lines into a single spacer.
            const prev = blocks[i - 1];
            if (!prev || prev.kind === "gap") return null;
            return <div key={i} style={{ height: 6 }} />;
          }
          if (block.kind === "divider") {
            return <div key={i} style={{ height: 1, backgroundColor: "var(--border)", margin: "8px 0" }} />;
          }
          if (block.kind === "bullet") {
            return (
              <div key={i} className="flex gap-2" style={{ margin: "3px 0", paddingLeft: 8 }}>
                <span className="shrink-0 select-none" style={{ color: "var(--accent)" }}>•</span>
                <span className="min-w-0 flex-1">
                  <InlineSegments segs={block.segs} collectionOf={collectionOf} onNavigate={onNavigate} onOpenTicket={onOpenTicket} />
                </span>
              </div>
            );
          }
          if (block.kind === "numbered") {
            return (
              <div key={i} className="flex gap-2" style={{ margin: "3px 0", paddingLeft: 8 }}>
                <span className="shrink-0 select-none text-xs font-bold" style={{ color: "var(--accent)", minWidth: 16, paddingTop: 2 }}>
                  {block.num}.
                </span>
                <span className="min-w-0 flex-1">
                  <InlineSegments segs={block.segs} collectionOf={collectionOf} onNavigate={onNavigate} onOpenTicket={onOpenTicket} />
                </span>
              </div>
            );
          }
          if (block.kind === "heading") {
            const prev = blocks[i - 1];
            return (
              <p key={i} className="font-bold" style={{ margin: prev && prev.kind !== "gap" ? "10px 0 3px" : "2px 0 3px" }}>
                <InlineSegments segs={block.segs} collectionOf={collectionOf} onNavigate={onNavigate} onOpenTicket={onOpenTicket} />
              </p>
            );
          }
          return (
            <p key={i} style={{ margin: "2px 0" }}>
              <InlineSegments segs={block.segs} collectionOf={collectionOf} onNavigate={onNavigate} onOpenTicket={onOpenTicket} />
            </p>
          );
        })}
      </div>

      {chipRefs.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {chipRefs.map((r) => (
            <Fragment key={r.id}>
              <TicketChip ticket={r} onOpen={onNavigate} onOpenTicket={onOpenTicket} />
            </Fragment>
          ))}
        </div>
      )}
    </div>
  );
};

export default AiMessageBody;

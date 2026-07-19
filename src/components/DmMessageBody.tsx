import { Fragment } from "react";
import { useNavigate } from "react-router-dom";
import { Ticket as TicketIcon, FolderKanban, ArrowUpRight } from "lucide-react";

/**
 * Renders a direct-message body. Plain text is preserved as-is (newlines
 * included); embedded reference tokens become action buttons:
 *   [ticket:<uuid>|<title>]      → opens the ticket (its board resolves automatically)
 *   [collection:<uuid>|<name>]   → opens that collection's dashboard
 * Tokens are produced by the @-command picker in the composer.
 */

const REF_TOKEN = /\[(ticket|collection):([0-9a-fA-F-]{36})\|([^\]]{1,300})\]/g;

type Seg =
  | { type: "text"; text: string }
  | { type: "ref"; kind: "ticket" | "collection"; id: string; label: string };

const splitSegments = (body: string): Seg[] => {
  const segs: Seg[] = [];
  let last = 0;
  REF_TOKEN.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = REF_TOKEN.exec(body)) !== null) {
    if (m.index > last) segs.push({ type: "text", text: body.slice(last, m.index) });
    segs.push({ type: "ref", kind: m[1] as "ticket" | "collection", id: m[2], label: m[3] });
    last = m.index + m[0].length;
  }
  if (last < body.length) segs.push({ type: "text", text: body.slice(last) });
  return segs;
};

const DmMessageBody = ({ body, mine }: { body: string; mine: boolean }) => {
  const navigate = useNavigate();
  const segs = splitSegments(body);

  const chipStyle = mine
    ? { backgroundColor: "rgba(255,255,255,0.16)", border: "1px solid rgba(255,255,255,0.45)", color: "#fff" }
    : { backgroundColor: "var(--accent-soft)", border: "1px solid var(--accent)", color: "var(--accent)" };

  return (
    <span className="whitespace-pre-wrap break-words">
      {segs.map((seg, i) =>
        seg.type === "text" ? (
          <Fragment key={i}>{seg.text}</Fragment>
        ) : (
          <button
            key={i}
            onClick={() =>
              navigate(
                seg.kind === "ticket"
                  ? `/dashboard?ticketId=${seg.id}`
                  : `/dashboard?collection=${seg.id}`,
              )
            }
            className="mx-0.5 inline-flex max-w-full items-center gap-1 rounded-lg px-1.5 py-0.5 align-baseline text-xs font-semibold transition hover:opacity-80"
            style={chipStyle}
            title={seg.kind === "ticket" ? `Open ticket: ${seg.label}` : `Open collection: ${seg.label}`}
          >
            {seg.kind === "ticket" ? (
              <TicketIcon className="h-3 w-3 shrink-0" />
            ) : (
              <FolderKanban className="h-3 w-3 shrink-0" />
            )}
            <span className="max-w-[220px] truncate">{seg.label}</span>
            <ArrowUpRight className="h-2.5 w-2.5 shrink-0 opacity-70" />
          </button>
        ),
      )}
    </span>
  );
};

export default DmMessageBody;

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search, Layers, Check } from "lucide-react";
import type { PlatformVersion } from "../types";

interface Props {
  options: PlatformVersion[];
  value: string | null;
  onChange: (id: string | null) => void;
  disabled?: boolean;
  loading?: boolean;
  emptyHint?: string;
}

/**
 * Searchable single-select for a ticket's platform/version, drawn from the
 * parent collection's curated list. Search keeps it usable as versioning
 * scales. Includes a "No platform/version" option to clear the choice.
 */
const PlatformVersionSelect = ({
  options,
  value,
  onChange,
  disabled,
  loading,
  emptyHint = "No platforms/versions for this collection yet.",
}: Props) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 30);
    else setQuery("");
  }, [open]);

  const selected = useMemo(
    () => options.find((o) => String(o.id) === String(value)) || null,
    [options, value],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.platform.toLowerCase().includes(q) ||
        o.version.toLowerCase().includes(q) ||
        o.label.toLowerCase().includes(q),
    );
  }, [options, query]);

  const labelFor = (o: PlatformVersion) => `${o.platform} · ${o.version}`;

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((p) => !p)}
        className="field flex w-full items-center justify-between gap-2 px-4 py-3 text-left outline-none disabled:opacity-60"
        style={{ backgroundColor: "var(--input)", border: "1px solid var(--border)", color: "var(--input-text)" }}
      >
        <span className="flex min-w-0 flex-1 items-center gap-1.5">
          <Layers className="h-4 w-4 shrink-0" style={{ color: "var(--muted)" }} />
          <span className="truncate">
            {loading ? "Loading…" : selected ? labelFor(selected) : "No platform/version"}
          </span>
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} style={{ color: "var(--muted)" }} />
      </button>

      {open && (
        <div
          className="dropdown-menu absolute left-0 right-0 z-30 mt-2 overflow-hidden rounded-2xl border shadow-2xl"
          style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
        >
          <div className="relative border-b p-2" style={{ borderColor: "var(--border)" }}>
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "var(--muted)" }} />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search platform or version…"
              className="field w-full py-2 pl-9 pr-3 text-sm"
            />
          </div>
          <div className="max-h-56 overflow-auto p-1">
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition dropdown-option ${!value ? "selected" : ""}`}
              style={{ color: "var(--muted)" }}
            >
              <span className="grid h-4 w-4 shrink-0 place-items-center">{!value && <Check className="h-3.5 w-3.5" style={{ color: "var(--accent)" }} />}</span>
              No platform/version
            </button>

            {options.length === 0 ? (
              <p className="px-3 py-4 text-center text-xs" style={{ color: "var(--muted)" }}>{emptyHint}</p>
            ) : filtered.length === 0 ? (
              <p className="px-3 py-4 text-center text-sm" style={{ color: "var(--muted)" }}>No matches for “{query}”.</p>
            ) : (
              filtered.map((o) => {
                const checked = String(o.id) === String(value);
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => {
                      onChange(String(o.id));
                      setOpen(false);
                    }}
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition dropdown-option ${checked ? "selected" : ""}`}
                    style={{ color: "var(--text)" }}
                  >
                    <span className="grid h-4 w-4 shrink-0 place-items-center">{checked && <Check className="h-3.5 w-3.5" style={{ color: "var(--accent)" }} />}</span>
                    <span className="min-w-0 flex-1">
                      <span className="font-medium">{o.platform}</span>
                      <span className="ml-1.5 rounded px-1.5 py-0.5 text-[10px] font-bold" style={{ backgroundColor: "var(--accent-soft)", color: "var(--accent)" }}>
                        {o.version}
                      </span>
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PlatformVersionSelect;

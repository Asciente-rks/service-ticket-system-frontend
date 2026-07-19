import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search, X, Check, Users } from "lucide-react";
import type { User } from "../types";

interface Props {
  users: User[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  loading?: boolean;
  placeholder?: string;
}

/**
 * Searchable multi-select for ticket assignees. Scales to large teams via a
 * built-in search box; selected members render as removable chips. The first
 * selected member is treated as the primary assignee by the backend.
 */
const AssigneeMultiSelect = ({
  users,
  selectedIds,
  onChange,
  disabled,
  loading,
  placeholder = "Select assignees",
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

  const selectedSet = useMemo(() => new Set(selectedIds.map(String)), [selectedIds]);
  const selectedUsers = useMemo(
    () => users.filter((u) => selectedSet.has(String(u.id))),
    [users, selectedSet],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) || (u.email || "").toLowerCase().includes(q),
    );
  }, [users, query]);

  const toggle = (id: string) => {
    const key = String(id);
    if (selectedSet.has(key)) onChange(selectedIds.filter((x) => String(x) !== key));
    else onChange([...selectedIds, key]);
  };

  const remove = (id: string) => onChange(selectedIds.filter((x) => String(x) !== String(id)));

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
          <Users className="h-4 w-4 shrink-0" style={{ color: "var(--muted)" }} />
          <span className="truncate">
            {loading
              ? "Loading…"
              : selectedUsers.length === 0
              ? placeholder
              : `${selectedUsers.length} assignee${selectedUsers.length > 1 ? "s" : ""} selected`}
          </span>
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} style={{ color: "var(--muted)" }} />
      </button>

      {selectedUsers.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {selectedUsers.map((u, i) => (
            <span
              key={u.id}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold"
              style={{ backgroundColor: "var(--accent-soft)", color: "var(--accent)" }}
              title={i === 0 ? "Primary assignee" : u.email}
            >
              {i === 0 && <span className="text-[9px] font-black uppercase opacity-70">Primary</span>}
              {u.name}
              <button
                type="button"
                onClick={() => remove(u.id)}
                className="rounded-full p-0.5 transition hover:bg-black/10"
                aria-label={`Remove ${u.name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

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
              placeholder="Search people…"
              className="field w-full py-2 pl-9 pr-3 text-sm"
            />
          </div>
          <div className="max-h-56 overflow-auto p-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-center text-sm" style={{ color: "var(--muted)" }}>
                No people match “{query}”.
              </p>
            ) : (
              filtered.map((u) => {
                const checked = selectedSet.has(String(u.id));
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => toggle(u.id)}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm transition dropdown-option ${checked ? "selected" : ""}`}
                    style={{ color: "var(--text)" }}
                  >
                    <span
                      className="grid h-4 w-4 shrink-0 place-items-center rounded border"
                      style={{
                        borderColor: checked ? "var(--accent)" : "var(--border)",
                        backgroundColor: checked ? "var(--accent)" : "transparent",
                      }}
                    >
                      {checked && <Check className="h-3 w-3" style={{ color: "#fff" }} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{u.name}</span>
                      <span className="block truncate text-[11px]" style={{ color: "var(--muted)" }}>{u.email}</span>
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

export default AssigneeMultiSelect;

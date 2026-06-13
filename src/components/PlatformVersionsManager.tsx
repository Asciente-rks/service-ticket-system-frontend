import { useEffect, useMemo, useState } from "react";
import { Layers, Plus, Pencil, Trash2, X, Check, Search } from "lucide-react";
import api from "../services/api";
import { getApiErrorMessage } from "../utils/apiError";
import ConfirmDialog from "./ConfirmDialog";
import type { Collection, PlatformVersion } from "../types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  collection: Collection;
  canManage: boolean;
}

/**
 * Per-collection catalog of platform/version entries (e.g. "Web · 1.1.0").
 * Admins curate the list here; members then pick from it when creating or
 * updating a ticket. Includes search so the list stays usable as builds scale.
 */
const PlatformVersionsManager = ({ isOpen, onClose, collection, canManage }: Props) => {
  const [items, setItems] = useState<PlatformVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [platform, setPlatform] = useState("");
  const [version, setVersion] = useState("");
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPlatform, setEditPlatform] = useState("");
  const [editVersion, setEditVersion] = useState("");

  const [deleting, setDeleting] = useState<PlatformVersion | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setLoading(true);
    setError("");
    setSearch("");
    setPlatform("");
    setVersion("");
    setEditingId(null);
    api
      .get(`/collections/${collection.id}/platform-versions`)
      .then((res) => {
        if (active) setItems(Array.isArray(res.data) ? res.data : []);
      })
      .catch((err) => {
        if (active) setError(getApiErrorMessage(err, "Couldn't load platforms/versions."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isOpen, collection.id]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.platform.toLowerCase().includes(q) ||
        i.version.toLowerCase().includes(q) ||
        i.label.toLowerCase().includes(q),
    );
  }, [items, search]);

  if (!isOpen) return null;

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!platform.trim() || !version.trim()) {
      setError("Both platform and version are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await api.post(`/collections/${collection.id}/platform-versions`, {
        platform: platform.trim(),
        version: version.trim(),
      });
      setItems((prev) =>
        [...prev, res.data].sort((a, b) =>
          a.platform.localeCompare(b.platform) || a.version.localeCompare(b.version),
        ),
      );
      setPlatform("");
      setVersion("");
    } catch (err: any) {
      setError(getApiErrorMessage(err, "Couldn't add the platform/version."));
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (i: PlatformVersion) => {
    setEditingId(i.id);
    setEditPlatform(i.platform);
    setEditVersion(i.version);
    setError("");
  };

  const saveEdit = async (id: string) => {
    if (!editPlatform.trim() || !editVersion.trim()) {
      setError("Both platform and version are required.");
      return;
    }
    try {
      const res = await api.patch(`/collections/${collection.id}/platform-versions/${id}`, {
        platform: editPlatform.trim(),
        version: editVersion.trim(),
      });
      setItems((prev) => prev.map((i) => (i.id === id ? res.data : i)));
      setEditingId(null);
    } catch (err: any) {
      setError(getApiErrorMessage(err, "Couldn't update the platform/version."));
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await api.delete(`/collections/${collection.id}/platform-versions/${deleting.id}`);
      setItems((prev) => prev.filter((i) => i.id !== deleting.id));
      setDeleting(null);
    } catch (err: any) {
      setError(getApiErrorMessage(err, "Couldn't delete the platform/version."));
      setDeleting(null);
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      style={{ zIndex: 130 }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-panel max-w-lg w-full rounded-3xl p-6">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <h3 className="flex items-center gap-2 text-lg font-bold tracking-tight" style={{ color: "var(--text)" }}>
              <Layers className="h-5 w-5" style={{ color: "var(--accent)" }} /> Platforms & versions
            </h3>
            <p className="mt-0.5 text-xs truncate" style={{ color: "var(--muted)" }}>
              For the “{collection.name}” collection
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: "var(--muted)" }}>
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border px-4 py-3 text-sm" style={{ borderColor: "#f87171", backgroundColor: "rgba(248,113,113,0.1)", color: "#ef4444" }}>
            {error}
          </div>
        )}

        {canManage && (
          <form onSubmit={add} className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="block text-[10px] font-black uppercase tracking-[0.3em] mb-1.5" style={{ color: "var(--muted)" }}>Platform</label>
              <input
                className="field px-3 py-2.5 text-sm outline-none"
                placeholder="e.g. Web, Mobile, iOS"
                value={platform}
                maxLength={60}
                onChange={(e) => setPlatform(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <label className="block text-[10px] font-black uppercase tracking-[0.3em] mb-1.5" style={{ color: "var(--muted)" }}>Version</label>
              <input
                className="field px-3 py-2.5 text-sm outline-none"
                placeholder="e.g. 1.1.0"
                value={version}
                maxLength={60}
                onChange={(e) => setVersion(e.target.value)}
              />
            </div>
            <button type="submit" disabled={saving || !platform.trim() || !version.trim()} className="btn btn-primary h-10 px-4 text-sm font-bold shrink-0">
              {saving ? <span className="ui-spinner h-4 w-4" /> : <Plus className="h-4 w-4" />} Add
            </button>
          </form>
        )}

        {items.length > 4 && (
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "var(--muted)" }} />
            <input
              className="field pl-9 pr-3 py-2.5 text-sm"
              placeholder="Search platform or version…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        )}

        <div className="max-h-[45vh] overflow-auto rounded-xl border" style={{ borderColor: "var(--border)" }}>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <span className="ui-spinner h-6 w-6" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm" style={{ color: "var(--muted)" }}>
              {items.length === 0 ? "No platforms/versions yet." : `No matches for “${search}”.`}
            </p>
          ) : (
            <ul className="divide-y" style={{ borderColor: "var(--border)" }}>
              {filtered.map((i) => (
                <li key={i.id} className="flex items-center gap-2 px-3 py-2.5" style={{ borderColor: "var(--border)" }}>
                  {editingId === i.id ? (
                    <>
                      <input
                        className="field flex-1 px-2.5 py-1.5 text-sm"
                        value={editPlatform}
                        maxLength={60}
                        onChange={(e) => setEditPlatform(e.target.value)}
                      />
                      <input
                        className="field w-24 px-2.5 py-1.5 text-sm"
                        value={editVersion}
                        maxLength={60}
                        onChange={(e) => setEditVersion(e.target.value)}
                      />
                      <button onClick={() => saveEdit(i.id)} className="p-1.5 rounded-lg" style={{ color: "var(--accent)" }} title="Save">
                        <Check className="h-4 w-4" />
                      </button>
                      <button onClick={() => setEditingId(null)} className="p-1.5 rounded-lg" style={{ color: "var(--muted)" }} title="Cancel">
                        <X className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium" style={{ color: "var(--text)" }}>
                        {i.platform}
                        <span className="ml-2 rounded px-1.5 py-0.5 text-[11px] font-bold" style={{ backgroundColor: "var(--accent-soft)", color: "var(--accent)" }}>
                          {i.version}
                        </span>
                      </span>
                      {canManage && (
                        <>
                          <button onClick={() => startEdit(i)} className="p-1.5 rounded-lg transition hover:bg-[var(--accent-soft)]" style={{ color: "var(--muted)" }} title="Edit">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => setDeleting(i)} className="p-1.5 rounded-lg transition hover:bg-red-500/10" style={{ color: "#ef4444" }} title="Delete">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {!canManage && (
          <p className="mt-3 text-xs" style={{ color: "var(--muted)" }}>
            Only Admins can add or edit platforms/versions.
          </p>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!deleting}
        title="Delete this platform/version?"
        message={
          <>
            “{deleting?.platform} · {deleting?.version}” will be removed. Tickets currently pinned to it will simply have no platform/version.
          </>
        }
        confirmLabel="Delete"
        variant="danger"
        loading={deleteBusy}
        onConfirm={confirmDelete}
        onCancel={() => {
          if (!deleteBusy) setDeleting(null);
        }}
      />
    </div>
  );
};

export default PlatformVersionsManager;

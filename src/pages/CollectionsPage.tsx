import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FolderKanban, Plus, Pencil, Trash2, Ticket as TicketIcon, ArrowRight, X } from "lucide-react";
import api from "../services/api";
import { getApiErrorMessage } from "../utils/apiError";
import { getLoggedInUser } from "../utils/auth";
import ConfirmDialog from "../components/ConfirmDialog";
import type { Collection, Role } from "../types";

/**
 * Collections — the level above the ticket dashboard. Each collection is a
 * system/product the team tracks, with its own dashboard. Arriving with a
 * single collection auto-routes straight into it (skipped with ?all=1, which
 * the sidebar link uses so the page stays reachable for management).
 */
const CollectionsPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const showAll = searchParams.get("all") === "1";

  const [collections, setCollections] = useState<Collection[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Create / edit modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Collection | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState("");

  // Delete state
  const [deleting, setDeleting] = useState<Collection | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const currentUser = getLoggedInUser();

  const isAdmin = useMemo(() => {
    if (!currentUser || roles.length === 0) return false;
    const userRoleId = String(currentUser.roleId).toLowerCase();
    return roles
      .filter((r) => ["admin", "administrator", "superadmin", "super admin", "super-admin", "root"].includes(r.name.toLowerCase()))
      .some((r) => String(r.id).toLowerCase() === userRoleId);
  }, [currentUser, roles]);

  const fetchData = useCallback(async () => {
    try {
      const [cRes, rRes] = await Promise.allSettled([
        api.get("/collections"),
        api.get("/users/roles"),
      ]);
      if (cRes.status === "fulfilled") setCollections(Array.isArray(cRes.value.data) ? cRes.value.data : []);
      else setError(getApiErrorMessage((cRes as any).reason, "Couldn't load collections."));
      if (rRes.status === "fulfilled") setRoles(Array.isArray(rRes.value.data) ? rRes.value.data : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const enterCollection = (c: Collection, replace = false) => {
    localStorage.setItem("activeCollection", JSON.stringify({ id: c.id, name: c.name }));
    navigate(`/dashboard?collection=${c.id}`, { replace });
  };

  // Skip the picker whenever we already know where the user works (unless
  // browsing via ?all=1): re-enter their last collection, or the only one.
  useEffect(() => {
    if (loading || showAll || collections.length === 0) return;
    let saved: { id?: string } | null = null;
    try {
      saved = JSON.parse(localStorage.getItem("activeCollection") || "null");
    } catch {
      saved = null;
    }
    const remembered = saved?.id ? collections.find((c) => String(c.id) === String(saved!.id)) : undefined;
    if (remembered) {
      enterCollection(remembered, true);
    } else if (collections.length === 1) {
      enterCollection(collections[0], true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, showAll, collections]);

  const openCreate = () => {
    setEditing(null);
    setName("");
    setDescription("");
    setModalError("");
    setModalOpen(true);
  };

  const openEdit = (c: Collection) => {
    setEditing(c);
    setName(c.name);
    setDescription(c.description || "");
    setModalError("");
    setModalOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setModalError("Collection name is required.");
      return;
    }
    setSaving(true);
    setModalError("");
    try {
      if (editing) {
        const res = await api.patch(`/collections/${editing.id}`, {
          name: name.trim(),
          description: description.trim() || null,
        });
        setCollections((prev) => prev.map((c) => (c.id === editing.id ? { ...c, ...res.data } : c)));
      } else {
        const res = await api.post("/collections", {
          name: name.trim(),
          description: description.trim() || null,
        });
        setCollections((prev) => [...prev, res.data]);
      }
      setModalOpen(false);
    } catch (err: any) {
      setModalError(getApiErrorMessage(err, "Couldn't save the collection."));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    setDeleteError("");
    try {
      await api.delete(`/collections/${deleting.id}`);
      setCollections((prev) => prev.filter((c) => c.id !== deleting.id));
      setDeleting(null);
      fetchData(); // refresh counts (tickets moved to the fallback collection)
    } catch (err: any) {
      setDeleteError(getApiErrorMessage(err, "Couldn't delete the collection."));
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto" style={{ color: "var(--text)" }}>
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight">
            <FolderKanban className="h-6 w-6" style={{ color: "var(--accent)" }} />
            Collections
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
            Each system or product your team tracks — every collection has its own ticket dashboard.
          </p>
        </div>
        {isAdmin && (
          <button onClick={openCreate} className="accent-btn inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold">
            <Plus className="h-4 w-4" /> New collection
          </button>
        )}
      </header>

      {error && (
        <div className="mb-6 rounded-xl border px-4 py-3 text-sm" style={{ borderColor: "#f87171", backgroundColor: "rgba(248,113,113,0.1)", color: "#ef4444" }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="w-9 h-9 rounded-full animate-spin mb-4" style={{ border: "3px solid var(--accent)", borderTopColor: "transparent" }} />
          <p className="text-xs" style={{ color: "var(--muted)" }}>Loading collections…</p>
        </div>
      ) : collections.length === 0 ? (
        <div className="py-24 text-center border border-dashed rounded-2xl" style={{ borderColor: "var(--border)" }}>
          <FolderKanban className="h-8 w-8 mx-auto mb-3 opacity-30" />
          <p className="text-sm" style={{ color: "var(--muted)" }}>No collections yet.</p>
          {isAdmin && (
            <button onClick={openCreate} className="mt-4 text-sm font-semibold" style={{ color: "var(--accent)" }}>
              Create your first collection
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 stagger">
          {collections.map((c) => (
            <div
              key={c.id}
              onClick={() => enterCollection(c)}
              className="group p-5 rounded-2xl border transition-all flex flex-col cursor-pointer hover:-translate-y-0.5 hover:shadow-lg"
              style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl shrink-0" style={{ backgroundColor: "var(--accent-soft)", color: "var(--accent)" }}>
                  <FolderKanban className="h-5 w-5" />
                </span>
                {isAdmin && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button
                      onClick={(e) => { e.stopPropagation(); openEdit(c); }}
                      title="Edit collection"
                      className="grid place-items-center h-8 w-8 rounded-lg transition hover:bg-[var(--accent-soft)]"
                      style={{ color: "var(--muted)" }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteError(""); setDeleting(c); }}
                      title="Delete collection"
                      className="grid place-items-center h-8 w-8 rounded-lg transition hover:bg-red-500/10"
                      style={{ color: "#ef4444" }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>

              <h3 className="text-base font-semibold mb-1 line-clamp-1 transition-colors group-hover:text-[var(--accent)]">{c.name}</h3>
              <p className="text-sm leading-relaxed line-clamp-2 mb-4 flex-grow" style={{ color: "var(--muted)" }}>
                {c.description || "No description."}
              </p>

              <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: "var(--border)" }}>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: "var(--muted)" }}>
                  <TicketIcon className="h-3.5 w-3.5" />
                  {c.ticketCount} {c.ticketCount === 1 ? "ticket" : "tickets"}
                  {c.openCount > 0 && (
                    <span className="ml-1 rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ backgroundColor: "var(--accent-soft)", color: "var(--accent)" }}>
                      {c.openCount} active
                    </span>
                  )}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold transition group-hover:gap-1.5" style={{ color: "var(--accent)" }}>
                  Open board <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / edit modal */}
      {modalOpen && (
        <div className="modal-overlay" style={{ zIndex: 120 }} onMouseDown={(e) => { if (e.target === e.currentTarget && !saving) setModalOpen(false); }}>
          <div className="modal-panel max-w-md w-full rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold tracking-tight" style={{ color: "var(--text)" }}>
                {editing ? "Edit collection" : "New collection"}
              </h3>
              <button onClick={() => !saving && setModalOpen(false)} className="p-1.5 rounded-lg" style={{ color: "var(--muted)" }}>
                <X className="h-5 w-5" />
              </button>
            </div>

            {modalError && (
              <div className="mb-4 rounded-xl border px-4 py-3 text-sm" style={{ borderColor: "#f87171", backgroundColor: "rgba(248,113,113,0.1)", color: "#ef4444" }}>
                {modalError}
              </div>
            )}

            <form onSubmit={save} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-[0.3em] mb-2" style={{ color: "var(--muted)" }}>Name</label>
                <input
                  autoFocus
                  placeholder="e.g. Mobile App, Billing Service…"
                  className="field px-4 py-3 outline-none"
                  value={name}
                  maxLength={120}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-[0.3em] mb-2" style={{ color: "var(--muted)" }}>
                  Description <span className="font-medium tracking-normal lowercase opacity-70">· optional</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="What does this collection track?"
                  className="field px-4 py-3 outline-none resize-y"
                  value={description}
                  maxLength={500}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => !saving && setModalOpen(false)} className="btn btn-ghost flex-1 px-5 py-2.5 text-sm font-bold">
                  Cancel
                </button>
                <button type="submit" disabled={saving || !name.trim()} className="btn btn-primary flex-1 px-5 py-2.5 text-sm font-bold">
                  {saving ? (<><span className="ui-spinner h-4 w-4" /> Saving…</>) : editing ? "Save changes" : "Create collection"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleting}
        title="Delete this collection?"
        message={
          <>
            Tickets inside "{deleting?.name}" will be moved to your default collection — nothing is lost.
            {deleteError && <span className="mt-2 block font-semibold text-rose-500">{deleteError}</span>}
          </>
        }
        confirmLabel="Delete collection"
        variant="danger"
        loading={deleteBusy}
        onConfirm={confirmDelete}
        onCancel={() => {
          if (!deleteBusy) {
            setDeleting(null);
            setDeleteError("");
          }
        }}
      />
    </div>
  );
};

export default CollectionsPage;

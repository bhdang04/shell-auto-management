import { useState } from "react";
import { useCatalog } from "../../../api/catalog";

const emptyForm = { code: "", description: "", price: "" };

/**
 * CatalogList
 * Props:
 *  - type: "part" | "labor" | "job" — which slice of the catalog table to show
 *  - category: optional — for type="job", further scopes to one category
 *    (e.g. "Brakes") and gets attached to anything added from here
 *  - onPick(item): fired when a row is clicked (not its edit/delete buttons)
 */
export default function CatalogList({ type, category, onPick }) {
  const { filtered, search, setSearch, loading, error, addItem, updateItem, deleteItem } = useCatalog(type);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  // useCatalog(type) already filters by type + search text — this adds the
  // category layer on top, only relevant when a category prop is passed.
  const scoped = category ? filtered.filter((it) => it.category === category) : filtered;

  function openAddForm() {
    setEditingId(null);
    setForm(emptyForm);
    setSaveError(null);
    setFormOpen(true);
  }

  function openEditForm(item) {
    setEditingId(item.id);
    setForm({ code: item.code, description: item.description, price: String(item.price) });
    setSaveError(null);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  async function handleSave() {
    if (!form.code.trim() || !form.description.trim()) return;
    setSaving(true);
    const { error } = editingId
      ? await updateItem(editingId, {
          code: form.code.trim(),
          description: form.description,
          price: parseFloat(form.price) || 0,
        })
      : await addItem({ ...form, category });
    setSaving(false);
    if (error) {
      // Most likely a duplicate code — catalog_type_code_idx is a unique index.
      setSaveError(error.message || "Couldn't save — check the code isn't already in use.");
      return;
    }
    closeForm();
  }

  async function handleDelete(id, e) {
    e.stopPropagation();
    if (editingId === id) closeForm();
    await deleteItem(id);
  }

  return (
    <>
      <div className="lookup-toolbar">
        <input
          className="lookup-search-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search code or name..."
        />
        <button className="btn-small" onClick={openAddForm}>
          + Add
        </button>
      </div>

      {formOpen && (
        <div className="catalog-form">
          <div className="field">
            <label>Code</label>
            <input
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              placeholder="e.g. SENS-TX"
              autoFocus
            />
          </div>
          <div className="field">
            <label>Description</label>
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Price</label>
            <input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
          </div>
          {saveError && (
            <div className="lookup-empty" style={{ color: "var(--bad)" }}>
              {saveError}
            </div>
          )}
          <div className="btn-row">
            <button className="btn" onClick={closeForm} disabled={saving}>
              Cancel
            </button>
            <button className="btn primary" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : editingId ? "Save Changes" : "Add to List"}
            </button>
          </div>
        </div>
      )}

      <div className="lookup-list">
        {error && <div className="lookup-empty">Couldn&rsquo;t load catalog — check your Supabase connection.</div>}
        {loading && <div className="lookup-empty">Loading...</div>}
        {!loading && !error && scoped.length === 0 && <div className="lookup-empty">No matches.</div>}
        {scoped.map((it) => (
          <div className="lookup-item" key={it.id} onClick={() => onPick(it)}>
            <div className="li-top">
              <span className="code">{it.code}</span>
              <span className="desc">{it.description}</span>
            </div>
            <div className="li-bottom">
              <span className="price">${Number(it.price || 0).toFixed(2)}</span>
              <span className="row-actions">
                <button
                  className="icon-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    openEditForm(it);
                  }}
                  title="Edit"
                >
                  ✎
                </button>
                <button className="icon-btn danger" onClick={(e) => handleDelete(it.id, e)} title="Delete">
                  ✕
                </button>
              </span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

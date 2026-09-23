import { useEffect, useState } from "react";
import Popup from "../Modal";
import { getInvoiceNote, saveInvoiceNote } from "../../../api/notes";

/**
 * NotePopup
 * Attach a free-text note to the current repair order (one note per
 * invoice — saving replaces whatever was there before).
 *
 * Props:
 *  - invoiceId: the currently loaded invoice's real DB id, or null if the
 *    ticket hasn't been saved yet (notes can't be attached until it has)
 */
export default function NotePopup({ isOpen, onClose, invoiceId }) {
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    if (!invoiceId) {
      setBody("");
      return;
    }
    setLoading(true);
    getInvoiceNote(invoiceId)
      .then((note) => setBody(note?.body || ""))
      .catch((err) => {
        console.error("Failed to load note:", err);
        setError("Couldn't load the existing note.");
      })
      .finally(() => setLoading(false));
  }, [isOpen, invoiceId]);

  async function handleSave() {
    if (!invoiceId) return;
    setSaving(true);
    setError(null);
    try {
      await saveInvoiceNote(invoiceId, body);
      onClose();
    } catch (err) {
      console.error("Failed to save note:", err);
      setError("Couldn't save the note — try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Popup isOpen={isOpen} onClose={onClose} title="Add Note" variant="compact">
      {!invoiceId ? (
        <div className="lookup-empty">Save the repair order first, then you can attach a note to it.</div>
      ) : (
        <>
          <div className="field">
            <label>Note</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Customer approved additional brake work over the phone..."
              disabled={loading}
              autoFocus
            />
          </div>
          {error && (
            <div className="lookup-empty" style={{ color: "var(--bad)" }}>
              {error}
            </div>
          )}
          <div className="btn-row">
            <button className="btn" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button className="btn primary" onClick={handleSave} disabled={saving || loading}>
              {saving ? "Saving..." : "Save Note"}
            </button>
          </div>
        </>
      )}
    </Popup>
  );
}
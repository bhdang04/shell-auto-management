import Popup from "../Modal";

/**
 * NotePopup
 * Attach a free-text note to the current repair order.
 * TODO: wire onSave to actually persist the note (currently closes only).
 */
export default function NotePopup({ isOpen, onClose }) {
  return (
    <Popup isOpen={isOpen} onClose={onClose} title="Add Note" variant="compact">
      <div className="field">
        <label>Note</label>
        <textarea placeholder="Customer approved additional brake work over the phone..." />
      </div>
      <div className="btn-row">
        <button className="btn" onClick={onClose}>
          Cancel
        </button>
        <button className="btn primary" onClick={onClose}>
          Save Note
        </button>
      </div>
    </Popup>
  );
}

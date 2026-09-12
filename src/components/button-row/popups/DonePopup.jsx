import Popup from "../Modal";

/**
 * DonePopup
 * Confirms marking the current repair order as finished / ready for pickup.
 * TODO: wire onConfirm to actually update invoice status (currently closes only).
 */
export default function DonePopup({ isOpen, onClose }) {
  return (
    <Popup isOpen={isOpen} onClose={onClose} title="Mark as Done" variant="compact">
      <p style={{ fontSize: 13.5, color: "var(--muted)", marginBottom: 16 }}>
        This closes out the current repair order and moves it to Ready for Pickup.
      </p>
      <div className="btn-row">
        <button className="btn" onClick={onClose}>
          Cancel
        </button>
        <button className="btn primary" onClick={onClose}>
          Confirm
        </button>
      </div>
    </Popup>
  );
}

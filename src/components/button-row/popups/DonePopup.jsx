import Modal from "../Modal";

/**
 * DonePopup
 * Confirms marking the current repair order as finished / ready for pickup.
 *
 * Props:
 *  - onConfirm(): actually persists the status change — passed from
 *    RepairOrderPage via QuickActions
 */
export default function DonePopup({ isOpen, onClose, onConfirm }) {
  function handleConfirm() {
    if (onConfirm) onConfirm();
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Mark as Done" variant="compact">
      <p style={{ fontSize: 13.5, color: "var(--muted)", marginBottom: 16 }}>
        This closes out the current repair order and moves it to Ready for Pickup. Selecting this
        vehicle again later will start a fresh repair order instead of reopening this one.
      </p>
      <div className="btn-row">
        <button className="btn" onClick={onClose}>
          Cancel
        </button>
        <button className="btn primary" onClick={handleConfirm}>
          Confirm
        </button>
      </div>
    </Modal>
  );
}

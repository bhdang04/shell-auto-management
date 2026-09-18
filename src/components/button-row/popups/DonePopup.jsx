import Popup from "../Modal";
import { updateInvoiceStatus } from "../../../api/invoices";

export default function DonePopup({ isOpen, onClose, invoiceId }) {
  async function handleConfirm() {
    try {
      await updateInvoiceStatus(invoiceId, "Ready for Pickup");
      onClose();
    } catch (err) {
      console.error("Failed to update invoice status:", err);
    }
  }

  return (
    <Popup isOpen={isOpen} onClose={onClose} title="Mark as Done" variant="compact">
      <p style={{ fontSize: 13.5, color: "var(--muted)", marginBottom: 16 }}>
        This closes out the current repair order and moves it to Ready for Pickup.
      </p>

      <div className="btn-row">
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn primary" onClick={handleConfirm}>Confirm</button>
      </div>
    </Popup>
  );
}

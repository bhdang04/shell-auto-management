import { useEffect, useState } from "react";
import Popup from "./button-row/Modal";

export default function VoidInvoicePopup({ isOpen, onClose, invoiceNum, onConfirm, voiding }) {
  const [reason, setReason] = useState("");

  // Force a fresh reason each time this opens — voiding is sensitive
  // enough that we don't want a stale/leftover reason from a prior void.
  useEffect(() => {
    if (isOpen) setReason("");
  }, [isOpen]);

  return (
    <Popup isOpen={isOpen} onClose={onClose} title="Void Invoice" variant="compact">
      <div style={{ fontSize: 13, marginBottom: 12, color: "var(--muted)" }}>
        This will void {invoiceNum ? `invoice #${invoiceNum}` : "this invoice"} and clear the ticket. The invoice
        stays on file as voided — it can't be reopened from here.
      </div>
      <div className="field">
        <label>Reason for voiding</label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. duplicate ticket, wrong customer, entered by mistake..."
          autoFocus
        />
      </div>
      <div className="btn-row" style={{ marginTop: 20 }}>
        <button className="btn" onClick={onClose} disabled={voiding}>
          Cancel
        </button>
        <button
          className="btn primary"
          disabled={!reason.trim() || voiding}
          onClick={() => onConfirm(reason.trim())}
        >
          {voiding ? "Voiding..." : "Void Invoice"}
        </button>
      </div>
    </Popup>
  );
}
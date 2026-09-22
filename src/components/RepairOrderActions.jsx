/**
 * RepairOrderActions
 * Props:
 *  - disabled: true when there are no line items yet
 *  - isPaid: true when the currently loaded invoice's status is "Paid"
 *  - onPrint(), onText(), onPay(): wire these up to real integrations later
 *  - onReprintReceipt(): regenerates the payment receipt for an already-paid invoice
 */
export default function RepairOrderActions({ disabled, isPaid, onPrint, onText, onPay, onReprintReceipt }) {
  return (
    <div className="bay-actions">
      <div className={`bay-btn ${disabled ? "disabled" : ""}`} onClick={disabled ? undefined : onPrint}>
        Print
      </div>
      <div className={`bay-btn ${disabled ? "disabled" : ""}`} onClick={disabled ? undefined : onText}>
        Text to Customer
      </div>
      {isPaid ? (
        <div className="bay-btn primary" onClick={onReprintReceipt}>
          Reprint Receipt
        </div>
      ) : (
        <div
          className={`bay-btn primary ${disabled ? "disabled" : ""}`}
          onClick={disabled ? undefined : onPay}
        >
          Take Payment
        </div>
      )}
    </div>
  );
}
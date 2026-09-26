/**
 * RepairOrderActions
 * Props:
 *  - disabled: true when there are no line items yet
 *  - isPaid: true when the currently loaded invoice's status is "Paid"
 *  - isVoided: true when the currently loaded invoice's status is "Voided"
 *  - onPrint(), onText(), onPay(): wire these up to real integrations later
 */
export default function RepairOrderActions({ disabled, isPaid, isVoided, onPrint, onText, onPay }) {
  return (
    <div className="bay-actions">
      <div className={`bay-btn ${disabled ? "disabled" : ""}`} onClick={disabled ? undefined : onPrint}>
        Print
      </div>
      <div className={`bay-btn ${disabled ? "disabled" : ""}`} onClick={disabled ? undefined : onText}>
        Text to Customer
      </div>
      {isVoided ? (
        <div className="bay-btn disabled">Voided</div>
      ) : isPaid ? (
        <div className="bay-btn disabled">Paid</div>
      ) : (
        <div className={`bay-btn primary ${disabled ? "disabled" : ""}`} onClick={disabled ? undefined : onPay}>
          Take Payment
        </div>
      )}
    </div>
  );
}
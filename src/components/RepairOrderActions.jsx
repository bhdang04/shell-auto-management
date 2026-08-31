/**
 * RepairOrderActions
 * Props:
 *  - disabled: true when there are no line items yet
 *  - onPrint(), onText(), onPay(): wire these up to real integrations later
 */
export default function RepairOrderActions({ disabled, onPrint, onText, onPay }) {
  return (
    <div className="bay-actions">
      <div className={`bay-btn ${disabled ? "disabled" : ""}`} onClick={disabled ? undefined : onPrint}>
        Print
      </div>
      <div className={`bay-btn ${disabled ? "disabled" : ""}`} onClick={disabled ? undefined : onText}>
        Text to Customer
      </div>
      <div
        className={`bay-btn primary ${disabled ? "disabled" : ""}`}
        onClick={disabled ? undefined : onPay}
      >
        Take Payment
      </div>
    </div>
  );
}

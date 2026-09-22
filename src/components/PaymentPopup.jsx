import { useState } from "react";
import Popup from "./button-row/Modal";

const METHODS = [
  { label: "Cash", surcharge: 0 },
  { label: "ATM", surcharge: 0 },
  { label: "Visa", surcharge: 0.03 },
  { label: "Mastercard", surcharge: 0.03 },
  { label: "Debit Card", surcharge: 0.03 },
  { label: "Credit Card", surcharge: 0.03 }
];

export default function PaymentPopup({ isOpen, onClose, total, onConfirm }) {
  const [method, setMethod] = useState(null);

  const safeTotal = Number(total || 0);
  const surchargeAmount = method ? +(safeTotal * method.surcharge).toFixed(2) : 0;
  const finalTotal = +(safeTotal + surchargeAmount).toFixed(2);

  return (
    <Popup isOpen={isOpen} onClose={onClose} title="Take Payment" variant="compact">
      <div style={{ fontSize: 13, marginBottom: 12 }}>
        Select payment method:
      </div>

      <div className="pay-grid">
        {METHODS.map(m => (
          <button
            key={m.label}
            className={`pay-btn ${method?.label === m.label ? "on" : ""}`}
            onClick={() => setMethod(m)}
          >
            {m.label}
            {m.surcharge > 0 && " (+3%)"}
          </button>
        ))}
      </div>

      {method && (
        <div className="pay-summary">
          <div className="row">
            <span>Subtotal</span>
            <span>${safeTotal.toFixed(2)}</span>
          </div>
          {method.surcharge > 0 && (
            <div className="row">
              <span>Surcharge (3%)</span>
              <span>${surchargeAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="row total">
            <span>Total</span>
            <span>${finalTotal.toFixed(2)}</span>
          </div>
        </div>
      )}

      <div className="btn-row" style={{ marginTop: 20 }}>
        <button className="btn" onClick={onClose}>Cancel</button>
        <button
          className="btn primary"
          disabled={!method}
          onClick={() =>
            onConfirm({
              method: method.label,
              surchargeAmount,
              finalTotal
            })
          }
        >
          Print Receipt
        </button>
      </div>
    </Popup>
  );
}

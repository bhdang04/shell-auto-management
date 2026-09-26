import { useEffect, useState } from "react";
import Popup from "./button-row/Modal";

function money(n) {
  return "$" + Number(n || 0).toFixed(2);
}

// Only genuine credit cards carry the surcharge — ATM/Prepaid are debit-style, no surcharge.
const CARD_METHODS = [
  { label: "Visa", surcharge: 0.03 },
  { label: "Mastercard", surcharge: 0.03 },
  { label: "American Express", surcharge: 0.03 },
  { label: "Discover", surcharge: 0.03 },
  { label: "Debit Card", surcharge: 0.03 },
  { label: "ATM", surcharge: 0 },
  { label: "Prepaid", surcharge: 0 },
];

/**
 * TakePaymentWizard
 * Mileage -> Cashbox (Cash / Check / Credit Card) -> Final (Print or Save).
 *
 * Props:
 *  - total: balance due before any card surcharge
 *  - currentOdometer: vehicle.odo, prefilled into the mileage step
 *  - saving: true while the parent's save is in flight (disables final buttons)
 *  - onComplete({ odometer, method, checkNumber, surchargeAmount, print })
 */
export default function TakePaymentWizard({ isOpen, onClose, total, currentOdometer, saving, onComplete }) {
  const [step, setStep] = useState("mileage");
  const [odometer, setOdometer] = useState("");
  const [method, setMethod] = useState(null);
  const [surchargeAmount, setSurchargeAmount] = useState(0);
  const [checkNumber, setCheckNumber] = useState("");

  useEffect(() => {
    if (isOpen) {
      setStep("mileage");
      setOdometer(currentOdometer || "");
      setMethod(null);
      setSurchargeAmount(0);
      setCheckNumber("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const safeTotal = Number(total || 0);
  const finalTotal = +(safeTotal + surchargeAmount).toFixed(2);

  function pickCash() {
    setMethod("Cash");
    setSurchargeAmount(0);
    setStep("final");
  }
  function goToCheck() {
    setStep("check");
  }
  function confirmCheck() {
    setMethod("Check");
    setSurchargeAmount(0);
    setStep("final");
  }
  function goToCard() {
    setStep("card");
  }
  function pickCard(card) {
    setMethod(card.label);
    setSurchargeAmount(+(safeTotal * card.surcharge).toFixed(2));
    setStep("final");
  }

  function finish(print) {
    onComplete({
      odometer: odometer.trim(),
      method,
      checkNumber: method === "Check" ? checkNumber.trim() : null,
      surchargeAmount,
      print,
    });
  }

  return (
    <Popup isOpen={isOpen} onClose={onClose} title="Take Payment" variant="compact">
      {step === "mileage" && (
        <>
          <div className="field">
            <label>Current Mileage</label>
            <input
              value={odometer}
              onChange={(e) => setOdometer(e.target.value)}
              placeholder="e.g. 142600"
              inputMode="numeric"
              autoFocus
            />
          </div>
          <div className="btn-row">
            <button className="btn" onClick={onClose}>
              Cancel
            </button>
            <button className="btn primary" onClick={() => setStep("cashbox")}>
              Continue
            </button>
          </div>
        </>
      )}

      {step === "cashbox" && (
        <>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)" }}>
              Balance Due — Pay Full Amount
            </div>
            <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 24, color: "var(--accent)", fontWeight: 700 }}>
              {money(safeTotal)}
            </div>
          </div>
          <div className="pay-grid">
            <button className="pay-btn" onClick={pickCash}>
              Cash
            </button>
            <button className="pay-btn" onClick={goToCheck}>
              Check
            </button>
            <button className="pay-btn" onClick={goToCard}>
              Credit Card
            </button>
          </div>
          <div className="btn-row" style={{ marginTop: 20 }}>
            <button className="btn" onClick={() => setStep("mileage")}>
              ‹ Back
            </button>
          </div>
        </>
      )}

      {step === "check" && (
        <>
          <div className="field">
            <label>Check Number</label>
            <input value={checkNumber} onChange={(e) => setCheckNumber(e.target.value)} autoFocus />
          </div>
          <div className="btn-row">
            <button className="btn" onClick={() => setStep("cashbox")}>
              ‹ Back
            </button>
            <button className="btn primary" onClick={confirmCheck} disabled={!checkNumber.trim()}>
              Continue
            </button>
          </div>
        </>
      )}

      {step === "card" && (
        <>
          <div className="pay-grid">
            {CARD_METHODS.map((c) => (
              <button key={c.label} className="pay-btn" onClick={() => pickCard(c)}>
                {c.label}
                {c.surcharge > 0 && " (+3%)"}
              </button>
            ))}
          </div>
          <div className="btn-row" style={{ marginTop: 20 }}>
            <button className="btn" onClick={() => setStep("cashbox")}>
              ‹ Back
            </button>
          </div>
        </>
      )}

      {step === "final" && (
        <>
          <div className="pay-summary">
            <div className="row">
              <span>Mileage</span>
              <span>{odometer || "—"}</span>
            </div>
            <div className="row">
              <span>Method</span>
              <span>{method}{method === "Check" && checkNumber ? ` #${checkNumber}` : ""}</span>
            </div>
            <div className="row">
              <span>Subtotal</span>
              <span>{money(safeTotal)}</span>
            </div>
            {surchargeAmount > 0 && (
              <div className="row">
                <span>Card Surcharge (3%)</span>
                <span>{money(surchargeAmount)}</span>
              </div>
            )}
            <div className="row total">
              <span>Total Paid</span>
              <span>{money(finalTotal)}</span>
            </div>
          </div>
          <div className="btn-row" style={{ marginTop: 20 }}>
            <button className="btn" onClick={() => finish(false)} disabled={saving}>
              {saving ? "Saving..." : "Save Only"}
            </button>
            <button className="btn primary" onClick={() => finish(true)} disabled={saving}>
              {saving ? "Saving..." : "Print Invoice"}
            </button>
          </div>
        </>
      )}
    </Popup>
  );
}
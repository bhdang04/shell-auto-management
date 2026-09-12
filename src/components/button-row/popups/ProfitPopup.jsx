import Popup from "../Modal";

/**
 * ProfitPopup
 * Shows parts cost vs. billed, and labor billed, for a quick margin check.
 * TODO: pass real numbers in via props once this reads off the loaded invoice
 * instead of placeholder figures.
 */
export default function ProfitPopup({ isOpen, onClose }) {
  const partsCost = 248.0;
  const partsBilled = 385.0;
  const laborBilled = 300.0;
  const profit = partsBilled - partsCost + laborBilled;

  return (
    <Popup isOpen={isOpen} onClose={onClose} title="Profit Breakdown" variant="compact">
      <div className="profit-row">
        <span>Parts cost</span>
        <span className="v">${partsCost.toFixed(2)}</span>
      </div>
      <div className="profit-row">
        <span>Parts billed</span>
        <span className="v">${partsBilled.toFixed(2)}</span>
      </div>
      <div className="profit-row">
        <span>Labor billed</span>
        <span className="v">${laborBilled.toFixed(2)}</span>
      </div>
      <div className="profit-row total">
        <span>Est. profit</span>
        <span className="v">${profit.toFixed(2)}</span>
      </div>
    </Popup>
  );
}

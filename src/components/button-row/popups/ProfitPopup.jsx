import Modal from "../Modal";

function money(n) {
  return "$" + Number(n || 0).toFixed(2);
}

/**
 * ProfitPopup
 * Shows real revenue numbers from the currently loaded invoice.
 *
 * NOTE: this is billed revenue, not true profit — the app doesn't track
 * what parts actually cost the shop anywhere yet (no `cost` field on
 * catalog parts or line items), so there's no honest way to compute a
 * real margin. Labeled clearly rather than faking a number.
 *
 * Props: totals = { labor, parts, tax, due }
 */
export default function ProfitPopup({ isOpen, onClose, totals }) {
  const t = totals || { labor: 0, parts: 0, tax: 0, due: 0 };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Invoice Revenue" variant="compact">
      <div className="profit-row">
        <span>Labor billed</span>
        <span className="v">{money(t.labor)}</span>
      </div>
      <div className="profit-row">
        <span>Parts billed</span>
        <span className="v">{money(t.parts)}</span>
      </div>
      <div className="profit-row">
        <span>Sales tax</span>
        <span className="v">{money(t.tax)}</span>
      </div>
      <div className="profit-row total">
        <span>Total billed</span>
        <span className="v">{money(t.due)}</span>
      </div>
      <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 14, lineHeight: 1.5 }}>
        This is billed revenue, not profit — part cost isn't tracked yet, so margin can't be
        computed honestly. Add a cost field to the Parts catalog to enable real profit numbers.
      </p>
    </Modal>
  );
}

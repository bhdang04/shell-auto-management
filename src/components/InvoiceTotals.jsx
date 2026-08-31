function money(n) {
  return "$" + n.toFixed(2);
}

/**
 * InvoiceTotals
 * Props: labor, parts, tax, due — all plain numbers. 
 */
export default function InvoiceTotals({ labor, parts, tax, due }) {
  return (
    <div className="bay-inv-foot">
      <div className="bay-tot-line">
        <div className="l">Labor</div>
        <div className="v">{money(labor)}</div>
      </div>
      <div className="bay-tot-line">
        <div className="l">Parts</div>
        <div className="v">{money(parts)}</div>
      </div>
      <div className="bay-tot-line">
        <div className="l">Tax</div>
        <div className="v">{money(tax)}</div>
      </div>
      <div className="bay-tot-line due">
        <div className="l">Balance Due</div>
        <div className="v">{money(due)}</div>
      </div>
    </div>
  );
}

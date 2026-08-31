function money(n) {
  return "$" + n.toFixed(2);
}

/**
 * VehicleHistory
 * Props:
 *  - history: null (no customer selected yet) | [] (selected, no past visits) | array of past invoices
 *  - onSelectInvoice(index): load a past invoice's line items into the ticket
 */
export default function VehicleHistory({ history, onSelectInvoice }) {
  return (
    <div className="veh-history">
      <div className="vh-title">Vehicle History</div>

      {!history ? (
        <div className="vh-empty">Search for a customer to see past visits.</div>
      ) : history.length === 0 ? (
        <div className="vh-empty">No previous visits — new customer.</div>
      ) : (
        history.map((h, i) => (
          <div className="vh-item" key={h.num} onClick={() => onSelectInvoice(i)}>
            <div className="vh-left">
              <div className="vh-num">
                #{h.num} · {h.date}
              </div>
              <div className="vh-desc">{h.desc}</div>
            </div>
            <div className="vh-right">
              <div className="vh-amt">{money(h.total)}</div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

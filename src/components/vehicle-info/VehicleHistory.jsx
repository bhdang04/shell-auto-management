function money(n) {
  return "$" + n.toFixed(2);
}

// Display-only shortening so long names don't crowd the row.
// Does NOT change what's saved in the database.
const PAY_SHORT = {
  "American Express": "Amex",
  Mastercard: "MC",
  "Debit Card": "Debit",
};

function payLabel(h) {
  if (!h.paymentMethod) return null;
  const short = PAY_SHORT[h.paymentMethod] || h.paymentMethod;
  return h.checkNumber ? `${short} #${h.checkNumber}` : short;
}

/**
 * VehicleHistory
 * Props:
 *  - history: null (no customer selected yet) | [] (selected, no past visits) | array of past invoices (newest first)
 *  - onSelectInvoice(index): load a past invoice's line items into the ticket
 *
 * The list sits in a fixed-height scroll box: the most recent visit is
 * always at the top, older ones are a scroll away.
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
        <div className="vh-scroll">
          {history.map((h, i) => {
            const pay = payLabel(h);
            // Paid invoices show how they were paid; open ones show their
            // status instead. Voided rows already carry a VOIDED tag below.
            const tag = pay || (h.status && h.status !== "Voided" ? h.status : null);
            return (
              <div
                className={`vh-item ${h.status === "Voided" ? "voided" : ""}`}
                key={h.id || h.num}
                onClick={() => onSelectInvoice(i)}
              >
                <div className="vh-left">
                  <div className="vh-num">
                    #{h.num} · {h.date}
                    {tag && <span className="vh-tag"> · {tag}</span>}
                  </div>
                  <div className="vh-desc">
                    {h.desc}
                    {h.status === "Voided" && <span className="vh-void-tag"> · VOIDED</span>}
                  </div>
                </div>
                <div className="vh-amt">{money(h.total)}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
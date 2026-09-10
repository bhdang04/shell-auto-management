// NOT USED YET

const STATUS_SHORT = {
  "In Bay": "Bay",
  "Waiting on Parts": "Parts",
  Ready: "Ready",
};

/**
 * Sidebar
 * Props:
 *  - customers: full customer list (used to build "today's board")
 *  - selectedCustomerId: id of whichever customer is currently loaded
 *  - onSelectCustomer(customer): load a customer into the repair order
 */
export default function Sidebar({ customers, selectedCustomerId, onSelectCustomer }) {
  const board = customers.filter((c) => c.history.length > 0);

  return (
    <div className="bay-side">
      <div className="grp-title">Today&rsquo;s Board</div>
      {board.map((c) => {
        const latest = c.history[0];
        const lastName = c.name.split(" ").slice(-1)[0];
        const model = c.vehicles[0]?.label.split(" ").slice(-1)[0] || "";
        return (
          <div
            key={c.id}
            className={`bay-status ${selectedCustomerId === c.id ? "on" : ""}`}
            onClick={() => onSelectCustomer(c)}
          >
            <span className="name">
              {lastName} · {model}
            </span>
            <span className="count">{STATUS_SHORT[latest.status] || latest.status}</span>
          </div>
        );
      })}

      <div className="grp-title" style={{ marginTop: 22 }}>
        Status
      </div>
      <div className="bay-status">
        <span className="name">Waiting on Parts</span>
        <span className="count">3</span>
      </div>
      <div className="bay-status">
        <span className="name">In Bay</span>
        <span className="count">6</span>
      </div>
      <div className="bay-status">
        <span className="name">Ready for Pickup</span>
        <span className="count">5</span>
      </div>

      <div className="grp-title" style={{ marginTop: 22 }}>
        Today
      </div>
      <div className="bay-status">
        <span className="name">Revenue</span>
        <span className="count">$3,410</span>
      </div>
      <div className="bay-status">
        <span className="name">Unpaid Balance</span>
        <span className="count">$1,205</span>
      </div>
    </div>
  );
}

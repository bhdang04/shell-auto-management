import { useEffect, useState } from "react";
import Modal from "./button-row/Modal";
import { getOpenBoard } from "../api/customers";

function money(n) {
  return "$" + Number(n || 0).toFixed(2);
}

/** Earliest upcoming appointment date for a row's vehicle, or null if none. */
function nextAppointmentDate(row) {
  const appts = row.vehicles?.appointments || [];
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = appts.map((a) => a.date).filter((d) => d >= today).sort();
  return upcoming[0] || null;
}

/**
 * OpenInvoicesPopup
 * Every invoice in the shop that isn't closed out yet (not "Ready for
 * Pickup" or "Paid") — lets you jump straight into any of them.
 *
 * Props:
 *  - onSelect(row): fired when a row is picked; row includes
 *    { id, num, vehicles: { id, customer_id, year, make, model, customers: { name } } }
 */
export default function OpenInvoicesPopup({ isOpen, onClose, onSelect }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    getOpenBoard()
      .then((data) => {
        setRows(data);
        setError(null);
      })
      .catch((err) => {
        console.error("Failed to load open invoices:", err);
        setError(err);
      })
      .finally(() => setLoading(false));
  }, [isOpen]);

  function handlePick(row) {
    onSelect(row);
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Open Repair Orders" variant="drawer">
      <div className="lookup-list">
        {loading && <div className="lookup-empty">Loading...</div>}
        {error && <div className="lookup-empty">Couldn&rsquo;t load — check your Supabase connection.</div>}
        {!loading && !error && rows.length === 0 && <div className="lookup-empty">Nothing open right now.</div>}
        {rows.map((row) => {
          const total = Number(row.labor_total) + Number(row.parts_total) + Number(row.tax);
          const scheduledDate = nextAppointmentDate(row);
          return (
            <div className="lookup-item" key={row.id} onClick={() => handlePick(row)}>
              <div className="li-top">
                <span className="code">#{row.num}</span>
                <span className="desc">
                  {row.vehicles?.customers?.name} &mdash;{" "}
                  {[row.vehicles?.year, row.vehicles?.make, row.vehicles?.model].filter(Boolean).join(" ")}
                </span>
              </div>
              {scheduledDate && (
                <div className="li-scheduled">Scheduled date: {scheduledDate}</div>
              )}
              <div className="li-bottom">
                <span className="price">{row.status}</span>
                <span className="price">{money(total)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
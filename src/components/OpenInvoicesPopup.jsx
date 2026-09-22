import { useEffect, useState } from "react";
import Modal from "./button-row/Modal";
import { getOpenBoard } from "../api/customers";
import { getTodaysAppointments } from "../api/appointments";

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

const STATUS_ORDER = ["In Bay", "Waiting on Parts", "Estimate", "Scheduled"];

function groupByStatus(rows) {
  const groups = {};
  for (const row of rows) {
    const key = row.status || "Other";
    if (!groups[key]) groups[key] = [];
    groups[key].push(row);
  }
  // Known statuses first, in a sensible order; anything unrecognized
  // (a status not in STATUS_ORDER) still shows up, just at the end.
  const known = STATUS_ORDER.filter((s) => groups[s]);
  const rest = Object.keys(groups).filter((s) => !STATUS_ORDER.includes(s));
  return [...known, ...rest].map((status) => ({ status, rows: groups[status] }));
}

/**
 * OpenInvoicesPopup
 * Two sections:
 *  - "Expected Today" — today's scheduled appointments whose vehicle
 *    doesn't already have an open invoice (i.e. hasn't checked in yet)
 *  - Open repair orders, grouped by status
 *
 * Props:
 *  - onSelect(row): fired when an open-invoice row is picked; row includes
 *    { id, num, vehicles: { id, customer_id, year, make, model, customers: { name } } }
 *  - onSelectAppointment(appt): fired when an "Expected Today" row is
 *    picked; appt includes { vehicle_id, customer_id, vehicles: {...} } —
 *    there's no invoice yet, so this should load the customer/vehicle and
 *    let a fresh ticket start rather than jumping to a specific invoice.
 */
export default function OpenInvoicesPopup({ isOpen, onClose, onSelect, onSelectAppointment }) {
  const [rows, setRows] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    Promise.all([getOpenBoard(), getTodaysAppointments()])
      .then(([board, appts]) => {
        setRows(board);
        setAppointments(appts);
        setError(null);
      })
      .catch((err) => {
        console.error("Failed to load shop board:", err);
        setError(err);
      })
      .finally(() => setLoading(false));
  }, [isOpen]);

  function handlePick(row) {
    onSelect(row);
    onClose();
  }

  function handlePickAppointment(appt) {
    onSelectAppointment(appt);
    onClose();
  }

  const openVehicleIds = new Set(rows.map((r) => r.vehicles?.id).filter(Boolean));
  const notCheckedIn = appointments.filter((a) => !openVehicleIds.has(a.vehicle_id));
  const grouped = groupByStatus(rows);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Open Repair Orders" variant="drawer">
      <div className="lookup-list">
        {loading && <div className="lookup-empty">Loading...</div>}
        {error && <div className="lookup-empty">Couldn&rsquo;t load — check your Supabase connection.</div>}

        {!loading && !error && (
          <>
            {notCheckedIn.length > 0 && (
              <>
                <div className="board-section-title">Expected Today</div>
                {notCheckedIn.map((appt) => (
                  <div className="lookup-item expected" key={appt.id} onClick={() => handlePickAppointment(appt)}>
                    <div className="li-top">
                      <span className="code">Appt</span>
                      <span className="desc">
                        {appt.vehicles?.customers?.name} &mdash;{" "}
                        {[appt.vehicles?.year, appt.vehicles?.make, appt.vehicles?.model].filter(Boolean).join(" ")}
                      </span>
                    </div>
                    {appt.note && <div className="li-scheduled">{appt.note}</div>}
                    <div className="li-bottom">
                      <span className="price">Not checked in</span>
                    </div>
                  </div>
                ))}
              </>
            )}

            {rows.length === 0 && notCheckedIn.length === 0 && (
              <div className="lookup-empty">Nothing open, nothing expected today.</div>
            )}

            {grouped.map(({ status, rows: statusRows }) => (
              <div key={status}>
                <div className="board-section-title">
                  {status} <span className="board-section-count">({statusRows.length})</span>
                </div>
                {statusRows.map((row) => {
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
                      {scheduledDate && <div className="li-scheduled">Scheduled date: {scheduledDate}</div>}
                      <div className="li-bottom">
                        <span className="price">{money(total)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </>
        )}
      </div>
    </Modal>
  );
}
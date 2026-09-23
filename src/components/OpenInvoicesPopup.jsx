import { useEffect, useState } from "react";
import Modal from "./button-row/Modal";
import { getOpenBoard } from "../api/customers";
import { getTodaysAppointments } from "../api/appointments";
import { updateInvoiceStatus } from "../api/invoices";
import { supabase } from "../lib/supabaseClient";

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

const STATUS_ORDER = ["In Bay", "Waiting on Parts", "Estimate", "Scheduled", "Ready for Pickup"];

function groupByStatus(rows) {
  const groups = {};
  for (const row of rows) {
    const key = row.status || "Other";
    if (!groups[key]) groups[key] = [];
    groups[key].push(row);
  }
  // Every known status gets a section, even with zero invoices — so the
  // board always shows the full shape of the shop's workflow, not just
  // whatever happens to be non-empty right now.
  const known = STATUS_ORDER.map((status) => ({ status, rows: groups[status] || [] }));
  const extra = Object.keys(groups)
    .filter((s) => !STATUS_ORDER.includes(s))
    .map((status) => ({ status, rows: groups[status] }));
  return [...known, ...extra];
}

/**
 * OpenInvoicesPopup
 * Two sections:
 *  - "Expected Today" — today's scheduled appointments whose vehicle
 *    doesn't already have an open invoice (i.e. hasn't checked in yet)
 *  - Open repair orders, grouped by status (every status shown, even empty)
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
  const [updatingId, setUpdatingId] = useState(null);

  function refresh() {
    Promise.all([getOpenBoard(), getTodaysAppointments()])
      .then(([board, appts]) => {
        setRows(board);
        setAppointments(appts);
        setError(null);
      })
      .catch((err) => {
        console.error("Failed to load shop board:", err);
        setError(err);
      });
  }

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    refresh();
    setLoading(false);
  }, [isOpen]);

  // Live updates while the drawer is open: any insert/update/delete on
  // invoices or appointments (status change, new ticket, void, a same-day
  // booking) re-pulls the board so it never goes stale while someone's
  // actually looking at it.
  useEffect(() => {
    if (!isOpen) return;

    const channel = supabase
      .channel("open-board-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "invoices" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments" }, refresh)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  function handlePick(row) {
    onSelect(row);
    onClose();
  }

  function handlePickAppointment(appt) {
    onSelectAppointment(appt);
    onClose();
  }

  /** Changes a row's status right from the board, without opening the
   *  full ticket. Only among the open-workflow statuses — moving to Paid
   *  or Voided has its own dedicated flow (Take Payment / Void Invoice)
   *  that also records payment info or a reason, so those aren't offered
   *  here. */
  async function handleStatusChange(row, newStatus) {
    if (newStatus === row.status) return;
    setUpdatingId(row.id);
    try {
      await updateInvoiceStatus(row.id, newStatus);
      // The live subscription will also refresh this, but updating
      // optimistically avoids a visible flicker back to the old value
      // while waiting on the round trip.
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, status: newStatus } : r)));
    } catch (err) {
      console.error("Failed to update status:", err);
      alert("Couldn't update status — try again.");
    } finally {
      setUpdatingId(null);
    }
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

            {grouped.map(({ status, rows: statusRows }) => (
              <div key={status}>
                <div className="board-section-title">
                  {status} <span className="board-section-count">({statusRows.length})</span>
                </div>
                {statusRows.length === 0 ? (
                  <div className="lookup-empty">Nothing in this status.</div>
                ) : (
                  statusRows.map((row) => {
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
                          <select
                            className="board-status-select"
                            value={row.status}
                            disabled={updatingId === row.id}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => handleStatusChange(row, e.target.value)}
                          >
                            {STATUS_ORDER.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            ))}
          </>
        )}
      </div>
    </Modal>
  );
}
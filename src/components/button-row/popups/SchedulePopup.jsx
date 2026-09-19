import { useState } from "react";
import Modal from "../Modal";
import { createAppointment } from "../../../api/appointments";

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTH_LABELS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function toDateStr(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function startOfToday() {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t;
}

/**
 * SchedulePopup
 * Real month-grid calendar — click a day to pick it, navigate months with
 * the arrows, then confirm to save a real appointment for the currently
 * loaded vehicle.
 *
 * Props:
 *  - vehicleId, customerId: who/what this appointment is for
 *  - vehicleLabel: shown for context
 */
export default function SchedulePopup({ isOpen, onClose, vehicleId, customerId, vehicleLabel }) {
  const today = startOfToday();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth()); // 0-11
  const [selectedDate, setSelectedDate] = useState(null); // "YYYY-MM-DD"
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  function resetAndClose() {
    setSelectedDate(null);
    setNote("");
    setError(null);
    onClose();
  }

  function changeMonth(delta) {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 0) {
      m = 11;
      y -= 1;
    } else if (m > 11) {
      m = 0;
      y += 1;
    }
    setViewMonth(m);
    setViewYear(y);
  }

  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const leadingBlanks = firstOfMonth.getDay(); // 0 = Sunday

  const cells = [];
  for (let i = 0; i < leadingBlanks; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  async function handleConfirm() {
    if (!selectedDate || !vehicleId) return;
    setSaving(true);
    setError(null);
    try {
      await createAppointment({ vehicleId, customerId, date: selectedDate, note });
      resetAndClose();
    } catch (err) {
      console.error("Failed to schedule appointment:", err);
      setError(err.message || "Couldn't save this appointment.");
    }
    setSaving(false);
  }

  return (
    <Modal isOpen={isOpen} onClose={resetAndClose} title="Schedule Follow-up" variant="console">
      {!vehicleId ? (
        <p style={{ fontSize: 13, color: "var(--muted)" }}>
          Select a customer and vehicle first — an appointment needs to be tied to one.
        </p>
      ) : (
        <>
          <p style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 14 }}>
            Booking a follow-up for {vehicleLabel || "this vehicle"}.
          </p>

          <div className="cal-header">
            <button className="cal-nav" onClick={() => changeMonth(-1)} title="Previous month">
              ‹
            </button>
            <span className="cal-month-label">
              {MONTH_LABELS[viewMonth]} {viewYear}
            </span>
            <button className="cal-nav" onClick={() => changeMonth(1)} title="Next month">
              ›
            </button>
          </div>

          <div className="cal-grid cal-dow">
            {DAY_LABELS.map((d, i) => (
              <div className="cal-dow-label" key={i}>
                {d}
              </div>
            ))}
          </div>

          <div className="cal-grid">
            {cells.map((d, i) => {
              if (d === null) return <div key={i} className="cal-day blank" />;
              const dateStr = toDateStr(viewYear, viewMonth, d);
              const cellDate = new Date(viewYear, viewMonth, d);
              const isPast = cellDate < today;
              const isToday = dateStr === toDateStr(today.getFullYear(), today.getMonth(), today.getDate());
              const isSelected = dateStr === selectedDate;
              return (
                <div
                  key={i}
                  className={`cal-day ${isPast ? "busy" : "open"} ${isSelected ? "on" : ""} ${isToday ? "today" : ""}`}
                  onClick={() => !isPast && setSelectedDate(dateStr)}
                >
                  {d}
                </div>
              );
            })}
          </div>

          <div className="field" style={{ marginTop: 14 }}>
            <label>Note (optional)</label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Follow-up on brake inspection"
            />
          </div>

          {error && (
            <div className="lookup-empty" style={{ color: "var(--bad)" }}>
              {error}
            </div>
          )}

          <div className="btn-row">
            <button className="btn" onClick={resetAndClose} disabled={saving}>
              Cancel
            </button>
            <button className="btn primary" onClick={handleConfirm} disabled={saving || !selectedDate}>
              {saving ? "Saving..." : selectedDate ? `Confirm ${selectedDate}` : "Pick a date"}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}

import { useState } from "react";
import Popup from "../Modal";

// TODO: replace with real availability (Supabase table or a calendar API).
const DAYS = [
  { label: "Mon 24", status: "busy" },
  { label: "Tue 25", status: "open" },
  { label: "Wed 26", status: "open" },
  { label: "Thu 27", status: "busy" },
  { label: "Fri 28", status: "open" },
  { label: "Sat 29", status: "busy" },
  { label: "Sun 30", status: "busy" },
];

/**
 * SchedulePopup
 * Pick a day for the vehicle's next appointment.
 * TODO: wire onConfirm to actually create a scheduled appointment record.
 */
export default function SchedulePopup({ isOpen, onClose }) {
  const [selected, setSelected] = useState(null);

  return (
    <Popup isOpen={isOpen} onClose={onClose} title="Schedule Follow-up" variant="console">
      <p style={{ fontSize: 12.5, color: "var(--muted)" }}>
        Pick a day for the next appointment on this vehicle.
      </p>
      <div className="cal-grid">
        {DAYS.map((d) => (
          <div
            key={d.label}
            className={`cal-day ${d.status} ${selected === d.label ? "on" : ""}`}
            onClick={() => d.status === "open" && setSelected(d.label)}
          >
            {d.label}
          </div>
        ))}
      </div>
      <div className="btn-row" style={{ marginTop: 20 }}>
        <button className="btn" onClick={onClose}>
          Cancel
        </button>
        <button className="btn primary" onClick={onClose}>
          Confirm Time
        </button>
      </div>
    </Popup>
  );
}

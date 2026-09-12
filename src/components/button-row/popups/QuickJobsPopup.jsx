import Popup from "../Modal";

// TODO: replace with real, editable job bundles (Supabase table), each expanding
// into a preset group of labor + part line items when picked.
const QUICK_JOBS = [
  { name: "Oil Change", desc: "Oil, filter, inspection", total: 89.0 },
  { name: "Brake Job (Front)", desc: "Pads, rotors, labor", total: 412.0 },
  { name: "Coolant System Repair", desc: "Sensor, tank, labor", total: 723.5 },
  { name: "Tire Rotation", desc: "Rotation + inspection", total: 27.0 },
  { name: "Battery Replace", desc: "Battery + install", total: 165.0 },
  { name: "A/C Recharge", desc: "Refrigerant + labor", total: 140.0 },
];

/**
 * QuickJobsPopup
 * Pick a canned job to drop its whole line-item bundle into the ticket at once.
 * TODO: wire onPick to actually append the job's line items via the parent.
 */
export default function QuickJobsPopup({ isOpen, onClose, onPick }) {
  function handlePick(job) {
    if (onPick) onPick(job);
    onClose();
  }

  return (
    <Popup isOpen={isOpen} onClose={onClose} title="Quick Jobs" variant="console">
      <p style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 14 }}>
        Pick a canned job to drop in its whole line-item bundle at once.
      </p>
      <div className="grid-3">
        {QUICK_JOBS.map((job) => (
          <div className="job-card" key={job.name} onClick={() => handlePick(job)}>
            <div className="jn">{job.name}</div>
            <div className="jd">
              {job.desc} — ${job.total.toFixed(2)}
            </div>
          </div>
        ))}
      </div>
    </Popup>
  );
}

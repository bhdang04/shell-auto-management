import { useState } from "react";
import PartsPopup from "./popups/PartsPopup";
import LaborPopup from "./popups/LaborPopup";
import QuickJobsPopup from "./popups/QuickJobsPopup";
import ProfitPopup from "./popups/ProfitPopup";
import DonePopup from "./popups/DonePopup";
import NotePopup from "./popups/NotePopup";
import EstimatePopup from "./popups/EstimatePopup";
import SchedulePopup from "./popups/SchedulePopup";

const ACTIONS = [
  { key: "parts", label: "Parts" },
  { key: "labor", label: "Labor" },
  { key: "quickJobs", label: "Quick Jobs" },
  { key: "profit", label: "Profit" },
  { key: "done", label: "Done" },
  { key: "note", label: "Note" },
  { key: "estimate", label: "Estimate" },
  { key: "schedule", label: "Schedule" },
];

/**
 * QuickActions
 * Row of shortcut buttons below the Customer/Vehicle form. All stubbed —
 * wire up onClick handlers per-button as each one gets built out.
 */
export default function QuickActions() {
  const [activePopup, setActivePopup] = useState(null);
  const close = () => setActivePopup(null);
  
  return (
    <>
      <div className="quick-actions">
        {ACTIONS.map((label) => (
          <button key={label} className="quick-action-btn" onClick={() => {}}>
            {label}
          </button>
        ))}
      </div>

      <PartsPopup isOpen={activePopup === "parts"} onClose={close} />
      <LaborPopup isOpen={activePopup === "labor"} onClose={close} />
      <QuickJobsPopup isOpen={activePopup === "quickJobs"} onClose={close} />
      <ProfitPopup isOpen={activePopup === "profit"} onClose={close} />
      <DonePopup isOpen={activePopup === "done"} onClose={close} />
      <NotePopup isOpen={activePopup === "note"} onClose={close} />
      <EstimatePopup isOpen={activePopup === "estimate"} onClose={close} />
      <SchedulePopup isOpen={activePopup === "schedule"} onClose={close} />
    </>
  );
}

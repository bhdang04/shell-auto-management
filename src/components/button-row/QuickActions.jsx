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
 * Row of shortcut buttons below the Customer/Vehicle form. Each button owns
 * its own popup file under ./popups — this component just tracks which one
 * (if any) is currently open, and forwards catalog picks up to the ticket.
 *
 * Props:
 *  - onAddPart(catalogItem), onAddLabor(catalogItem), onAddJob(catalogItem):
 *    called when a row is picked in the respective popup, so the parent
 *    can insert a line item.
 */
export default function QuickActions({ onAddPart, onAddLabor, onAddJob }) {
  const [activePopup, setActivePopup] = useState(null);
  const close = () => setActivePopup(null);

  return (
    <>
      <div className="quick-actions">
        {ACTIONS.map((a) => (
          <button key={a.key} className="quick-action-btn" onClick={() => setActivePopup(a.key)}>
            {a.label}
          </button>
        ))}
      </div>

      <PartsPopup isOpen={activePopup === "parts"} onClose={close} onPick={onAddPart} />
      <LaborPopup isOpen={activePopup === "labor"} onClose={close} onPick={onAddLabor} />
      <QuickJobsPopup isOpen={activePopup === "quickJobs"} onClose={close} onPick={onAddJob} />
      <ProfitPopup isOpen={activePopup === "profit"} onClose={close} />
      <DonePopup isOpen={activePopup === "done"} onClose={close} />
      <NotePopup isOpen={activePopup === "note"} onClose={close} />
      <EstimatePopup isOpen={activePopup === "estimate"} onClose={close} />
      <SchedulePopup isOpen={activePopup === "schedule"} onClose={close} />
    </>
  );
}

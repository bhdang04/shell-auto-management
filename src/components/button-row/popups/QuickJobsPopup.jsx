import { useState } from "react";
import Modal from "../Modal";
import QuickJobPicker from "./QuickJobsList";
import QuickJobsAdminPopup from "./QuickJobsAdminPopup";
import { CATEGORIES } from "../../../api/quickJobs";

/**
 * QuickJobsPopup
 * Two levels:
 *  1. Pick a category
 *  2. Pick a quick job from Supabase
 *
 * QuickJobPicker handles loading/searching the quick_jobs table.
 */
export default function QuickJobsPopup({ isOpen, onClose, onPick }) {
  const [category, setCategory] = useState(null);
  const [adminOpen, setAdminOpen] = useState(false);

  function handlePick(lines) {
    if (onPick) onPick(lines);
    handleClose();
  }

  function handleClose() {
    setCategory(null);
    onClose();
  }

  return (
    <>
      <Modal isOpen={isOpen} onClose={handleClose} title={category || "Quick Jobs"} variant="console">
        {!category ? (
          <>
            <div className="lookup-toolbar">
              <button className="btn-small" onClick={() => setAdminOpen(true)}>
                Manage Quick Jobs
              </button>
            </div>
            <div className="job-category-grid">
              {CATEGORIES.map((c) => (
                <div key={c} className="job-category-card" onClick={() => setCategory(c)}>
                  {c}
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <button className="job-back-btn" onClick={() => setCategory(null)}>
              ← All Categories
            </button>
            <QuickJobPicker category={category} onPick={handlePick} />
          </>
        )}
      </Modal>

      <QuickJobsAdminPopup isOpen={adminOpen} onClose={() => setAdminOpen(false)} />
    </>
  );
}
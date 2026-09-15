import { useState } from "react";
import Modal from "../Modal";
import CatalogList from "./CatalogList";

const CATEGORIES = [
  "Kit Jobs",
  "Transmission",
  "Oil Changes",
  "Tune Ups",
  "A/C",
  "Brakes",
  "Cooling",
  "Analysis & Inspections",
  "Additional Service",
];

/**
 * QuickJobsPopup
 * Two levels: pick a category first (Brakes, Oil Changes, etc.), then pick
 * a specific service within it. Services are catalog rows with type="job"
 * and a matching category — reuses CatalogList for search/add/edit/delete,
 * same as Parts and Labor.
 */
export default function QuickJobsPopup({ isOpen, onClose, onPick }) {
  const [category, setCategory] = useState(null);

  function handlePick(item) {
    if (onPick) onPick(item);
    onClose();
  }

  function handleClose() {
    setCategory(null); // reset to the category grid for next time it opens
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={category || "Quick Jobs"} variant="console">
      {!category ? (
        <div className="job-category-grid">
          {CATEGORIES.map((c) => (
            <div key={c} className="job-category-card" onClick={() => setCategory(c)}>
              {c}
            </div>
          ))}
        </div>
      ) : (
        <>
          <button className="job-back-btn" onClick={() => setCategory(null)}>
            ← All Categories
          </button>
          <CatalogList type="job" category={category} onPick={handlePick} />
        </>
      )}
    </Modal>
  );
}

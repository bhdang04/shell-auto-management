import { useState } from "react";
import Popup from "../Modal";
import CatalogList from "./CatalogList";

const CONDITIONS = [
  { value: "", label: "New" },
  { value: "U", label: "Used (U)" },
  { value: "R", label: "Rebuilt (R)" },
];

export default function PartsPopup({ isOpen, onClose, onPick }) {
  const [pending, setPending] = useState(null);

  function handleClose() {
    setPending(null);
    onClose();
  }

  function handleCondition(condition) {
    if (onPick) onPick({ ...pending, condition });
    handleClose();
  }

  return (
    <Popup isOpen={isOpen} onClose={handleClose} title={pending ? "Part Condition" : "Parts"} variant="drawer">
      {pending ? (
        <>
          <button className="job-back-btn" onClick={() => setPending(null)}>
            ← Back to parts
          </button>

          <div className="lookup-item" style={{ cursor: "default", marginBottom: 18 }}>
            <div className="li-top">
              {pending.code ? <span className="code">{pending.code}</span> : null}
              <span className="desc">{pending.description}</span>
            </div>
            <div className="li-bottom">
              <span className="price">${Number(pending.price || 0).toFixed(2)}</span>
            </div>
          </div>

          <div className="board-section-title">Condition</div>
          <div className="pay-grid">
            {CONDITIONS.map((c) => (
              <button key={c.label} className="pay-btn" onClick={() => handleCondition(c.value)}>
                {c.label}
              </button>
            ))}
          </div>
        </>
      ) : (
        <CatalogList type="part" onPick={setPending} />
      )}
    </Popup>
  );
}
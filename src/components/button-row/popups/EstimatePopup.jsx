import { useState } from "react";
import Popup from "../Modal";

const TABS = ["Line Items", "Customer View", "Send"];

/**
 * EstimatePopup
 * Build and send a pre-approval estimate to the customer, separate from
 * the live repair order ticket.
 * TODO: pull real line items in via props instead of the placeholder rows,
 * and wire the Send button to an actual email/SMS integration.
 */
export default function EstimatePopup({ isOpen, onClose }) {
  const [tab, setTab] = useState(TABS[0]);

  return (
    <Popup isOpen={isOpen} onClose={onClose} title="Build Estimate" variant="console">
      <div className="console-tabs">
        {TABS.map((t) => (
          <div key={t} className={`console-tab ${tab === t ? "on" : ""}`} onClick={() => setTab(t)}>
            {t}
          </div>
        ))}
      </div>

      {tab === "Line Items" && (
        <>
          <div className="console-line">
            <span>R&amp;R front brake pads &amp; rotors</span>
            <span>$180.00</span>
          </div>
          <div className="console-line">
            <span>Front brake pads — Wagner</span>
            <span>$96.00</span>
          </div>
          <div className="console-line">
            <span>Front rotors (pair)</span>
            <span>$118.00</span>
          </div>
        </>
      )}
      {tab === "Customer View" && (
        <p style={{ fontSize: 13, color: "var(--muted)" }}>Customer-facing preview goes here.</p>
      )}
      {tab === "Send" && (
        <p style={{ fontSize: 13, color: "var(--muted)" }}>Email / text delivery options go here.</p>
      )}

      <div className="btn-row">
        <button className="btn" onClick={onClose}>
          Save Draft
        </button>
        <button className="btn primary" onClick={onClose}>
          Send to Customer
        </button>
      </div>
    </Popup>
  );
}

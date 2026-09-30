import { useState } from "react";
import Modal from "../Modal";

const TABS = ["Line Items", "Customer View"];

function money(n) {
  return "$" + Number(n || 0).toFixed(2);
}

/**
 * EstimatePopup
 * Shows the real line items and totals from the currently loaded ticket.
 *
 * NOTE: "Send to Customer" is still a stub — actually emailing/texting an
 * estimate needs a provider (SendGrid, Twilio, etc.) wired in, which this
 * app doesn't have yet. The button is here so the flow reads correctly;
 * it just alerts for now instead of silently doing nothing.
 *
 * Props: items (current ticket items), totals = { labor, parts, tax, due }
 */
export default function EstimatePopup({ isOpen, onClose, items, totals, onPrint }) {
  const [tab, setTab] = useState(TABS[0]);
  const realItems = (items || []).filter((it) => it.kind !== "comment");
  const t = totals || { labor: 0, parts: 0, tax: 0, due: 0 };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Build Estimate" variant="console">
      <div className="console-tabs">
        {TABS.map((tName) => (
          <div key={tName} className={`console-tab ${tab === tName ? "on" : ""}`} onClick={() => setTab(tName)}>
            {tName}
          </div>
        ))}
      </div>

      {tab === "Line Items" &&
        (realItems.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--muted)" }}>No line items on this ticket yet.</p>
        ) : (
          <>
            {realItems.map((it, i) => (
              <div className="console-line" key={i}>
                <span>{it.desc}</span>
                <span>{it.qty === "" || it.price === "" ? "—" : money(it.total)}</span>
              </div>
            ))}
            <div className="console-line" style={{ fontWeight: 700, borderTop: "1px solid var(--line)", marginTop: 6, paddingTop: 10 }}>
              <span>Estimated Total</span>
              <span>{money(t.due)}</span>
            </div>
          </>
        ))}

      {tab === "Customer View" && (
        <>
          {realItems.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--muted)" }}>Nothing to show the customer yet.</p>
          ) : (
            realItems.map((it, i) => (
              <div className="console-line" key={i}>
                <span>{it.desc}</span>
                <span>{it.qty === "" || it.price === "" ? "TBD" : money(it.total)}</span>
              </div>
            ))
          )}
          <div className="console-line" style={{ fontWeight: 700, borderTop: "1px solid var(--line)", marginTop: 6, paddingTop: 10 }}>
            <span>Total Estimate</span>
            <span>{money(t.due)}</span>
          </div>
        </>
      )}

      {tab === "Send" && (
        <p style={{ fontSize: 13, color: "var(--muted)" }}>
          Email/text delivery isn't connected yet — needs a provider (SendGrid, Twilio, etc.) wired
          in before this can actually send.
        </p>
      )}

      <div className="btn-row">
        <button className="btn" onClick={onClose}>
          Close
        </button>
        <button
          className="btn primary"
          disabled={realItems.length === 0}
          onClick={() => {
            onPrint?.();
            onClose();
          }}
        >
          Print Estimate
        </button>
      </div>
    </Modal>
  );
}

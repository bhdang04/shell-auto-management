import { useState } from "react";

/**
 * TopBar
 * Props:
 *  - onNewRO(): clears the form and starts a blank repair order
 *  - onJumpSearch(query): called on Enter — look up by invoice #, plate, or VIN
 */
export default function TopBar({ onNewRO, onJumpSearch }) {
  const [query, setQuery] = useState("");

  function handleKeyDown(e) {
    if (e.key === "Enter" && query.trim()) {
      onJumpSearch(query.trim());
    }
  }

  return (
    <div className="bay-top">
      <div className="bay-logo">
        <div className="mark">S</div>
        <div>
          <h1>Shell Complete Auto</h1>
          <span>Shop Floor Board</span>
        </div>
      </div>

      <div className="bay-search">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Jump to invoice #, plate, or VIN..."
          autoComplete="off"
        />
      </div>

      <button className="bay-new" onClick={onNewRO}>
        + New Repair Order
      </button>
    </div>
  );
}

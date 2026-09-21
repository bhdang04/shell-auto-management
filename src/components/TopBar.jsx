import { useState } from "react";

/**
 * TopBar
 * Props:
 *  - onNewRO(): clears the form and starts a blank repair order
 *  - onJumpSearch(query): look up by invoice #, plate, or VIN — should
 *    return true if a match was found, false otherwise, so this can show
 *    real feedback instead of silently doing nothing either way
 *  - onShowOpenInvoices(): opens the shop-wide open-invoices panel
 *  - onLogout(): optional — shows a Log Out link when provided
 */
export default function TopBar({ onNewRO, onJumpSearch, onShowOpenInvoices, onLogout }) {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [notFound, setNotFound] = useState(false);

  async function runSearch() {
    if (!query.trim() || searching) return;
    setSearching(true);
    setNotFound(false);
    const found = await onJumpSearch(query.trim());
    setSearching(false);
    if (found) {
      setQuery("");
    } else {
      setNotFound(true);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") runSearch();
  }

  function handleChange(e) {
    setQuery(e.target.value);
    if (notFound) setNotFound(false);
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
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Jump to invoice #, plate, or VIN..."
          autoComplete="off"
        />
        <button
          className="bay-search-btn"
          onClick={runSearch}
          disabled={searching || !query.trim()}
          title="Search"
        >
          {searching ? "..." : "🔍"}
        </button>
        {notFound && <div className="bay-search-feedback">No match for &ldquo;{query}&rdquo;</div>}
      </div>

      <button className="bay-new" onClick={onNewRO}>
        + New Repair Order
      </button>
      <button className="bay-open-invoices" onClick={onShowOpenInvoices}>
        Open Invoices
      </button>
      <button className="bay-reports" onClick={() => alert("Reports not implemented yet")}>
        Reports
      </button>
      {onLogout && (
        <button className="bay-logout" onClick={onLogout}>
          Log Out
        </button>
      )}
    </div>
  );
}
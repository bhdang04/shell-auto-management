import { useEffect, useRef, useState } from "react";
import { searchCustomersByName } from "../../api/customers";

/**
 * CustomerSearch
 * Renders First Name / Last Name fields with a live match dropdown —
 * typing in either searches Supabase directly (debounced). No standalone
 * "Name" field or "+ create new" option here: creating a brand-new
 * customer goes through the Save/Create Customer button on the page
 * instead, once these fields are filled in with no match selected.
 *
 * Props:
 *  - firstName, lastName: current field values (controlled by the parent)
 *  - onFirstNameChange(value), onLastNameChange(value): fired on keystroke
 *  - onSelectCustomer(customer): fired when a dropdown match is clicked —
 *    receives the shallow search result; the parent fetches the full record
 */
export default function CustomerSearch({ firstName, lastName, onFirstNameChange, onLastNameChange, onSelectCustomer }) {
  const [showDrop, setShowDrop] = useState(false);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setShowDrop(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const hasQuery = firstName.trim().length > 0 || lastName.trim().length > 0;

  // Debounced live search — waits 250ms after the last keystroke in either
  // field before hitting Supabase.
  useEffect(() => {
    if (!hasQuery) {
      setMatches([]);
      return;
    }
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const results = await searchCustomersByName({ firstName, lastName });
        setMatches(results);
      } catch (err) {
        console.error("Customer search failed:", err);
        setMatches([]);
      }
      setLoading(false);
    }, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstName, lastName]);

  function handleFirstInput(e) {
    onFirstNameChange(e.target.value);
    setShowDrop(e.target.value.trim().length > 0 || lastName.trim().length > 0);
  }
  function handleLastInput(e) {
    onLastNameChange(e.target.value);
    setShowDrop(e.target.value.trim().length > 0 || firstName.trim().length > 0);
  }

  return (
    <div className="field-row" ref={wrapRef} style={{ position: "relative" }}>
      <div className="field">
        <label>First Name</label>
        <input
          value={firstName}
          onChange={handleFirstInput}
          onFocus={() => hasQuery && setShowDrop(true)}
          placeholder="First name"
          autoComplete="off"
        />
      </div>
      <div className="field has-icon">
        <label>Last Name</label>
        <input
          value={lastName}
          onChange={handleLastInput}
          onFocus={() => hasQuery && setShowDrop(true)}
          placeholder="Last name"
          autoComplete="off"
        />
        <span className="ic">🔍</span>
      </div>

      {showDrop && hasQuery && (
        <div className="search-drop">
          {loading && <div className="search-empty">Searching...</div>}
          {!loading &&
            matches.map((c) => (
              <div
                className="search-item"
                key={c.id}
                onClick={() => {
                  onSelectCustomer(c);
                  setShowDrop(false);
                }}
              >
                <div>
                  <div className="si-name">{c.name}</div>
                  <div className="si-veh">
                    {c.vehicles?.length
                      ? `${c.vehicles.length} vehicle${c.vehicles.length > 1 ? "s" : ""} on file`
                      : "No vehicle on file"}
                  </div>
                </div>
                <div className="si-phone">{c.phone1}</div>
              </div>
            ))}
          {!loading && matches.length === 0 && (
            <div className="search-empty">
              No match for &ldquo;{[firstName, lastName].filter(Boolean).join(" ")}&rdquo;
            </div>
          )}
        </div>
      )}
    </div>
  );
}
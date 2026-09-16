import { useEffect, useRef, useState } from "react";
import { searchCustomers } from "../../api/customers";

/**
 * CustomerSearch
 * Renders the "Name" field with a live match dropdown, like InvoMax's
 * customer lookup — but also lets you keep typing to create a new customer.
 * Search hits Supabase directly (debounced) instead of filtering a local list.
 *
 * Props:
 *  - nameValue: current value of the name field (controlled by the parent)
 *  - onNameChange(value): fired on every keystroke
 *  - onSelectCustomer(customer): fired when a dropdown match is clicked —
 *    receives the shallow search result; the parent fetches the full record
 *  - onCreateNew(name): fired when "Create new customer" is clicked
 */
export default function CustomerSearch({ nameValue, onNameChange, onSelectCustomer, onCreateNew }) {
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

  // Debounced live search — waits 250ms after the last keystroke before
  // hitting Supabase, so typing a full name doesn't fire a request per letter.
  useEffect(() => {
    const query = nameValue.trim();
    if (!query) {
      setMatches([]);
      return;
    }
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const results = await searchCustomers(query);
        setMatches(results);
      } catch (err) {
        console.error("Customer search failed:", err);
        setMatches([]);
      }
      setLoading(false);
    }, 250);
    return () => clearTimeout(timer);
  }, [nameValue]);

  function handleInput(e) {
    onNameChange(e.target.value);
    setShowDrop(e.target.value.trim().length > 0);
  }

  return (
    <div className="field-row single" ref={wrapRef}>
      <div className="field has-icon">
        <label>Name</label>
        <input
          value={nameValue}
          onChange={handleInput}
          onFocus={() => nameValue.trim() && setShowDrop(true)}
          placeholder="Start typing to search or add new..."
          autoComplete="off"
        />
        <span className="ic">🔍</span>

        {showDrop && (
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
              <div className="search-empty">No match for &ldquo;{nameValue}&rdquo;</div>
            )}
            <div
              className="search-create"
              onClick={() => {
                onCreateNew(nameValue);
                setShowDrop(false);
              }}
            >
              + Create new customer &ldquo;{nameValue}&rdquo;
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

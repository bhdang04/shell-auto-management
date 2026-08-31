import { useEffect, useRef, useState } from "react";

/**
 * CustomerSearch
 * Renders the "Name" field with a live match dropdown, like InvoMax's
 * customer lookup — but also lets you keep typing to create a new customer.
 *
 * Props:
 *  - customers: full customer list to search against
 *  - nameValue: current value of the name field (controlled by the parent)
 *  - onNameChange(value): fired on every keystroke
 *  - onSelectCustomer(customer): fired when a dropdown match is clicked
 *  - onCreateNew(name): fired when "Create new customer" is clicked
 */
export default function CustomerSearch({
  customers,
  nameValue,
  onNameChange,
  onSelectCustomer,
  onCreateNew,
}) {
  const [showDrop, setShowDrop] = useState(false);
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

  const query = nameValue.trim().toLowerCase();
  const matches = query.length
    ? customers.filter((c) => c.name.toLowerCase().includes(query))
    : [];

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
            {matches.length > 0 ? (
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
                      {c.vehicles[0] ? c.vehicles[0].label : "No vehicle on file"}
                    </div>
                  </div>
                  <div className="si-phone">{c.phone1}</div>
                </div>
              ))
            ) : (
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

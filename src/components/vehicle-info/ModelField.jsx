import { useEffect, useRef, useState } from "react";
import { getModelsForMake } from "../../api/vehicleLookup";

/**
 * ModelField
 * Type-ahead against NHTSA's model list for whichever make (and, if given,
 * year) is already filled in. Disabled until a make is present, since
 * models are always looked up relative to one.
 * Props: value, onChange, make, year
 */
export default function ModelField({ value, onChange, make, year }) {
  const [showDrop, setShowDrop] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setShowDrop(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!make?.trim()) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const models = await getModelsForMake(make.trim(), year?.trim());
        const q = value.trim().toUpperCase();
        const matches = q ? models.filter((m) => m.toUpperCase().includes(q)) : models;
        setSuggestions(matches.slice(0, 8));
      } catch (err) {
        console.error("Model lookup failed:", err);
        setSuggestions([]);
      }
      setLoading(false);
    }, 250);
    return () => clearTimeout(timer);
  }, [value, make, year]);

  function pick(m) {
    onChange(m);
    setShowDrop(false);
  }

  const disabled = !make?.trim();

  return (
    <div className="field has-icon" ref={wrapRef}>
      <label>Model</label>
      <input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setShowDrop(true);
        }}
        onFocus={() => !disabled && setShowDrop(true)}
        placeholder={disabled ? "Enter make first" : "e.g. Tacoma"}
        autoComplete="off"
        disabled={disabled}
      />
      <span className="ic">🔍</span>
      {showDrop && !disabled && (
        <div className="search-drop">
          {loading && <div className="search-empty">Searching...</div>}
          {!loading && suggestions.length === 0 && (
            <div className="search-empty">No matches — keep typing freely</div>
          )}
          {!loading &&
            suggestions.map((m) => (
              <div className="search-item" key={m} onClick={() => pick(m)}>
                <div className="si-name">{m}</div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
import { useEffect, useRef, useState } from "react";
import { getAllMakes } from "../../api/vehicleLookup";

/**
 * MakeField
 * Type-ahead against NHTSA's real make list.
 * Props: value, onChange — controlled input, same as any other field.
 */
export default function MakeField({ value, onChange }) {
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
    const query = value.trim();
    if (!query) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const makes = await getAllMakes();
        const q = query.toUpperCase();
        setSuggestions(makes.filter((m) => m.toUpperCase().startsWith(q)).slice(0, 8));
      } catch (err) {
        console.error("Make lookup failed:", err);
        setSuggestions([]);
      }
      setLoading(false);
    }, 250);
    return () => clearTimeout(timer);
  }, [value]);

  function pick(m) {
    onChange(m);
    setShowDrop(false);
  }

  return (
    <div className="field has-icon" ref={wrapRef}>
      <label>Make</label>
      <input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setShowDrop(true);
        }}
        onFocus={() => value.trim() && setShowDrop(true)}
        placeholder="e.g. Toyota"
        autoComplete="off"
      />
      <span className="ic">🔍</span>
      {showDrop && (
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
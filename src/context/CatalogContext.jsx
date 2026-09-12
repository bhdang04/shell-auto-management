import { createContext, useCallback, useContext, useState } from "react";

const CatalogContext = createContext(null);

// TODO: swap this seed data + in-memory state for a real Supabase table
// (see src/api/) once the backend is wired in. Everything downstream
// (CatalogList, the popups, the ticket's code auto-fill) only depends on
// the shape { id, tag, code, desc, qty, price } — the storage mechanism
// underneath can change without touching any of that.
const SEED_CATALOG = [
  { id: "p1", tag: "PART", code: "SENS-TX", desc: "Engine temp sensor — SI TX", qty: 1, price: 104.0 },
  { id: "p2", tag: "PART", code: "TANK-API", desc: "Expansion tank w/ cap — API", qty: 1, price: 161.0 },
  { id: "p3", tag: "PART", code: "PAD-WAG", desc: "Front brake pads — Wagner", qty: 1, price: 96.0 },
  { id: "p4", tag: "PART", code: "ROT-PR", desc: "Front rotors (pair)", qty: 1, price: 118.0 },
  { id: "p5", tag: "PART", code: "FILT-OIL", desc: "Oil filter", qty: 1, price: 12.0 },
  { id: "p6", tag: "PART", code: "OIL-5W30", desc: "Full synthetic oil (5 qt)", qty: 1, price: 14.0 },
  { id: "p7", tag: "PART", code: "PULY-DOR", desc: "P/S pulley — DOR RB", qty: 1, price: 100.0 },
  { id: "l1", tag: "LABOR", code: "DX-CEL", desc: "Diagnose check engine light", qty: 0.5, price: 150.0 },
  { id: "l2", tag: "LABOR", code: "RR-COOL", desc: "R&R temp sensor & tank", qty: 0.8, price: 150.0 },
  { id: "l3", tag: "LABOR", code: "RR-BRK", desc: "R&R brake pads & rotors", qty: 1.2, price: 150.0 },
  { id: "l4", tag: "LABOR", code: "OIL-CHG", desc: "Oil & filter change", qty: 0.4, price: 90.0 },
  { id: "l5", tag: "LABOR", code: "TIRE-ROT", desc: "Tire rotation & inspection", qty: 0.3, price: 90.0 },
  { id: "l6", tag: "LABOR", code: "RR-PSP", desc: "R&R P/S pulley", qty: 0.7, price: 150.0 },
];

function makeId() {
  return "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function CatalogProvider({ children }) {
  const [catalog, setCatalog] = useState(SEED_CATALOG);

  const byTag = useCallback((tag) => catalog.filter((it) => it.tag === tag), [catalog]);

  /** Exact, case-insensitive code match — this is what powers the ticket's auto-fill. */
  const findByCode = useCallback(
    (code) => {
      const q = (code || "").trim().toLowerCase();
      if (!q) return null;
      return catalog.find((it) => it.code.toLowerCase() === q) || null;
    },
    [catalog]
  );

  const addItem = useCallback((tag, { code, desc, qty, price }) => {
    const item = {
      id: makeId(),
      tag,
      code: (code || "").trim(),
      desc: desc || "",
      qty: parseFloat(qty) || 0,
      price: parseFloat(price) || 0,
    };
    setCatalog((prev) => [...prev, item]);
    return item;
  }, []);

  const updateItem = useCallback((id, fields) => {
    setCatalog((prev) => prev.map((it) => (it.id === id ? { ...it, ...fields } : it)));
  }, []);

  const deleteItem = useCallback((id) => {
    setCatalog((prev) => prev.filter((it) => it.id !== id));
  }, []);

  return (
    <CatalogContext.Provider value={{ catalog, byTag, findByCode, addItem, updateItem, deleteItem }}>
      {children}
    </CatalogContext.Provider>
  );
}

export function useCatalog() {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error("useCatalog must be used inside a <CatalogProvider>");
  return ctx;
}

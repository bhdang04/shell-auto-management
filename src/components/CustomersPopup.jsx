import { useEffect, useState } from "react";
import Modal from "./button-row/Modal";
import { getAllCustomers } from "../api/customers";

/**
 * CustomersPopup
 * Every customer on file, with a search box to filter client-side — fetched
 * once per open since the full list is small enough for a single shop.
 *
 * Props:
 *  - onSelect(customer): fired when a row is picked — the parent should
 *    pass its existing selectCustomer(searchResult) straight through,
 *    since a row here has the same { id, ... } shape a search result does.
 */
export default function CustomersPopup({ isOpen, onClose, onSelect }) {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    setSearch("");
    setLoading(true);
    getAllCustomers()
      .then((data) => {
        setCustomers(data);
        setError(null);
      })
      .catch((err) => {
        console.error("Failed to load customers:", err);
        setError(err);
      })
      .finally(() => setLoading(false));
  }, [isOpen]);

  const filtered = customers.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || (c.phone1 || "").includes(q);
  });

  function handlePick(c) {
    onSelect(c);
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Customers" variant="drawer">
      <div className="lookup-toolbar">
        <input
          className="lookup-search-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name or phone..."
          autoFocus
        />
      </div>
      <div className="lookup-list">
        {loading && <div className="lookup-empty">Loading...</div>}
        {error && <div className="lookup-empty">Couldn&rsquo;t load customers — check your Supabase connection.</div>}
        {!loading && !error && filtered.length === 0 && <div className="lookup-empty">No customers found.</div>}
        {filtered.map((c) => (
          <div className="lookup-item" key={c.id} onClick={() => handlePick(c)}>
            <div className="li-top">
              <span className="desc">{c.name}</span>
            </div>
            <div className="li-bottom">
              <span className="price">{c.phone1 || "No phone on file"}</span>
              <span className="price">
                {c.vehicles?.length || 0} vehicle{c.vehicles?.length === 1 ? "" : "s"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}

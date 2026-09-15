import { useMemo, useState } from "react";
import TopBar from "../components/TopBar";
import CustomerForm from "../components/customer-info/CustomerForm";
import VehicleForm from "../components/vehicle-info/VehicleForm";
import QuickActions from "../components/button-row/QuickActions";
import LineItems from "../components/LineItems";
import InvoiceTotals from "../components/InvoiceTotals";
import RepairOrderActions from "../components/RepairOrderActions";
import { useCatalog } from "../api/catalog";
import { useAuth } from "../context/AuthContext";
import {
  createCustomer,
  findCustomerByLookup,
  getCustomerWithHistory,
  updateCustomer,
  upsertVehicle,
} from "../api/customers";

const EMPTY_CUSTOMER = { name: "", addr: "", cityzip: "", phone1: "", phone2: "" };
const EMPTY_VEHICLE = { label: "", specs: "", plate: "", vin: "", odo: "" };
const DEFAULT_TAX_RATE = 0.0625; // used only for brand-new, manually-built invoices

function todayStr() {
  const d = new Date();
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

/** Turns the nested Supabase shape (customer -> vehicles -> invoices ->
 *  line_items) into the flat { history: [...] } shape the UI expects. */
function flattenHistory(vehicle) {
  return (vehicle?.invoices || []).map((inv) => ({
    num: inv.num,
    date: inv.date,
    status: inv.status,
    desc: inv.line_items?.[0]?.description || "Repair order",
    total: Number(inv.labor_total) + Number(inv.parts_total) + Number(inv.tax),
    labor: Number(inv.labor_total),
    parts: Number(inv.parts_total),
    tax: Number(inv.tax),
    items: (inv.line_items || []).map((li) => ({
      tag: li.tag,
      code: li.code || "",
      desc: li.description,
      sub: li.sub || "",
      qty: String(li.qty),
      price: Number(li.price),
      total: Number(li.total),
    })),
  }));
}

export default function RepairOrderPage() {
  const { signOut } = useAuth();

  // --- Repair order state lives here, one level up from every component
  // that needs to read or change it. ---
  const [customer, setCustomer] = useState(EMPTY_CUSTOMER);
  const [vehicle, setVehicle] = useState(EMPTY_VEHICLE);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [history, setHistory] = useState(null); // null = nobody searched yet
  const [invoiceNum, setInvoiceNum] = useState(null);
  const [invoiceDate, setInvoiceDate] = useState(todayStr());
  const [status, setStatus] = useState(null);
  const [items, setItems] = useState([]);
  const [saveStatus, setSaveStatus] = useState(null); // null | "saving" | "saved" | "error"
  const [dirty, setDirty] = useState(false); // true when customer/vehicle fields changed since last save

  // Full parts/labor catalogs, loaded once here purely for the ticket's
  // Code-field auto-fill lookup — separate from the copies PartsPopup/
  // LaborPopup load for themselves when opened.
  const { items: partsCatalog } = useCatalog("part");
  const { items: laborCatalog } = useCatalog("labor");

  function findCatalogMatch(tag, code) {
    const q = (code || "").trim().toLowerCase();
    if (!q) return null;
    const list = tag === "LABOR" ? laborCatalog : partsCatalog;
    return list.find((it) => it.code.toLowerCase() === q) || null;
  }

  function clearRO() {
    setCustomer(EMPTY_CUSTOMER);
    setVehicle(EMPTY_VEHICLE);
    setSelectedCustomerId(null);
    setSelectedVehicleId(null);
    setHistory(null);
    setInvoiceNum(null);
    setInvoiceDate(todayStr());
    setStatus(null);
    setItems([]);
    setSaveStatus(null);
    setDirty(false);
  }

  function loadInvoiceFromHistory(h) {
    setInvoiceNum(h.num);
    setInvoiceDate(h.date);
    setStatus(h.status);
    setItems(h.items.map((it) => ({ ...it, _tax: h.tax })));
  }

  function applyFullCustomer(full) {
    setCustomer({
      name: full.name,
      addr: full.addr || "",
      cityzip: full.cityzip || "",
      phone1: full.phone1 || "",
      phone2: full.phone2 || "",
    });
    const v = full.vehicles?.[0] || {};
    setVehicle({
      label: v.label || "",
      specs: v.specs || "",
      plate: v.plate || "",
      vin: v.vin || "",
      odo: v.odo || "",
    });
    setSelectedCustomerId(full.id);
    setSelectedVehicleId(v.id || null);
    setDirty(false);

    const invoiceHistory = flattenHistory(v);
    setHistory(invoiceHistory);

    if (invoiceHistory.length > 0) {
      loadInvoiceFromHistory(invoiceHistory[0]);
    } else {
      setInvoiceNum(null);
      setInvoiceDate(todayStr());
      setStatus(null);
      setItems([]);
    }
  }

  /** Called when a dropdown search result is clicked — search only returns
   *  a shallow record, so fetch the full one (with invoice history) here. */
  async function selectCustomer(searchResult) {
    try {
      const full = await getCustomerWithHistory(searchResult.id);
      applyFullCustomer(full);
    } catch (err) {
      console.error("Failed to load customer:", err);
    }
  }

  async function createNewCustomer(name) {
    clearRO();
    setCustomer((prev) => ({ ...prev, name }));
    try {
      const newCustomer = await createCustomer({ name });
      const newVehicle = await upsertVehicle(null, newCustomer.id, {});
      setSelectedCustomerId(newCustomer.id);
      setSelectedVehicleId(newVehicle.id);
      setHistory([]);
      setDirty(false);
    } catch (err) {
      console.error("Failed to create customer:", err);
      setSaveStatus("error");
    }
  }

  function handleCustomerFieldChange(field, value) {
    setCustomer((prev) => ({ ...prev, [field]: value }));
    if (selectedCustomerId) setDirty(true);
  }

  function handleVehicleFieldChange(field, value) {
    setVehicle((prev) => ({ ...prev, [field]: value }));
    if (selectedVehicleId) setDirty(true);
  }

  // --- Explicit save: writes the current customer/vehicle field values
  // back to Supabase. Only does anything once a customer actually exists
  // (created via "+ Create new customer" or loaded via search). ---
  async function handleSaveClick() {
    if (!selectedCustomerId) return;
    setSaveStatus("saving");
    try {
      await updateCustomer(selectedCustomerId, { ...customer });
      if (selectedVehicleId) {
        await upsertVehicle(selectedVehicleId, selectedCustomerId, { ...vehicle });
      }
      setSaveStatus("saved");
      setDirty(false);
    } catch (err) {
      console.error("Failed to save customer/vehicle:", err);
      setSaveStatus("error");
    }
  }

  async function handleJumpSearch(query) {
    try {
      const full = await findCustomerByLookup(query);
      if (full) applyFullCustomer(full);
    } catch (err) {
      console.error("Jump search failed:", err);
    }
  }

  function addLine(tag) {
    const desc = tag === "LABOR" ? "New labor line" : "New part";
    setItems((prev) => [...prev, { tag, code: "", desc, sub: "", qty: "1", price: 0, total: 0 }]);
  }

  /** Called when a row is picked in PartsPopup/LaborPopup — qty defaults to
   *  1 and the tech adjusts it right on the ticket, same as any other line. */
  function addLineFromCatalog(tag, catalogItem) {
    setItems((prev) => [
      ...prev,
      {
        tag,
        code: catalogItem.code,
        desc: catalogItem.description,
        sub: "",
        qty: "1",
        price: catalogItem.price,
        total: catalogItem.price,
      },
    ]);
  }

  function updateLine(index, field, value) {
    setItems((prev) =>
      prev.map((it, i) => {
        if (i !== index) return it;
        const next = { ...it, [field]: value };

        if (field === "code") {
          const match = findCatalogMatch(it.tag, value);
          if (match) {
            next.desc = match.description;
            next.price = match.price;
          }
        }

        const qty = parseFloat(next.qty) || 0;
        const price = parseFloat(next.price) || 0;
        next.total = qty * price;

        return next;
      })
    );
  }

  function deleteLine(index) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  const totals = useMemo(() => {
    const labor = items.filter((i) => i.tag === "LABOR").reduce((s, i) => s + i.total, 0);
    const parts = items.filter((i) => i.tag === "PART").reduce((s, i) => s + i.total, 0);
    const tax = items.length
      ? items[0]._tax !== undefined
        ? items[0]._tax
        : Math.round((labor + parts) * DEFAULT_TAX_RATE * 100) / 100
      : 0;
    return { labor, parts, tax, due: labor + parts + tax };
  }, [items]);

  const roHeading = selectedCustomerId
    ? `${customer.name} — ${status || "New Repair Order"}`
    : customer.name
    ? `New Repair Order — ${customer.name}`
    : "New Repair Order";

  return (
    <div className="bay">
      <TopBar onNewRO={clearRO} onJumpSearch={handleJumpSearch} onLogout={signOut} />

      <div className="bay-body">
        <div className="bay-main">
          <div className="ro-topline">
            <h2>{roHeading}</h2>
            <div className="ro-meta">
              <div className="m">
                <div className="l">Invoice</div>
                <div className="v">{invoiceNum ? `#${invoiceNum}` : "— new —"}</div>
              </div>
              <div className="m">
                <div className="l">Date</div>
                <div className="v">{invoiceDate}</div>
              </div>
              {selectedCustomerId && (
                <button
                  className={`ro-save-btn ${saveStatus === "error" ? "error" : ""}`}
                  onClick={handleSaveClick}
                  disabled={saveStatus === "saving"}
                >
                  {saveStatus === "saving"
                    ? "Saving..."
                    : saveStatus === "error"
                    ? "Save failed — retry"
                    : dirty
                    ? "Save"
                    : "Saved"}
                </button>
              )}
              <button className="ro-clear" onClick={clearRO}>
                clear form
              </button>
            </div>
          </div>

          <div className="ro-grid">
            <CustomerForm
              customer={customer}
              onFieldChange={handleCustomerFieldChange}
              onSelectCustomer={selectCustomer}
              onCreateNew={createNewCustomer}
            />
            <VehicleForm
              vehicle={vehicle}
              onFieldChange={handleVehicleFieldChange}
              history={history}
              onSelectInvoice={(idx) => {
                if (history && history[idx]) loadInvoiceFromHistory(history[idx]);
              }}
            />
          </div>

          <QuickActions
            onAddPart={(item) => addLineFromCatalog("PART", item)}
            onAddLabor={(item) => addLineFromCatalog("LABOR", item)}
            onAddJob={(item) => addLineFromCatalog("PART", item)}
          />

          <div className="bay-invoice">
            <LineItems items={items} onAddLine={addLine} onUpdateLine={updateLine} onDeleteLine={deleteLine} />
            <InvoiceTotals {...totals} />
            <RepairOrderActions
              disabled={items.length === 0}
              onPrint={() => window.print()}
              onText={() => alert("Text to customer — wire up an SMS provider here")}
              onPay={() => alert("Take payment — wire up a payment provider here")}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

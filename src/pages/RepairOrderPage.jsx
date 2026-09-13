import { useMemo, useState } from "react";
import TopBar from "../components/TopBar";
import CustomerForm from "../components/customer-info/CustomerForm";
import VehicleForm from "../components/vehicle-info/VehicleForm";
import QuickActions from "../components/button-row/QuickActions";
import LineItems from "../components/LineItems";
import InvoiceTotals from "../components/InvoiceTotals";
import RepairOrderActions from "../components/RepairOrderActions";
import { customers } from "../data/mockData";
import { useCatalog } from "../api/catalog";

const EMPTY_CUSTOMER = { name: "", addr: "", cityzip: "", phone1: "", phone2: "" };
const EMPTY_VEHICLE = { label: "", specs: "", plate: "", vin: "", odo: "" };
const DEFAULT_TAX_RATE = 0.0625; // used only for brand-new, manually-built invoices

function todayStr() {
  const d = new Date();
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

export default function RepairOrderPage() {
  // --- Repair order state lives here, one level up from every component
  // that needs to read or change it. Swap this for context/a store later
  // if the tree gets deeper — the components' props won't need to change. ---
  const [customer, setCustomer] = useState(EMPTY_CUSTOMER);
  const [vehicle, setVehicle] = useState(EMPTY_VEHICLE);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [history, setHistory] = useState(null); // null = nobody searched yet
  const [invoiceNum, setInvoiceNum] = useState(null);
  const [invoiceDate, setInvoiceDate] = useState(todayStr());
  const [status, setStatus] = useState(null);
  const [items, setItems] = useState([]);

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
    setHistory(null);
    setInvoiceNum(null);
    setInvoiceDate(todayStr());
    setStatus(null);
    setItems([]);
  }

  function loadInvoice(c, idx) {
    const h = c.history[idx];
    setInvoiceNum(h.num);
    setInvoiceDate(h.date);
    setStatus(h.status);
    setItems(h.items.map((it) => ({ ...it, _tax: h.tax })));
  }

  function selectCustomer(c) {
    setCustomer({ name: c.name, addr: c.addr, cityzip: c.cityzip, phone1: c.phone1, phone2: c.phone2 });
    const v = c.vehicles[0] || {};
    setVehicle({
      label: v.label || "",
      specs: v.specs || "",
      plate: v.plate || "",
      vin: v.vin || "",
      odo: v.odo || "",
    });
    setSelectedCustomerId(c.id);
    setHistory(c.history);

    if (c.history.length > 0) {
      loadInvoice(c, 0);
    } else {
      setInvoiceNum(null);
      setInvoiceDate(todayStr());
      setStatus(null);
      setItems([]);
    }
  }

  function createNewCustomer(name) {
    clearRO();
    setCustomer((prev) => ({ ...prev, name }));
    setHistory([]);
  }

  function handleCustomerFieldChange(field, value) {
    setCustomer((prev) => ({ ...prev, [field]: value }));
  }

  function handleVehicleFieldChange(field, value) {
    setVehicle((prev) => ({ ...prev, [field]: value }));
  }

  function handleJumpSearch(query) {
    const q = query.toLowerCase();
    const match = customers.find(
      (c) =>
        c.history.some((h) => h.num === query) ||
        c.vehicles.some((v) => v.plate.toLowerCase() === q || v.vin.toLowerCase() === q)
    );
    if (match) selectCustomer(match);
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
      <TopBar onNewRO={clearRO} onJumpSearch={handleJumpSearch} />

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
              <button className="ro-clear" onClick={clearRO}>
                clear form
              </button>
            </div>
          </div>

          <div className="ro-grid">
            <CustomerForm
              customer={customer}
              customers={customers}
              onFieldChange={handleCustomerFieldChange}
              onSelectCustomer={selectCustomer}
              onCreateNew={createNewCustomer}
            />
            <VehicleForm
              vehicle={vehicle}
              onFieldChange={handleVehicleFieldChange}
              history={history}
              onSelectInvoice={(idx) => {
                const c = customers.find((x) => x.id === selectedCustomerId);
                if (c) loadInvoice(c, idx);
              }}
            />
          </div>

          <QuickActions
            onAddPart={(item) => addLineFromCatalog("PART", item)}
            onAddLabor={(item) => addLineFromCatalog("LABOR", item)}
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
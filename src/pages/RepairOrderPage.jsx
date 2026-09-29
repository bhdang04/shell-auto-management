import { useEffect, useMemo, useState } from "react";
import TopBar from "../components/TopBar";
import CustomerForm from "../components/customer-info/CustomerForm";
import VehicleForm from "../components/vehicle-info/VehicleForm";
import VehiclePickerPopup from "../components/vehicle-info/VehiclePickerPopup";
import OpenInvoicesPopup from "../components/OpenInvoicesPopup";
import CustomersPopup from "../components/CustomersPopup";
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
import { saveInvoice, updateInvoiceStatus, voidInvoice } from "../api/invoices";
import { printInvoiceReceipt, openInvoiceWindow } from "../lib/printInvoice";
import TakePaymentWizard from "../components/TakePaymentWizard";
import ShopSettingsPopup from "../components/ShopSettingsPopup";
import { getShopSettings } from "../api/settings";
import ReportsPopup from "../components/ReportsPopup";
import VoidInvoicePopup from "../components/VoidInvoicePopup";

const EMPTY_CUSTOMER = { first_name: "", last_name: "", addr: "", cityzip: "", phone1: "", phone2: "" };
// Selecting a vehicle whose most recent invoice has one of these statuses
// starts a fresh ticket instead of reopening the closed one.
const CLOSED_STATUSES = ["Ready for Pickup", "Paid", "Voided"];
const EMPTY_VEHICLE = { year: "", make: "", model: "", engine_specs: "", plate: "", vin: "", odo: "" };
const DEFAULT_TAX_RATE = 0.0625; // used only for brand-new, manually-built invoices

function todayStr() {
  const d = new Date();
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

/** Combines first/last into one display string — used anywhere the UI
 *  needs "the customer's name" as a single value (heading, print, etc.). */
function customerFullName(c) {
  return [c?.first_name, c?.last_name].filter(Boolean).join(" ").trim();
}

/** Best-effort split of one typed full name into first/last — last word
 *  becomes the last name, everything before it becomes the first name.
 *  Same heuristic used to backfill existing customers in the DB migration. */
function splitFullName(input) {
  const trimmed = (input || "").trim();
  if (!trimmed) return { first_name: "", last_name: "" };
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return { first_name: parts[0], last_name: "" };
  const last_name = parts.pop();
  return { first_name: parts.join(" "), last_name };
}

/** Turns the nested Supabase shape (customer -> vehicles -> invoices ->
 *  line_items) into the flat { history: [...] } shape the UI expects.
 *  Sorted newest-first so the arrow navigation has a stable order. */
function flattenHistory(vehicle) {
  const list = (vehicle?.invoices || []).map((inv) => ({
    id: inv.id,
    num: inv.num,
    date: inv.date,
    status: inv.status,
    desc: inv.line_items?.[0]?.description || "Repair order",
    total: Number(inv.labor_total) + Number(inv.parts_total) + Number(inv.tax) + Number(inv.payment_surcharge || 0),
    labor: Number(inv.labor_total),
    parts: Number(inv.parts_total),
    tax: Number(inv.tax),
    paymentMethod: inv.payment_method || null,
    paymentSurcharge: Number(inv.payment_surcharge || 0),
    checkNumber: inv.check_number || null,
    items: (inv.line_items || [])
      .slice()
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      .map((li) =>
        li.kind === "comment"
          ? { kind: "comment", tag: null, code: "", desc: li.description, sub: "", qty: "", price: "", total: 0 }
          : {
              kind: "item",
              tag: li.tag,
              code: li.code || "",
              desc: li.description,
              sub: li.sub || "",
              qty: li.qty === null ? "" : String(li.qty),
              price: li.price === null ? "" : Number(li.price),
              total: li.total === null ? 0 : Number(li.total),
            }
      ),
  }));
  return list.sort((a, b) => Number(b.num) - Number(a.num));
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
  const [historyIndex, setHistoryIndex] = useState(null); // position within history[] for the arrows
  const [invoiceId, setInvoiceId] = useState(null); // real DB id — null means unsaved
  const [invoiceNum, setInvoiceNum] = useState(null);
  const [invoiceDate, setInvoiceDate] = useState(todayStr());
  const [status, setStatus] = useState(null);
  const [items, setItems] = useState([]);
  const [saveStatus, setSaveStatus] = useState(null); // null | "saving" | "saved" | "error"
  const [dirty, setDirty] = useState(false); // true when customer/vehicle fields changed since last save
  const [invoiceSaving, setInvoiceSaving] = useState(false);
  const [invoiceInput, setInvoiceInput] = useState(""); // what's typed in the invoice # field
  const [invoiceLookupStatus, setInvoiceLookupStatus] = useState(null); // null | "searching" | "notfound"
  const [showPay, setShowPay] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [paymentSurcharge, setPaymentSurcharge] = useState(0);
  const [voidPopupOpen, setVoidPopupOpen] = useState(false);
  const [voiding, setVoiding] = useState(false);
  const [vinLookupInProgress, setVinLookupInProgress] = useState(false);
  const [reportsOpen, setReportsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shopSettings, setShopSettings] = useState(null);
  const [checkNumber, setCheckNumber] = useState(null);

  useEffect(() => {
    getShopSettings()
      .then(setShopSettings)
      .catch((err) => console.error("Failed to load shop settings:", err));
  }, []);
  // Keep the editable field in sync whenever the loaded invoice changes for
  // any other reason (arrows, search, picking a customer, clearing).
  useEffect(() => {
    setInvoiceInput(invoiceNum || "");
    setInvoiceLookupStatus(null);
  }, [invoiceNum]);

  // When a selected customer has more than one vehicle, we hold off
  // populating the form and show a picker instead. pendingCustomer holds
  // the full record (with all vehicles) while the picker is up.
  const [vehiclePickerOpen, setVehiclePickerOpen] = useState(false);
  const [pendingCustomer, setPendingCustomer] = useState(null);
  const [customerVehicles, setCustomerVehicles] = useState([]);
  const [openInvoicesOpen, setOpenInvoicesOpen] = useState(false);
  const [customersOpen, setCustomersOpen] = useState(false); // every vehicle for the current customer

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
    setCustomerVehicles([]);
    setHistory(null);
    setHistoryIndex(null);
    setInvoiceId(null);
    setInvoiceNum(null);
    setInvoiceDate(todayStr());
    setStatus(null);
    setItems([]);
    setSaveStatus(null);
    setDirty(false);
    setPaymentMethod(null);
    setPaymentSurcharge(0);
    setCheckNumber(null);
  }

  function loadInvoiceFromHistory(idx, historyList) {
    const list = historyList || history;
    const h = list?.[idx];
    if (!h) return;
    setHistoryIndex(idx);
    setInvoiceId(h.id);
    setInvoiceNum(h.num);
    setInvoiceDate(h.date);
    setStatus(h.status);
    setItems(h.items.map((it) => ({ ...it, _tax: h.tax })));
    setPaymentMethod(h.paymentMethod || null);
    setPaymentSurcharge(h.paymentSurcharge || 0);
    setCheckNumber(h.checkNumber || null);
  }

  /** Loads one vehicle's fields + invoice history. Doesn't touch customer
   *  info — used both by applyFullCustomer and by switching between an
   *  already-selected customer's other vehicles. */
  function switchToVehicle(v, invoiceIdOverride) {
    setVehicle({
      year: v.year || "",
      make: v.make || "",
      model: v.model || "",
      engine_specs: v.engine_specs || "",
      plate: v.plate || "",
      vin: v.vin || "",
      odo: v.odo || "",
    });
    setSelectedVehicleId(v.id || null);
    setDirty(false);

    const invoiceHistory = flattenHistory(v);
    setHistory(invoiceHistory);

    // A specific invoice was asked for (e.g. typed into the invoice # field)
    // — load exactly that one regardless of its status, instead of falling
    // back to "most recent open one, else blank."
    if (invoiceIdOverride) {
      const idx = invoiceHistory.findIndex((h) => h.id === invoiceIdOverride);
      if (idx >= 0) {
        loadInvoiceFromHistory(idx, invoiceHistory);
        return;
      }
    }

    const latest = invoiceHistory[0];
    if (latest && !CLOSED_STATUSES.includes(latest.status)) {
      loadInvoiceFromHistory(0, invoiceHistory);
    } else {
      // No invoices yet, or the most recent one is already closed out —
      // either way, start blank rather than reopening a finished job.
      // The old invoice is still one click away via the ‹ › arrows or
      // Vehicle History, just not auto-loaded.
      setHistoryIndex(null);
      setInvoiceId(null);
      setInvoiceNum(null);
      setInvoiceDate(todayStr());
      setStatus(null);
      setItems([]);
      setPaymentMethod(null);
      setPaymentSurcharge(0);
      setCheckNumber(null);
    }
  }

  /** vehicleOverride: which vehicle to load. Falls back to the first one —
   *  callers with multiple vehicles should resolve which one first (either
   *  automatically, when there's only one, or via VehiclePickerPopup). */
  function applyFullCustomer(full, vehicleOverride, invoiceIdOverride) {
    setCustomer({
      first_name: full.first_name || "",
      last_name: full.last_name || "",
      addr: full.addr || "",
      cityzip: full.cityzip || "",
      phone1: full.phone1 || "",
      phone2: full.phone2 || "",
    });
    setSelectedCustomerId(full.id);
    const vehicles = full.vehicles || [];
    setCustomerVehicles(vehicles);
    switchToVehicle(vehicleOverride || vehicles[0] || {}, invoiceIdOverride);
  }

  /** Called when a dropdown search result is clicked — search only returns
   *  a shallow record, so fetch the full one (with invoice history) here.
   *  One vehicle: select it automatically. Multiple: show the picker and
   *  wait for handleVehiclePicked before populating anything. */
  async function selectCustomer(searchResult) {
    try {
      const full = await getCustomerWithHistory(searchResult.id);
      const vehicles = full.vehicles || [];
      if (vehicles.length > 1) {
        setPendingCustomer(full);
        setVehiclePickerOpen(true);
      } else {
        applyFullCustomer(full);
      }
    } catch (err) {
      console.error("Failed to load customer:", err);
    }
  }

  /** Called when a vehicle is picked from VehiclePickerPopup. Two cases:
   *  pendingCustomer set = this came from selectCustomer's first-time
   *  ambiguous pick, so load customer info too. Not set = the tech clicked
   *  "Switch" on an already-loaded customer, so just swap the vehicle. */
  function handleVehiclePicked(vehicle) {
    if (pendingCustomer) {
      applyFullCustomer(pendingCustomer, vehicle);
    } else {
      switchToVehicle(vehicle);
    }
    setVehiclePickerOpen(false);
    setPendingCustomer(null);
  }

  function handleSwitchVehicle() {
    setVehiclePickerOpen(true);
  }

  /** Called when a row is picked in OpenInvoicesPopup — this jumps to one
   *  SPECIFIC invoice, unlike selectCustomer which loads whatever's most
   *  recent. Needed because a vehicle could have more than one invoice and
   *  we want exactly the one that was clicked, not just "the latest open one". */
  async function loadInvoiceById(row) {
    try {
      const customerId = row.vehicles.customer_id;
      const full = await getCustomerWithHistory(customerId);
      setCustomer({
        first_name: full.first_name || "",
        last_name: full.last_name || "",
        addr: full.addr || "",
        cityzip: full.cityzip || "",
        phone1: full.phone1 || "",
        phone2: full.phone2 || "",
      });
      setSelectedCustomerId(full.id);
      const vehicles = full.vehicles || [];
      setCustomerVehicles(vehicles);
      const matchedVehicle = vehicles.find((v) => v.id === row.vehicles.id) || vehicles[0];
      setVehicle({
        year: matchedVehicle.year || "",
        make: matchedVehicle.make || "",
        model: matchedVehicle.model || "",
        engine_specs: matchedVehicle.engine_specs || "",
        plate: matchedVehicle.plate || "",
        vin: matchedVehicle.vin || "",
        odo: matchedVehicle.odo || "",
      });
      setSelectedVehicleId(matchedVehicle.id);
      setDirty(false);

      const freshHistory = flattenHistory(matchedVehicle);
      setHistory(freshHistory);
      const idx = freshHistory.findIndex((h) => h.id === row.id);
      if (idx >= 0) loadInvoiceFromHistory(idx, freshHistory);
    } catch (err) {
      console.error("Failed to load invoice:", err);
    }
  }

  /** Called when an "Expected Today" appointment is picked — there's no
   *  invoice yet, so this just loads the customer/vehicle (same as a
   *  normal customer search) and lets switchToVehicle's usual logic decide
   *  whether to open an existing ticket or start fresh. */
  async function loadFromAppointment(appt) {
    try {
      const full = await getCustomerWithHistory(appt.customer_id);
      const vehicles = full.vehicles || [];
      const matchedVehicle = vehicles.find((v) => v.id === appt.vehicle_id) || vehicles[0];
      applyFullCustomer(full, matchedVehicle);
    } catch (err) {
      console.error("Failed to load from appointment:", err);
    }
  }

  /** Powers both the top search bar and typing an invoice # directly into
   *  the invoice field — looks up by invoice #, plate, or VIN and loads
   *  the matched customer/vehicle (and specific invoice, if the match was
   *  an invoice number). Returns true/false so callers can show "no match"
   *  feedback instead of silently doing nothing. */
  async function handleJumpSearch(query) {
    try {
      const result = await findCustomerByLookup(query);
      if (!result) return false;
      // The lookup already matched one specific vehicle (by plate/VIN/invoice#),
      // so use that one directly — no need for the multi-vehicle picker here.
      const matchedVehicle = result.customer.vehicles?.find((v) => v.id === result.vehicleId);
      applyFullCustomer(result.customer, matchedVehicle, result.invoiceId);
      return true;
    } catch (err) {
      console.error("Jump search failed:", err);
      return false;
    }
  }

  /** Marks the current ticket closed AND saves it — "Done" should finalize
   *  the invoice for real, not just flip a status flag on something that
   *  might not even be saved yet. Reuses the same saveInvoice path as the
   *  Save Invoice button, forcing the closed status, then clears the form
   *  so the next car starts on a blank ticket instead of staying on the
   *  one that was just closed out. */
  async function handleMarkDone() {
    if (!selectedVehicleId) return;
    if (status === "Paid" || status === "Voided") return; // already closed out — nothing to mark done
    const closedStatus = "Ready for Pickup";
    setInvoiceSaving(true);
    try {
      await saveInvoice({
        invoiceId,
        vehicleId: selectedVehicleId,
        status: closedStatus,
        items,
        laborTotal: totals.labor,
        partsTotal: totals.parts,
        tax: totals.tax,
      });
      clearRO();
    } catch (err) {
      console.error("Failed to finalize invoice:", err);
      setSaveStatus("error");
    } finally {
      setInvoiceSaving(false);
    }
  }

  /** Creates a new blank vehicle for the current customer and switches to it. */
  async function handleAddVehicle() {
    if (!selectedCustomerId) return;
    try {
      const newVehicle = await upsertVehicle(null, selectedCustomerId, {});
      setCustomerVehicles((prev) => [...prev, newVehicle]);
      switchToVehicle(newVehicle);
    } catch (err) {
      console.error("Failed to add vehicle:", err);
      setSaveStatus("error");
    }
  }

  async function createNewCustomer(name) {
    clearRO();
    const { first_name, last_name } = splitFullName(name);
    setCustomer((prev) => ({ ...prev, first_name, last_name }));
    try {
      const newCustomer = await createCustomer({ first_name, last_name });
      const newVehicle = await upsertVehicle(null, newCustomer.id, {});
      setSelectedCustomerId(newCustomer.id);
      setSelectedVehicleId(newVehicle.id);
      setCustomerVehicles([newVehicle]);
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
  // back to Supabase. Creates the customer first if this is a from-scratch
  // entry (typed straight into the form instead of using "+ Create new
  // customer"). ---
  async function handleSaveClick() {
    if (!customerFullName(customer)) return;
    setSaveStatus("saving");
    try {
      let customerId = selectedCustomerId;

      if (!customerId) {
        const newCustomer = await createCustomer({ ...customer });
        customerId = newCustomer.id;
        setSelectedCustomerId(customerId);

        const newVehicle = await upsertVehicle(null, customerId, { ...vehicle });
        setSelectedVehicleId(newVehicle.id);
        setCustomerVehicles([newVehicle]);
        setHistory([]);
      } else {
        await updateCustomer(customerId, { ...customer });
        if (selectedVehicleId) {
          await upsertVehicle(selectedVehicleId, customerId, { ...vehicle });
        }
      }

      setSaveStatus("saved");
      setDirty(false);
    } catch (err) {
      console.error("Failed to save customer/vehicle:", err);
      setSaveStatus("error");
    }
  }

  /** Typing a number directly into the invoice # field and hitting Enter/blur
   *  jumps straight to that invoice — same lookup as the top search bar. */
  async function handleInvoiceNumberJump() {
    const q = String(invoiceInput).trim();
    if (!q || q === String(invoiceNum || "")) return;
    setInvoiceLookupStatus("searching");
    const found = await handleJumpSearch(q);
    if (!found) setInvoiceLookupStatus("notfound");
    // on success, invoiceNum changes -> the useEffect above resyncs invoiceInput and clears status
  }

  function addLine(tag) {
    const desc = tag === "LABOR" ? "New labor line" : "New part";
    setItems((prev) => [...prev, { kind: "item", tag, code: "", desc, sub: "", qty: "1", price: 0, total: 0 }]);
  }

  /** Called when a row is picked in PartsPopup/LaborPopup — qty defaults to
   *  1 and the tech adjusts it right on the ticket, same as any other line. */
  function addLineFromCatalog(tag, catalogItem) {
    setItems((prev) => [
      ...prev,
      {
        kind: "item",
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

  /** Called when a Quick Job is picked — unlike Parts/Labor, this expands
   *  into MULTIPLE ticket lines at once: some priced, some left blank for
   *  manual entry (qty/price null in the template), plus freeform comment
   *  lines with no code or price at all. */
  function addLinesFromJob(lines) {
    const mapped = lines.map((l) => {
      if (l.kind === "comment") {
        return { kind: "comment", tag: null, code: "", desc: l.description, sub: "", qty: "", price: "", total: 0 };
      }
      const hasQty = l.qty !== null && l.qty !== undefined;
      const hasPrice = l.price !== null && l.price !== undefined;
      const qty = hasQty ? String(l.qty) : "";
      const price = hasPrice ? Number(l.price) : "";
      const total = hasQty && hasPrice ? parseFloat(qty) * Number(price) : 0;
      return {
        kind: "item",
        tag: l.tag,
        code: l.code || "",
        desc: l.description,
        sub: "",
        qty,
        price,
        total,
      };
    });
    setItems((prev) => [...prev, ...mapped]);
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

  const taxRate = shopSettings ? Number(shopSettings.tax_rate) : DEFAULT_TAX_RATE;

  const totals = useMemo(() => {
    const labor = items.filter((i) => i.tag === "LABOR").reduce((s, i) => s + i.total, 0);
    const parts = items.filter((i) => i.tag === "PART").reduce((s, i) => s + i.total, 0);
    // Parts are taxed; labor is not.
    const tax = items.length
      ? items[0]._tax !== undefined
        ? items[0]._tax
        : Math.round(parts * taxRate * 100) / 100
      : 0;
    return { labor, parts, tax, due: labor + parts + tax };
  }, [items, taxRate]);

  /** Saves the current ticket to Supabase — creates the invoice if this is
   *  a new one, otherwise updates it, then fully replaces its line items.
   *  Afterward, refetches the vehicle so `history` picks up the new/updated
   *  invoice and the arrows have something real to navigate. */
  async function handleSaveInvoiceClick() {
    if (!selectedVehicleId) return;
    setInvoiceSaving(true);
    try {
      const saved = await saveInvoice({
        invoiceId,
        vehicleId: selectedVehicleId,
        status: status || "In Bay",
        items,
        laborTotal: totals.labor,
        partsTotal: totals.parts,
        tax: totals.tax,
      });

      const full = await getCustomerWithHistory(selectedCustomerId);
      const freshVehicles = full.vehicles || [];
      setCustomerVehicles(freshVehicles);
      const freshVehicle = freshVehicles.find((v) => v.id === selectedVehicleId);
      const freshHistory = flattenHistory(freshVehicle);
      setHistory(freshHistory);

      const idx = freshHistory.findIndex((h) => h.id === saved.id);
      if (idx >= 0) loadInvoiceFromHistory(idx, freshHistory);
    } catch (err) {
      console.error("Failed to save invoice:", err);
      setSaveStatus("error");
    }
    setInvoiceSaving(false);
  }

  function handlePay() {
    setShowPay(true); // <-- opens the wizard
  }

  async function handleVoidConfirm(reason) {
    if (!invoiceId) return;
    setVoiding(true);
    try {
      await voidInvoice(invoiceId, reason);
      setVoidPopupOpen(false);
      clearRO();
    } catch (err) {
      console.error("Failed to void invoice:", err);
      setSaveStatus("error");
    } finally {
      setVoiding(false);
    }
  }

  /** Take Payment wizard finished — updates mileage, saves the invoice as
   *  Paid with method/surcharge/check-number recorded, optionally prints
   *  the invoice (now the final receipt), then clears the ticket. */
  async function handleTakePaymentComplete({ odometer, method, checkNumber: enteredCheckNumber, surchargeAmount, print }) {
    if (!selectedVehicleId) return;
    // Must open the print window before any await, or the popup gets blocked.
    const invoiceWin = print ? openInvoiceWindow() : null;
    setInvoiceSaving(true);
    try {
      if (odometer && odometer !== vehicle.odo) {
        await upsertVehicle(selectedVehicleId, selectedCustomerId, { odo: odometer });
        setVehicle((prev) => ({ ...prev, odo: odometer }));
      }

      const saved = await saveInvoice({
        invoiceId,
        vehicleId: selectedVehicleId,
        status: "Paid",
        items,
        laborTotal: totals.labor,
        partsTotal: totals.parts,
        tax: totals.tax,
        paymentMethod: method,
        paymentSurcharge: surchargeAmount,
        checkNumber: enteredCheckNumber || null,
      });

      if (print) {
        printInvoiceReceipt({
          win: invoiceWin,
          invoiceNum: saved.num,
          invoiceDate,
          status: "Paid",
          customer: { ...customer, name: customerFullName(customer) },
          vehicle: { ...vehicle, odo: odometer || vehicle.odo },
          items,
          totals: { ...totals, due: totals.due + surchargeAmount },
          paymentMethod: method,
          paymentSurcharge: surchargeAmount,
          checkNumber: enteredCheckNumber || null,
          shop: shopSettings,
        });
      }

      setShowPay(false);
      clearRO();
    } catch (err) {
      console.error("Failed to record payment:", err);
      setSaveStatus("error");
      if (invoiceWin && !invoiceWin.closed) invoiceWin.close();
    } finally {
      setInvoiceSaving(false);
    }
  }

  // history is sorted newest-first, so "previous" (older) moves to a
  // higher index, "next" (newer) moves to a lower one. historyIndex===null
  // (the fresh-ticket state) means "start browsing from the most recent".
  function goToPreviousInvoice() {
    if (!history || history.length === 0) return;
    const nextIdx = historyIndex === null ? 0 : historyIndex + 1;
    if (nextIdx < history.length) loadInvoiceFromHistory(nextIdx);
  }
  function goToNextInvoice() {
    if (history && historyIndex !== null && historyIndex > 0) {
      loadInvoiceFromHistory(historyIndex - 1);
    }
  }

  const roHeading = selectedCustomerId
    ? `${customerFullName(customer)} — ${status || "New Repair Order"}`
    : customerFullName(customer)
    ? `New Repair Order — ${customerFullName(customer)}`
    : "New Repair Order";

  return (
    <div className="bay">
      <TopBar
        onNewRO={clearRO}
        onJumpSearch={handleJumpSearch}
        onShowOpenInvoices={() => setOpenInvoicesOpen(true)}
        onShowReports={() => setReportsOpen(true)}
        onShowSettings={() => setSettingsOpen(true)}
        onLogout={signOut}
      />

      <ReportsPopup isOpen={reportsOpen} onClose={() => setReportsOpen(false)} />
      <ShopSettingsPopup isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} onSaved={setShopSettings} />

      <VehiclePickerPopup
        isOpen={vehiclePickerOpen}
        onClose={() => {
          setVehiclePickerOpen(false);
          setPendingCustomer(null);
        }}
        vehicles={pendingCustomer?.vehicles || customerVehicles}
        onSelect={handleVehiclePicked}
      />

      <OpenInvoicesPopup
        isOpen={openInvoicesOpen}
        onClose={() => setOpenInvoicesOpen(false)}
        onSelect={loadInvoiceById}
        onSelectAppointment={loadFromAppointment}
      />

      <CustomersPopup
        isOpen={customersOpen}
        onClose={() => setCustomersOpen(false)}
        onSelect={selectCustomer}
      />

      <div className="bay-body">
        <div className="bay-main">
          <div className="ro-topline">
            <h2>{roHeading}</h2>
            <div className="ro-meta">
              <div className="m">
                <div className="l">Invoice</div>
                <div className="v invoice-nav">
                  <button
                    className="invoice-arrow"
                    onClick={goToPreviousInvoice}
                    disabled={
                      !history || history.length === 0 || (historyIndex !== null && historyIndex >= history.length - 1)
                    }
                    title="Previous invoice"
                  >
                    ‹
                  </button>
                  <div className="invoice-num-wrap">
                    {invoiceInput && <span className="invoice-hash">#</span>}
                    <input
                      className="invoice-num-input"
                      value={invoiceInput}
                      onChange={(e) => setInvoiceInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.target.blur();
                          handleInvoiceNumberJump();
                        }
                      }}
                      onBlur={handleInvoiceNumberJump}
                      placeholder="new"
                      size={invoiceInput ? invoiceInput.length : 3}
                    />
                  </div>
                  <button
                    className="invoice-arrow"
                    onClick={goToNextInvoice}
                    disabled={!history || historyIndex === null || historyIndex <= 0}
                    title="Next invoice"
                  >
                    ›
                  </button>
                  {invoiceLookupStatus === "notfound" && (
                    <span className="invoice-not-found">No match</span>
                  )}
                </div>
              </div>
              <div className="m">
                <div className="l">Date</div>
                <div className="v">{invoiceDate}</div>
              </div>

              <div className="ro-meta-divider" />

              <div className="ro-actions">
                {selectedVehicleId && status !== "Paid" && status !== "Voided" && (
                  <button
                    className="ro-save-btn"
                    onClick={handleSaveInvoiceClick}
                    disabled={invoiceSaving || items.length === 0 || vinLookupInProgress}
                  >
                    {invoiceSaving ? "Saving..." : invoiceId ? "Save Invoice" : "Save New Invoice"}
                  </button>
                )}
                {invoiceId && status !== "Voided" && (
                  <button className="ro-void-btn" onClick={() => setVoidPopupOpen(true)}>
                    Void Invoice
                  </button>
                )}
                {(selectedCustomerId || customerFullName(customer)) && (
                  <button
                    className={`ro-save-btn ${saveStatus === "error" ? "error" : ""}`}
                    onClick={handleSaveClick}
                    disabled={saveStatus === "saving" || !customerFullName(customer) || vinLookupInProgress}
                  >
                    {saveStatus === "saving"
                      ? "Saving..."
                      : vinLookupInProgress
                      ? "Looking up VIN..."
                      : saveStatus === "error"
                      ? "Save failed — retry"
                      : !selectedCustomerId
                      ? "Create Customer"
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
          </div>

          <div className="ro-grid">
            <CustomerForm
              customer={customer}
              onFieldChange={handleCustomerFieldChange}
              onSelectCustomer={selectCustomer}
              onCreateNew={createNewCustomer}
              onShowCustomers={() => setCustomersOpen(true)}
            />
            <VehicleForm
              vehicle={vehicle}
              onFieldChange={handleVehicleFieldChange}
              history={history}
              onSelectInvoice={(idx) => {
                if (history && history[idx]) loadInvoiceFromHistory(idx);
              }}
              vehicleCount={customerVehicles.length}
              onSwitchVehicle={handleSwitchVehicle}
              onAddVehicle={handleAddVehicle}
              onVinLookupChange={setVinLookupInProgress}
            />
          </div>

          <QuickActions
            onAddPart={(item) => addLineFromCatalog("PART", item)}
            onAddLabor={(item) => addLineFromCatalog("LABOR", item)}
            onAddJob={addLinesFromJob}
            onMarkDone={handleMarkDone}
            items={items}
            totals={totals}
            vehicleId={selectedVehicleId}
            customerId={selectedCustomerId}
            vehicleLabel={[vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ")}
            invoiceId={invoiceId}
          />

          <div className="bay-invoice">
            <LineItems items={items} onAddLine={addLine} onUpdateLine={updateLine} onDeleteLine={deleteLine} />
            <InvoiceTotals {...totals} />
            <RepairOrderActions
              disabled={items.length === 0}
              isPaid={status === "Paid"}
              isVoided={status === "Voided"}
              onPrint={() =>
                printInvoiceReceipt({
                  invoiceNum,
                  invoiceDate,
                  status,
                  customer: { ...customer, name: customerFullName(customer) },
                  vehicle,
                  items,
                  totals,
                  paymentMethod,
                  paymentSurcharge,
                  checkNumber,
                  shop: shopSettings,
                })
              }
              onText={() => alert("Text to customer — wire up an SMS provider here")}
              onPay={handlePay}
            />
            <TakePaymentWizard
              isOpen={showPay}
              onClose={() => setShowPay(false)}
              total={totals.due}
              currentOdometer={vehicle.odo}
              saving={invoiceSaving}
              onComplete={handleTakePaymentComplete}
            />
            <VoidInvoicePopup
              isOpen={voidPopupOpen}
              onClose={() => setVoidPopupOpen(false)}
              invoiceNum={invoiceNum}
              onConfirm={handleVoidConfirm}
              voiding={voiding}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
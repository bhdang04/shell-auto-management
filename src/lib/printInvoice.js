// TODO: move shop info to a settings table/screen once one exists —
// hardcoded here for now since there's only one shop.
const SHOP = {
  name: "Shell Complete Auto Service",
  addr: "482 Auto Plaza Dr, San Jose, CA 95112",
  phone: "(408) 555-0142",
};

function money(n) {
  return "$" + Number(n || 0).toFixed(2);
}

function esc(s) {
  return String(s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
}

function itemRow(it) {
  const qty = it.qty === "" || it.qty === undefined ? "—" : it.qty;
  const price = it.price === "" || it.price === undefined ? "—" : money(it.price);
  const total = it.qty === "" || it.price === "" ? "—" : money(it.total);
  return `<tr>
    <td>${esc(it.code)}</td>
    <td>${esc(it.desc)}</td>
    <td class="r">${esc(qty)}</td>
    <td class="r">${esc(price)}</td>
    <td class="r">${esc(total)}</td>
  </tr>`;
}

/**
 * printInvoiceReceipt
 * Opens a new window with a print-ready version of the current invoice
 * (Design 3 — "Detailed Work Order") and triggers the browser print dialog.
 *
 * invoiceNum: number or null (shows "NEW" for an unsaved ticket)
 * items: the same shape used throughout the app —
 *   { kind: 'item'|'comment', tag, code, desc, sub, qty, price, total }
 */
export function printInvoiceReceipt({ invoiceNum, invoiceDate, status, customer, vehicle, items, totals }) {
  const itemLines = items.filter((it) => it.kind !== "comment");
  const commentLines = items.filter((it) => it.kind === "comment");

  const itemsHtml = itemLines.length
    ? itemLines.map(itemRow).join("")
    : `<tr><td colspan="5" style="color:#888; font-style:italic;">No line items</td></tr>`;

  const notesHtml = commentLines.length
    ? commentLines.map((c) => `${esc(c.desc)}`).join("<br>")
    : "";

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Invoice ${invoiceNum ? "#" + invoiceNum : ""}</title>
<style>
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:'Inter', Arial, sans-serif; color:#111; padding:0.6in 0.7in; }
  .head { text-align:center; border-bottom:1px solid #1a1a1a; padding-bottom:14px; margin-bottom:16px; }
  .head h1 { font-family:Georgia, serif; font-style:italic; font-size:26px; }
  .head p { font-size:11px; color:#444; margin-top:4px; }
  .metabar { display:flex; justify-content:space-between; background:#f3f3f0; padding:10px 14px; border-radius:4px; margin-bottom:16px; font-size:12px; }
  .metabar b { font-family:'Courier New', monospace; }
  .boxes { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:16px; }
  .box { border:1px solid #ccc; border-radius:4px; padding:8px 12px; }
  .box h4 { font-size:9.5px; text-transform:uppercase; letter-spacing:.1em; color:#888; margin-bottom:3px; }
  .box .name { font-weight:700; font-size:12.5px; }
  .box p { font-size:10.5px; color:#333; line-height:1.4; margin-top:1px; }
  h3.section { font-size:11px; text-transform:uppercase; letter-spacing:.08em; color:#555; border-bottom:1px solid #1a1a1a; padding-bottom:4px; margin:18px 0 8px; }
  table { width:100%; border-collapse:collapse; }
  td, th { font-size:12px; padding:5px 4px; }
  th { text-align:left; color:#888; font-weight:600; font-size:10px; text-transform:uppercase; }
  td.r, th.r { text-align:right; }
  .notes { background:#fafaf7; border:1px solid #e5e5e0; border-radius:4px; padding:12px 14px; font-size:11.5px; color:#333; line-height:1.9; }
  .totals { display:flex; justify-content:flex-end; margin-top:14px; }
  .totals table { width:240px; }
  .totals td { border:none; padding:4px; }
  .totals tr.due td { border-top:2px solid #1a1a1a; font-weight:700; font-size:15px; }
  .signline { margin-top:34px; display:flex; gap:40px; }
  .signline div { flex:1; border-top:1px solid #333; padding-top:4px; font-size:10.5px; color:#666; }
  @media print { body { padding:0.4in 0.5in; } }
</style>
</head>
<body>
  <div class="head">
    <h1>${esc(SHOP.name)}</h1>
    <p>${esc(SHOP.addr)} &middot; ${esc(SHOP.phone)}</p>
  </div>

  <div class="metabar">
    <span>Work Order <b>${invoiceNum ? "#" + esc(invoiceNum) : "NEW"}</b></span>
    <span>Date <b>${esc(invoiceDate)}</b></span>
    <span>Status <b>${esc(status || "Open")}</b></span>
  </div>

  <div class="boxes">
    <div class="box">
      <h4>Customer</h4>
      <div class="name">${esc(customer.name)}</div>
      <p>${esc(customer.addr)}${customer.addr ? "," : ""} ${esc(customer.cityzip)}<br>${esc(customer.phone1)}</p>
    </div>
    <div class="box">
      <h4>Vehicle</h4>
      <div class="name">${esc([vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" "))}</div>
      <p>${esc(vehicle.engine_specs)}${vehicle.odo ? " &middot; " + esc(vehicle.odo) + " mi" : ""}<br>Plate ${esc(vehicle.plate) || "—"} &middot; VIN ${esc(vehicle.vin) || "—"}</p>
    </div>
  </div>

  <h3 class="section">Parts &amp; Labor</h3>
  <table>
    <thead><tr><th>Code</th><th>Description</th><th class="r">Qty</th><th class="r">Price</th><th class="r">Total</th></tr></thead>
    <tbody>${itemsHtml}</tbody>
  </table>

  ${
    notesHtml
      ? `<h3 class="section">Technician Notes &amp; Recommended Service</h3><div class="notes">${notesHtml}</div>`
      : ""
  }

  <div class="totals">
    <table>
      <tr><td>Labor</td><td class="r">${money(totals.labor)}</td></tr>
      <tr><td>Parts</td><td class="r">${money(totals.parts)}</td></tr>
      <tr><td>Sales Tax</td><td class="r">${money(totals.tax)}</td></tr>
      <tr class="due"><td>Total Due</td><td class="r">${money(totals.due)}</td></tr>
    </table>
  </div>

  <div class="signline">
    <div>Customer Signature</div>
    <div>Date</div>
  </div>

  <script>window.onload = () => window.print();</script>
</body>
</html>`;

  const win = window.open("", "_blank", "width=850,height=1100");
  if (!win) {
    alert("Please allow pop-ups for this site to print invoices.");
    return;
  }
  win.document.write(html);
  win.document.close();
}
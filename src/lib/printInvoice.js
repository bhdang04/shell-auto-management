// Fallback only — used if shop settings haven't loaded yet for some reason.
export const SHOP = {
  name: "Shell Complete Auto Service",
  addr: "482 Auto Plaza Dr, San Jose, CA 95112",
  phone: "(408) 555-0142",
  license_number: "",
};

// How many total rows (real item rows + note rows + blank rows) each
// column is padded out to, so the invoice fills a full page like a real
// pre-printed pad even on a light ticket, and both columns stay the same
// height regardless of which side has more real content. Tune this if it
// runs long/short on your actual printer.
const TARGET_ROWS = 25;

export function money(n) {
  return "$" + Number(n || 0).toFixed(2);
}

export function esc(s) {
  return String(s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
}

function laborRow(it) {
  const hrs = it.qty === "" || it.qty === undefined ? "—" : it.qty;
  const rate = it.price === "" || it.price === undefined ? "—" : money(it.price);
  const total = it.qty === "" || it.price === "" ? "—" : money(it.total);
  return `<tr><td>${esc(it.desc)}</td><td class="r">${esc(hrs)}</td><td class="r">${rate}</td><td class="r">${total}</td></tr>`;
}

function partRow(it) {
  const qty = it.qty === "" || it.qty === undefined ? "—" : it.qty;
  const price = it.price === "" || it.price === undefined ? "—" : money(it.price);
  const total = it.qty === "" || it.price === "" ? "—" : money(it.total);
  return `<tr><td>${esc(it.desc)}</td><td class="r">${esc(qty)}</td><td class="r">${price}</td><td class="r">${total}</td></tr>`;
}

function noteRow(text, isLast) {
  return `<tr class="note${isLast ? " last" : ""}"><td colspan="4">${esc(text)}</td></tr>`;
}

function blankRow() {
  return `<tr class="blank"><td>&nbsp;</td><td></td><td></td><td></td></tr>`;
}

/**
 * Walks the ticket's items in their ORIGINAL saved order and attaches each
 * comment line to the most recent LABOR line — not just "whatever came
 * immediately before it." A Quick Job's real line order is usually labor,
 * then any parts it needs, then comments describing the job (e.g. "Trans
 * Flush & Fill Service" -> "ATF Fluids" -> 5 step comments) — the comments
 * are about the labor being performed, so a part line in between shouldn't
 * steal them. A part only picks up trailing comments if no labor line has
 * appeared yet at all (a parts-only ticket with notes).
 *
 * A comment with nothing before it at all (the very first line is a
 * comment) has nowhere to attach — those are collected separately as
 * "orphan" notes for a small General Remarks fallback box.
 */
function groupItemsWithNotes(items) {
  const laborGroups = [];
  const partGroups = [];
  const orphanNotes = [];
  let lastLaborGroup = null;
  let lastPartGroup = null;

  for (const it of items) {
    if (it.kind === "comment") {
      if (lastLaborGroup) {
        lastLaborGroup.notes.push(it.desc);
      } else if (lastPartGroup) {
        lastPartGroup.notes.push(it.desc);
      } else {
        orphanNotes.push(it.desc);
      }
    } else if (it.tag === "LABOR") {
      const g = { item: it, notes: [] };
      laborGroups.push(g);
      lastLaborGroup = g;
    } else if (it.tag === "PART") {
      const g = { item: it, notes: [] };
      partGroups.push(g);
      lastPartGroup = g;
    }
  }

  return { laborGroups, partGroups, orphanNotes };
}

/** Renders one column's groups (item row + its note rows, per group),
 *  then pads with blank rows up to TARGET_ROWS. rowFn is laborRow or
 *  partRow depending on which column this is. */
function buildColumnHtml(groups, rowFn) {
  let html = "";
  let count = 0;

  for (const g of groups) {
    html += rowFn(g.item);
    count += 1;
    g.notes.forEach((note, i) => {
      html += noteRow(note, i === g.notes.length - 1);
      count += 1;
    });
  }

  const blanksNeeded = Math.max(0, TARGET_ROWS - count);
  for (let i = 0; i < blanksNeeded; i++) html += blankRow();

  return html;
}

/** Opens a blank print window synchronously — call this FIRST, before any
 *  await, so the browser still treats it as a direct result of the click
 *  and doesn't block it as a popup. Pass the returned handle in as `win`. */
export function openInvoiceWindow() {
  const win = window.open("", "_blank", "width=1000,height=1150");
  if (!win) {
    alert("Please allow pop-ups for this site to print invoices.");
    return null;
  }
  win.document.write("<p style='font-family:sans-serif;padding:20px;'>Preparing invoice…</p>");
  return win;
}

/**
 * printInvoiceReceipt
 * Opens a print-ready invoice: a centered shop header (name / license /
 * address+phone), a right-aligned invoice #/date/status line, a
 * customer+vehicle info box, then two side-by-side Labor and Parts &
 * Lubricants tables — each comment attached as its own note row directly
 * under the item it followed, both columns padded to a full page.
 *
 * win: optional pre-opened window (from openInvoiceWindow, called before an
 *   await elsewhere) — if omitted, opens its own window.
 * shop: { name, addr, phone, license_number } — from shop settings.
 */
export function printInvoiceReceipt({
  win,
  invoiceNum,
  invoiceDate,
  status,
  customer,
  vehicle,
  items,
  totals,
  paymentMethod,
  paymentSurcharge,
  checkNumber,
  shop,
}) {
  const shopInfo = shop || SHOP;
  const { laborGroups, partGroups, orphanNotes } = groupItemsWithNotes(items);

  const laborHtml = buildColumnHtml(laborGroups, laborRow);
  const partsHtml = buildColumnHtml(partGroups, partRow);

  const finalTotal = Number(totals.due) + Number(paymentSurcharge || 0);

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Invoice ${invoiceNum ? "#" + invoiceNum : ""}</title>
<style>
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:Arial, Helvetica, sans-serif; color:#111; }
  .page { width:8.5in; min-height:11in; margin:0 auto; padding:0.35in 0.4in; font-size:10px; }

  .head-center { text-align:center; border-bottom:2px solid #111; padding-bottom:8px; margin-bottom:6px; }
  .head-center h1 { font-size:17px; letter-spacing:.02em; }
  .head-center .license { font-size:9.5px; color:#666; letter-spacing:.04em; margin-top:3px; }
  .head-center .license b { color:#333; }
  .head-center .addr { font-size:10px; color:#333; margin-top:3px; }

  .invmeta-line { display:flex; justify-content:flex-end; gap:16px; font-size:9.5px; color:#333; margin-bottom:8px; }
  .invmeta-line b { font-family:'Courier New', monospace; }

  .infobox { display:grid; grid-template-columns:1fr 1fr; border:1px solid #999; margin-bottom:8px; }
  .infobox .cell { padding:4px 8px; }
  .infobox .cell + .cell { border-left:1px solid #999; }
  .infobox .row { display:flex; justify-content:space-between; padding:1px 0; gap:10px; }
  .infobox .lbl { color:#666; font-size:8.5px; text-transform:uppercase; letter-spacing:.04em; white-space:nowrap; }
  .infobox .val { font-weight:600; text-align:right; }

  .columns { display:grid; grid-template-columns:1.1fr 1fr; gap:12px; align-items:start; }
  h3.section { font-size:9.5px; text-transform:uppercase; letter-spacing:.06em; background:#dcdcdc; border:1px solid #999; border-bottom:none; padding:3px 8px; }

  table.grid { width:100%; border-collapse:collapse; }
  table.grid th { background:#eee; border:1px solid #999; font-size:8px; text-transform:uppercase; letter-spacing:.03em; color:#444; padding:2px 5px; text-align:left; }
  table.grid th.r, table.grid td.r { text-align:right; white-space:nowrap; }
  table.grid td { border:1px solid #bbb; padding:2px 5px; height:17px; font-size:10px; }
  table.grid tr.blank td { color:transparent; }
  table.grid tr.note td { border-top:none; background:#fafaf7; font-size:8.5px; font-style:italic; color:#666; padding:3px 5px 3px 16px; line-height:1.3; }
  table.grid tr.note.last td { padding-bottom:5px; }
  table.grid tfoot td { border:1px solid #999; background:#f3f3f0; font-weight:700; padding:3px 5px; }

  .remarks-box { border:1px solid #999; padding:6px 10px; font-size:9.5px; color:#333; line-height:1.5; margin-top:10px; }
  .remarks-box b { font-size:8.5px; text-transform:uppercase; letter-spacing:.04em; color:#555; display:block; margin-bottom:3px; }

  .bottom { display:flex; justify-content:space-between; align-items:flex-end; margin-top:10px; gap:20px; }
  .warranty { font-size:8px; color:#555; line-height:1.45; flex:1.3; }
  .warranty b { color:#333; }
  .sign { font-size:9px; color:#333; border-top:1px solid #333; padding-top:3px; margin-top:22px; }
  .totalsbox { border:1px solid #999; width:220px; flex-shrink:0; }
  .totalsbox .row { display:flex; justify-content:space-between; padding:3px 8px; border-bottom:1px solid #ccc; font-size:10px; }
  .totalsbox .row.paid { color:#166534; font-weight:700; }
  .totalsbox .row.due { font-weight:700; font-size:13px; border-bottom:none; background:#f3f3f0; padding:5px 8px; }

  @media print {
    body { margin:0; }
    .page { padding:0; }
    @page { size:letter; margin:0.35in 0.4in; }
  }
</style>
</head>
<body>
  <div class="page">
    <div class="head-center">
      <h1>${esc(shopInfo.name)}</h1>
      ${shopInfo.license_number ? `<div class="license">License #<b>${esc(shopInfo.license_number)}</b></div>` : ""}
      <div class="addr">${esc(shopInfo.addr)} &middot; ${esc(shopInfo.phone)}</div>
    </div>

    <div class="invmeta-line">
      <span>Invoice <b>${invoiceNum ? "#" + esc(invoiceNum) : "NEW"}</b></span>
      <span>Date <b>${esc(invoiceDate)}</b></span>
      <span>Status <b>${esc(status || "Open")}</b></span>
    </div>

    <div class="infobox">
      <div class="cell">
        <div class="row"><span class="lbl">Customer</span><span class="val">${esc(customer.name)}</span></div>
        <div class="row"><span class="lbl">Address</span><span class="val">${esc(customer.addr)}${customer.addr ? ", " : ""}${esc(customer.cityzip)}</span></div>
        <div class="row"><span class="lbl">Phone</span><span class="val">${esc(customer.phone1)}</span></div>
      </div>
      <div class="cell">
        <div class="row"><span class="lbl">Vehicle</span><span class="val">${esc([vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" "))}${vehicle.engine_specs ? " &middot; " + esc(vehicle.engine_specs) : ""}</span></div>
        <div class="row"><span class="lbl">Plate / VIN</span><span class="val">${esc(vehicle.plate) || "—"} / ${esc(vehicle.vin) || "—"}</span></div>
        <div class="row"><span class="lbl">Mileage</span><span class="val">${vehicle.odo ? esc(vehicle.odo) : "—"}</span></div>
      </div>
    </div>

    <div class="columns">
      <div>
        <h3 class="section">Labor</h3>
        <table class="grid">
          <thead><tr><th>Description</th><th class="r" style="width:38px">Hrs</th><th class="r" style="width:52px">Rate</th><th class="r" style="width:62px">Total</th></tr></thead>
          <tbody>${laborHtml}</tbody>
          <tfoot><tr><td colspan="3">Total Labor</td><td class="r">${money(totals.labor)}</td></tr></tfoot>
        </table>
      </div>
      <div>
        <h3 class="section">Parts &amp; Lubricants</h3>
        <table class="grid">
          <thead><tr><th>Description</th><th class="r" style="width:30px">Qty</th><th class="r" style="width:50px">Price</th><th class="r" style="width:58px">Total</th></tr></thead>
          <tbody>${partsHtml}</tbody>
          <tfoot><tr><td colspan="3">Total Parts</td><td class="r">${money(totals.parts)}</td></tr></tfoot>
        </table>
      </div>
    </div>

    ${
      orphanNotes.length
        ? `<div class="remarks-box"><b>General Remarks</b>${orphanNotes.map((n) => esc(n)).join("<br>")}</div>`
        : ""
    }

    <div class="bottom">
      <div class="warranty">
        <b>Limited Warranty:</b> All parts are new unless shown as used (U) or rebuilt (R). Parts are warranted by the manufacturer or supplier; labor is warranted for 30 days unless otherwise indicated in writing.
        <div class="sign">Customer Signature &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Date</div>
      </div>
      <div class="totalsbox">
        <div class="row"><span>Labor</span><span>${money(totals.labor)}</span></div>
        <div class="row"><span>Parts</span><span>${money(totals.parts)}</span></div>
        <div class="row"><span>Sales Tax</span><span>${money(totals.tax)}</span></div>
        ${
          paymentSurcharge > 0
            ? `<div class="row"><span>Card Surcharge</span><span>${money(paymentSurcharge)}</span></div>`
            : ""
        }
        ${
          paymentMethod
            ? `<div class="row paid"><span>Paid via ${esc(paymentMethod)}${checkNumber ? " #" + esc(checkNumber) : ""}</span><span></span></div>`
            : ""
        }
        <div class="row due"><span>Total</span><span>${money(finalTotal)}</span></div>
      </div>
    </div>
  </div>

  <script>window.onload = () => window.print();</script>
</body>
</html>`;

  if (win && !win.closed) {
    win.document.open();
    win.document.write(html);
    win.document.close();
  } else {
    const newWin = window.open("", "_blank", "width=1000,height=1150");
    if (!newWin) {
      alert("Please allow pop-ups for this site to print invoices.");
      return;
    }
    newWin.document.write(html);
    newWin.document.close();
  }
}
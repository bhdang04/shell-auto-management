// Fallback only — used if shop settings haven't loaded yet for some reason.
export const SHOP = {
  name: "Shell Complete Auto Service",
  addr: "482 Auto Plaza Dr, San Jose, CA 95112",
  phone: "(408) 555-0142",
  license_number: "",
};

// How many total rows (real item rows + note rows + blank rows) each
// column is padded out to, so both columns stay the same height and the
// Total Labor / Total Parts lines always sit on the same line. Every row
// (item, note, blank) is the same fixed height in the CSS below, so this
// number is the only thing that controls table height. Tune it if the
// invoice runs long/short on your actual printer.
const TARGET_ROWS = 20;

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
 * Opens a print-ready invoice: a centered shop header, an invoice # (left) /
 * date (center) / status (right) line, a compact customer+vehicle info box,
 * two side-by-side Labor and Parts & Lubricants tables (every row the same
 * height, comments attached as note rows under their item), then a bottom
 * section with the approval/notice/authorization boxes on the left (wide) and
 * the totals, acceptance signature and "Payment Using" box on the right
 * (narrow).
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

  // e.g. "CASH" or "CHECK #1234" — shown in the totals box and the Payment Using box
  const paymentLabel = paymentMethod
    ? `${esc(paymentMethod)}${checkNumber ? " #" + esc(checkNumber) : ""}`
    : "";

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Invoice ${invoiceNum ? "#" + invoiceNum : ""}</title>
<style>
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:Arial, Helvetica, sans-serif; color:#111; padding:0.3in; background:#f0ede4; }
  .page { background:#fff; width:8.5in; min-height:11in; margin:0 auto; padding:0.4in 0.5in; box-shadow:0 10px 30px rgba(0,0,0,.15); font-size:11px; display:flex; flex-direction:column; }

  .head-center { text-align:center; border-bottom:2px solid #111; padding-bottom:10px; margin-bottom:9px; }
  .head-center h1 { font-size:23px; letter-spacing:.02em; }
  .head-center .license { font-size:10.5px; color:#666; letter-spacing:.04em; margin-top:4px; }
  .head-center .license b { color:#333; }
  .head-center .addr { font-size:11.5px; color:#333; margin-top:4px; }

  .invmeta-line { display:grid; grid-template-columns:minmax(0,1fr) auto minmax(0,1fr); align-items:center; font-size:11px; color:#333; margin-bottom:9px; }
  .invmeta-line b { font-family:'Courier New', monospace; }

  /* compact customer + vehicle box */
  .infobox { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); border:1px solid #000; margin-bottom:6px; }
  .infobox .cell { padding:3px 8px; }
  .infobox .cell + .cell { border-left:1px solid #000; }
  .infobox .row { display:flex; justify-content:space-between; padding:0.5px 0; gap:8px; }
  .infobox .lbl { color:#666; font-size:8.5px; text-transform:uppercase; letter-spacing:.04em; white-space:nowrap; }
  .infobox .val { font-weight:600; text-align:right; font-size:10.5px; min-width:0; overflow-wrap:anywhere; }

  .columns { display:grid; grid-template-columns:minmax(0,1.1fr) minmax(0,1fr); gap:14px; align-items:start; }
  h3.section { font-size:11.5px; text-transform:uppercase; letter-spacing:.06em; background:#dcdcdc; border:1px solid #000; border-bottom:none; padding:5px 9px; }

  table.grid { width:100%; border-collapse:collapse; table-layout:fixed; }
  table.grid th { background:#eee; border:1px solid #000; font-size:9px; text-transform:uppercase; letter-spacing:.03em; color:#444; padding:4px 7px; text-align:left; }
  table.grid th.r, table.grid td.r { text-align:right; white-space:nowrap; }
  /* every body row (items, notes, blanks) is exactly the same height */
  table.grid tbody tr { height:22px; }
  table.grid td { border:1px solid #000; padding:0 7px; height:22px; font-size:11.5px; line-height:20px; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }
  table.grid tr.blank td { color:transparent; }
  table.grid tr.note td { background:#fafaf7; font-size:10px; font-style:italic; color:#666; padding-left:18px; }
  table.grid tfoot td { border:1px solid #000; background:#f3f3f0; font-weight:700; font-size:11.5px; padding:0 7px; height:24px; line-height:22px; }

  .remarks-box { border:1px solid #000; margin-top:9px; padding:5px 9px; font-size:10px; color:#333; line-height:1.4; }
  .remarks-box b { display:block; font-size:9px; text-transform:uppercase; letter-spacing:.04em; color:#444; margin-bottom:2px; }

  /* bottom section: left (wide) = approval / notices / authorization, right (narrow) = totals / signature / payment */
  .bottom { display:grid; grid-template-columns:minmax(0,1.75fr) minmax(0,0.75fr); gap:14px; margin-top:12px; align-items:stretch; break-inside:avoid; }
  .left { display:flex; flex-direction:column; gap:8px; min-width:0; }
  .toprow { flex:1; display:grid; grid-template-columns:minmax(0,1.25fr) minmax(0,1fr); gap:8px; }
  .box { border:1px solid #000; }
  .toprow > .box:first-child { display:flex; flex-direction:column; }
  .appr-head { display:grid; grid-template-columns:.8fr .8fr 1fr 1.3fr; background:#dcdcdc; border-bottom:1px solid #000; font-size:8.5px; font-weight:700; text-transform:uppercase; padding:4px 6px; }
  .appr-body { flex:1; min-height:38px; }
  .ack { border-top:1px solid #333; margin:0 8px 6px; padding-top:3px; font-size:9px; text-align:center; color:#333; }
  .notice { padding:6px 8px; font-size:10px; color:#333; line-height:1.4; display:flex; flex-direction:column; justify-content:space-between; gap:6px; }
  .notice .sep { border-top:1px solid #000; margin:0 -8px; }
  .notice b { font-size:10.5px; }
  /* flex:1 stretches this box so its bottom lines up with the bottom of "Payment Using" */
  .auth { flex:none; display:flex; flex-direction:column; justify-content:flex-start; padding:6px 9px; font-size:10px; line-height:1.45; color:#333; }
  .auth .initrow { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-top:6px; font-weight:700; }
  .auth .init { flex:0 0 110px; height:32px; border:1px solid #000; background:#fff; }

  .right { display:flex; flex-direction:column; gap:8px; min-width:0; }
  .totalsbox { border:1px solid #000; width:100%; }
  .totalsbox .row { display:flex; justify-content:space-between; padding:4px 9px; border-bottom:1px solid #000; font-size:11.5px; }
  .totalsbox .row.paid { color:#166534; font-weight:700; }
  .totalsbox .row.tot { font-weight:700; font-size:15px; border-bottom:none; background:#f3f3f0; padding:7px 9px; }

  .accept { margin-top:auto; padding-top:16px; }
  .accept .line { border-bottom:1px dotted #333; height:30px; display:flex; align-items:flex-end; }
  .accept .x { font-size:14px; font-weight:800; line-height:1; }
  .accept .cap { font-size:8px; letter-spacing:.16em; text-transform:uppercase; margin-top:2px; color:#333; }
  .accept .cap2 { font-size:8px; color:#333; }

  .pay { font-size:13px; border:1px solid #000; padding:6px 9px; display:flex; flex-wrap:wrap; align-items:baseline; gap:2px 8px; min-width:0; }
  .pay b { font-size:14px; text-transform:uppercase; letter-spacing:.02em; overflow-wrap:anywhere; }
  .pay .blankline { flex:1; border-bottom:1px solid #333; height:16px; }

  @media print {
    body { margin:0; padding:0; background:#fff; }
    .page { padding:0; box-shadow:none; min-height:0; width:100%; max-width:100%; }
    @page { size:letter; margin:0.3in 0.4in; }
    .head-center { padding-bottom:8px; margin-bottom:7px; }
    .bottom { margin-top:10px; }
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
      <span style="text-align:left">Invoice <b>${invoiceNum ? "#" + esc(invoiceNum) : "NEW"}</b></span>
      <span style="text-align:center">Date <b>${esc(invoiceDate)}</b></span>
      <span style="text-align:right">Status <b>${esc(status || "Open")}</b></span>
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
          <thead><tr><th>Description</th><th class="r" style="width:38px">Hrs</th><th class="r" style="width:56px">Rate</th><th class="r" style="width:62px">Total</th></tr></thead>
          <tbody>${laborHtml}</tbody>
          <tfoot><tr><td colspan="3">Total Labor</td><td class="r">${money(totals.labor)}</td></tr></tfoot>
        </table>
      </div>
      <div>
        <h3 class="section">Parts &amp; Lubricants</h3>
        <table class="grid">
          <thead><tr><th>Description</th><th class="r" style="width:34px">Qty</th><th class="r" style="width:54px">Price</th><th class="r" style="width:58px">Total</th></tr></thead>
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
      <div class="left">
        <div class="toprow">
          <div class="box">
            <div class="appr-head"><span>Date</span><span>Time</span><span>Phone</span><span>Approved Amount</span></div>
            <div class="appr-body"></div>
            <div class="ack">I acknowledge notice and oral approval of an increase in the original estimated price</div>
          </div>
          <div class="box notice">
            <div><b>All Parts Are New</b> Unless Shown As (U) Used or (R) Rebuilt</div>
            <div class="sep"></div>
            <div>This vehicle will be reassembled within 3 days of the date shown above if I do not authorize the recommended services.</div>
          </div>
        </div>

        <div class="box auth">
          I authorize the above repairs and necessary materials. Your employees may operate vehicle for inspection, testing, delivery at my risk. You will not be responsible for loss or damage to vehicle or items left in it. I agree to pay reasonable storage on vehicle left more than 3 working days after notification that job is completed. Labor is guaranteed 90 days or 4000 miles whichever occurs first. All other guarantees are made by the manufacturer. Warrantee work based on this bill must be performed at this shop. All parts are new unless specified as (U) used or (R) rebuilt.
          <div class="initrow"><span>REMOVED PARTS WILL BE DISPOSED OF UNLESS I INITIAL HERE &rarr;</span><span class="init"></span></div>
        </div>
      </div>

      <div class="right">
        <div class="totalsbox">
          <div class="row"><span>Labor</span><span>${money(totals.labor)}</span></div>
          <div class="row"><span>Parts</span><span>${money(totals.parts)}</span></div>
          <div class="row"><span>Sales Tax</span><span>${money(totals.tax)}</span></div>
          ${
            paymentSurcharge > 0
              ? `<div class="row"><span>Card Surcharge</span><span>${money(paymentSurcharge)}</span></div>`
              : ""
          }
          ${paymentMethod ? `<div class="row paid"><span>Paid via ${paymentLabel}</span><span></span></div>` : ""}
          <div class="row tot"><span>Total</span><span>${money(finalTotal)}</span></div>
        </div>

        <div class="accept">
          <div class="line"><span class="x">X</span></div>
          <div class="cap">Acceptance Signature</div>
          <div class="cap2">I accept the charges and terms of this agreement.</div>
        </div>

        <div class="pay">Payment Using: ${paymentMethod ? `<b>${paymentLabel}</b>` : `<span class="blankline"></span>`}</div>
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
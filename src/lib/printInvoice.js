// Fallback only — used if shop settings haven't loaded yet for some reason.
export const SHOP = {
  name: "Shell Complete Auto Service",
  addr: "482 Auto Plaza Dr, San Jose, CA 95112",
  phone: "(408) 555-0142",
  license_number: "",
};

// ---------------------------------------------------------------------------
// PAGINATION BUDGETS (in px of Labor/Parts body height per page).
//
// Descriptions and comments WRAP onto as many lines as they need. To decide
// when a ticket must continue on the next page, every entry's height is
// estimated from its CHARACTER COUNT (how many lines it will wrap to). Each
// page has a budget: if the page's used height + the next entry's height
// would go over the budget, the whole entry (a labor/part line together with
// its comments) moves to the next page.
//
//   SINGLE_PAGE_PX  – ticket fits on ONE page (full header + bottom section)
//   FIRST_PAGE_PX   – page 1 of a multi-page ticket (no bottom section)
//   CONT_PAGE_PX    – pages 2+ that are not the last page (compact header)
//   LAST_CONT_PX    – the LAST page when it isn't page 1 (has bottom section)
//
// If a page spills onto an extra sheet, LOWER that number. If a page leaves
// too much white space at the bottom, RAISE it.
// ---------------------------------------------------------------------------
const SINGLE_PAGE_PX = 370;
const FIRST_PAGE_PX = 660;
const CONT_PAGE_PX = 800;
const LAST_CONT_PX = 530;

const nonLastCap = (i) => (i === 0 ? FIRST_PAGE_PX : CONT_PAGE_PX);
const lastCap = (i) => (i === 0 ? SINGLE_PAGE_PX : LAST_CONT_PX);

// Characters that fit on ONE printed line, per column. Deliberately a bit
// conservative so the estimate errs toward pushing to the next page rather
// than overflowing. Lower a value if long text is wrapping more than the
// estimate expects.
const LABOR_DESC_CPL = 36;
const LABOR_NOTE_CPL = 34;
const PART_DESC_CPL = 25;
const PART_NOTE_CPL = 24;

// Row heights used by the estimate (must match the CSS below).
const ITEM_PAD = 13; // 4px + 4px padding, +5px group spacing above (counted for every item, to stay conservative)
const ITEM_LINE = 14; // line-height of an item line
const NOTE_PAD = 8; // 4px + 4px padding
const NOTE_LINE = 14; // line-height of a note line (same as an item line)

export function money(n) {
  return "$" + Number(n || 0).toFixed(2);
}

export function esc(s) {
  return String(s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
}

/** How many lines `text` wraps to at `cpl` characters per line (word-wrap). */
function wrapCount(text, cpl) {
  const words = String(text ?? "").split(/\s+/).filter(Boolean);
  if (!words.length) return 1;
  let lines = 1;
  let len = 0;
  for (const w of words) {
    const need = len === 0 ? w.length : len + 1 + w.length;
    if (need <= cpl) {
      len = need;
    } else {
      if (len > 0) lines += 1;
      // a single word longer than a whole line breaks across lines
      lines += Math.max(0, Math.ceil(w.length / cpl) - 1);
      len = w.length % cpl || Math.min(w.length, cpl);
    }
  }
  return lines;
}

const itemHeight = (text, cpl) => ITEM_PAD + ITEM_LINE * wrapCount(text, cpl);
const noteHeight = (text, cpl) => NOTE_PAD + NOTE_LINE * wrapCount(text, cpl);

function laborRow(it) {
  const hrs = it.qty === "" || it.qty === undefined ? "—" : it.qty;
  const total = it.qty === "" || it.price === "" ? "—" : money(it.total);
  return `<div class="g L i"><div>${esc(it.desc)}</div><div>${esc(hrs)}</div><div>${total}</div></div>`;
}

function partCond(it) {
  return it.condition ? `(${it.condition}) ` : "";
}

function partRow(it) {
  const qty = it.qty === "" || it.qty === undefined ? "—" : it.qty;
  const price = it.price === "" || it.price === undefined ? "—" : money(it.price);
  const total = it.qty === "" || it.price === "" ? "—" : money(it.total);
  // (U) used / (R) rebuilt goes FIRST. New parts have no condition and print with no tag.
  const cond = it.condition ? `<b>(${esc(it.condition)})</b> ` : "";
  return `<div class="g P i"><div>${cond}${esc(it.desc)}</div><div>${esc(qty)}</div><div>${price}</div><div>${total}</div></div>`;
}

// Comment rows keep the same column grid as item rows: the text sits in the
// Description cell only (so it wraps within that width) and the remaining
// cells are empty, which lets the vertical column lines run straight through.
function noteRow(text, cls) {
  const empties = cls === "L" ? 2 : 3;
  return `<div class="g ${cls} nr"><div class="n">${esc(text)}</div>${"<div></div>".repeat(empties)}</div>`;
}

/**
 * Walks the ticket's items in their ORIGINAL saved order and attaches each
 * comment line to the most recent LABOR line — not just "whatever came
 * immediately before it." A Quick Job's real line order is usually labor,
 * then any parts it needs, then comments describing the job, so a part line
 * in between shouldn't steal them. A part only picks up trailing comments if
 * no labor line has appeared yet at all (a parts-only ticket with notes).
 *
 * A comment with nothing before it at all has nowhere to attach — those are
 * collected as "orphan" notes for a small General Remarks fallback box.
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

// Row builders: turn one group into [{ html, h }] where h is the estimated
// height in px of that row once its text has wrapped.
function laborGroupRows(g) {
  return [
    { html: laborRow(g.item), h: itemHeight(g.item.desc, LABOR_DESC_CPL) },
    ...g.notes.map((n) => ({ html: noteRow(n, "L"), h: noteHeight(n, LABOR_NOTE_CPL) })),
  ];
}

function partGroupRows(g) {
  return [
    { html: partRow(g.item), h: itemHeight(partCond(g.item) + g.item.desc, PART_DESC_CPL) },
    ...g.notes.map((n) => ({ html: noteRow(n, "P"), h: noteHeight(n, PART_NOTE_CPL) })),
  ];
}

/**
 * Splits one column into pages: [{ items: [{ html, h, g }], px }]. A group
 * (item + its comments, tagged with the same `g`) is kept together — if its
 * estimated height doesn't fit in what's left of the page, the WHOLE group
 * moves to the next page. Only a group taller than a full continuation page
 * is allowed to split row by row.
 */
function paginateColumn(groups, buildRows) {
  const pages = [{ items: [], px: 0 }];

  groups.forEach((g, gi) => {
    const rows = buildRows(g);
    const total = rows.reduce((s, r) => s + r.h, 0);
    const idx = pages.length - 1;
    const cur = pages[idx];

    if (cur.px > 0 && cur.px + total > nonLastCap(idx) && total <= CONT_PAGE_PX) {
      pages.push({ items: [], px: 0 });
    }

    for (const r of rows) {
      let page = pages[pages.length - 1];
      if (page.px > 0 && page.px + r.h > nonLastCap(pages.length - 1)) {
        pages.push({ items: [], px: 0 });
        page = pages[pages.length - 1];
      }
      page.items.push({ html: r.html, h: r.h, g: gi });
      page.px += r.h;
    }
  });

  return pages;
}

/** Both columns share page boundaries: page count = whichever needs more.
 *  The LAST page must also leave room for the bottom section (totals,
 *  signature…), which allows less height. If the final page is too full,
 *  the LAST group (item + its comments) is moved onto one extra page so that
 *  page carries real content plus the totals block, instead of a blank
 *  page holding only the totals. */
function planPages(laborGroups, partGroups) {
  const lp = paginateColumn(laborGroups, laborGroupRows);
  const pp = paginateColumn(partGroups, partGroupRows);
  let count = Math.max(lp.length, pp.length);

  const lastIdx = count - 1;
  const px = (pages, i) => pages[i]?.px || 0;

  if (Math.max(px(lp, lastIdx), px(pp, lastIdx)) > lastCap(lastIdx)) {
    for (const pages of [lp, pp]) {
      if (px(pages, lastIdx) <= lastCap(lastIdx)) continue;
      const page = pages[lastIdx];
      const lastG = page.items[page.items.length - 1].g;
      const first = page.items.findIndex((it) => it.g === lastG);
      if (first > 0) {
        const moved = page.items.splice(first);
        const movedPx = moved.reduce((s, it) => s + it.h, 0);
        page.px -= movedPx;
        while (pages.length < count) pages.push({ items: [], px: 0 });
        pages[count] = { items: moved, px: movedPx };
      }
    }
    count += 1;
  }

  return { lp, pp, count };
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
 * Opens a print-ready invoice. Page 1 has the full shop header, meta line and
 * customer/vehicle box; if Labor or Parts overflow, extra pages are added with
 * a compact header (shop, invoice #, date, customer, vehicle, page X of Y).
 * Labor and Parts descriptions/comments wrap onto as many lines as needed;
 * the two columns are stretched to the same height so Total Labor and
 * Total Parts always line up. Comment rows stay with their item, and the
 * totals / approval / signature / payment section appears on the LAST page
 * only (earlier pages show "Continued on next page").
 *
 * Pass status: "Estimate" to print an estimate — the header reads
 * "Estimate #..." instead of "Invoice #..." and the "Payment Using" box
 * is left off.
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
  serviceSummary,
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

  const isEstimate = status === "Estimate";
  const docLabel = isEstimate ? "Estimate" : "Invoice";

  const { lp, pp, count } = planPages(laborGroups, partGroups);

  const finalTotal = Number(totals.due) + Number(paymentSurcharge || 0);

  // e.g. "CASH" or "CHECK #1234" — shown in the totals box and the Payment Using box
  const paymentLabel = paymentMethod
    ? `${esc(paymentMethod)}${checkNumber ? " #" + esc(checkNumber) : ""}`
    : "";

  const vehicleStr = [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ");
  const summary = String(serviceSummary || "").trim();

  // ---- header variants -----------------------------------------------------
  const fullHeader = `
    <div class="head-center">
      <h1>${esc(shopInfo.name)}</h1>
      ${shopInfo.license_number ? `<div class="license">License #<b>${esc(shopInfo.license_number)}</b></div>` : ""}
      <div class="addr">${esc(shopInfo.addr)} &middot; ${esc(shopInfo.phone)}</div>
    </div>

    <div class="invmeta-line">
      <span>${docLabel} <b>${invoiceNum ? "#" + esc(invoiceNum) : "NEW"}</b></span>
      <span>Date <b>${esc(invoiceDate)}</b></span>
      <span class="meta-right">
        ${summary ? `<span class="svc"><b>${esc(summary)}</b></span>` : ""}
        <span class="stat">Status <b>${esc(status || "Open")}</b></span>
      </span>
    </div>

    <div class="infobox">
      <div class="cell">
        <div class="row"><span class="lbl">Customer</span><span class="val">${esc(customer.name)}</span></div>
        <div class="row"><span class="lbl">Address</span><span class="val">${esc(customer.addr)}${customer.addr ? ", " : ""}${esc(customer.cityzip)}</span></div>
        <div class="row"><span class="lbl">Phone</span><span class="val">${esc(customer.phone1)}</span></div>
      </div>
      <div class="cell">
        <div class="row"><span class="lbl">Vehicle</span><span class="val">${esc(vehicleStr)}${vehicle.engine_specs ? " &middot; " + esc(vehicle.engine_specs) : ""}</span></div>
        <div class="row"><span class="lbl">Plate / VIN</span><span class="val">${esc(vehicle.plate) || "—"} / ${esc(vehicle.vin) || "—"}</span></div>
        <div class="row"><span class="lbl">Mileage</span><span class="val">${vehicle.odo ? esc(vehicle.odo) : "—"}</span></div>
      </div>
    </div>`;

  const compactHeader = (pageNum) => `
    <div class="head-compact">
      <span class="hc-shop">${esc(shopInfo.name)}</span>
      <span>${docLabel} <b>${invoiceNum ? "#" + esc(invoiceNum) : "NEW"}</b> &middot; ${esc(invoiceDate)}</span>
      <span class="hc-mid">${esc(customer.name)}${vehicleStr ? " &middot; " + esc(vehicleStr) : ""}</span>
      <span>Page <b>${pageNum}</b> of <b>${count}</b></span>
    </div>`;

  // ---- bottom section (last page only) --------------------------------------
  const remarksHtml = orphanNotes.length
    ? `<div class="remarks-box"><b>General Remarks</b>${orphanNotes.map((n) => esc(n)).join("<br>")}</div>`
    : "";

  const bottomHtml = `
    ${remarksHtml}
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

        ${
          isEstimate
            ? ""
            : `<div class="pay">Payment Using: ${paymentMethod ? `<b>${paymentLabel}</b>` : `<span class="blankline"></span>`}</div>`
        }
      </div>
    </div>`;

  // ---- build each page --------------------------------------------------------
  const contFoot = (cls) =>
    `<div class="g ${cls} k"><div class="cont" style="grid-column:1/-1">Continued on next page &rarr;</div></div>`;

  let pagesHtml = "";
  for (let i = 0; i < count; i++) {
    const isLast = i === count - 1;
    const cap = isLast ? lastCap(i) : nonLastCap(i);

    const laborBody = (lp[i]?.items || []).map((r) => r.html).join("");
    const partsBody = (pp[i]?.items || []).map((r) => r.html).join("");

    const laborFoot = isLast
      ? `<div class="g L k"><div style="grid-column:1/3">Total Labor</div><div>${money(totals.labor)}</div></div>`
      : contFoot("L");
    const partsFoot = isLast
      ? `<div class="g P k"><div style="grid-column:1/4">Total Parts</div><div>${money(totals.parts)}</div></div>`
      : contFoot("P");

    pagesHtml += `
  <div class="page">
    ${i === 0 ? fullHeader : compactHeader(i + 1)}

    <div class="columns">
      <div class="c">
        <div class="t">Labor</div>
        <div class="g L h"><div>Description</div><div>Hrs</div><div>Total</div></div>
        <div class="cb" style="min-height:${cap}px">${laborBody}<div class="g L f"><div></div><div></div><div></div></div></div>
        ${laborFoot}
      </div>
      <div class="c">
        <div class="t">Parts &amp; Lubricants</div>
        <div class="g P h"><div>Description</div><div>Qty</div><div>Price</div><div>Total</div></div>
        <div class="cb" style="min-height:${cap}px">${partsBody}<div class="g P f"><div></div><div></div><div></div><div></div></div></div>
        ${partsFoot}
      </div>
    </div>

    ${isLast ? bottomHtml : ""}
    ${count > 1 ? `<div class="pagefoot">Page ${i + 1} of ${count}</div>` : ""}
  </div>`;
  }

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${docLabel} ${invoiceNum ? "#" + invoiceNum : ""}</title>
<style>
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:Arial, Helvetica, sans-serif; color:#111; padding:0.3in; background:#f0ede4; }
  .page { background:#fff; width:8.5in; min-height:11in; margin:0 auto 0.3in; padding:0.4in 0.5in; box-shadow:0 10px 30px rgba(0,0,0,.15); font-size:11px; display:flex; flex-direction:column; }

  .head-center { text-align:center; border-bottom:2px solid #111; padding-bottom:10px; margin-bottom:9px; }
  .head-center h1 { font-size:23px; letter-spacing:.02em; }
  .head-center .license { font-size:10.5px; color:#666; letter-spacing:.04em; margin-top:4px; }
  .head-center .license b { color:#333; }
  .head-center .addr { font-size:11.5px; color:#333; margin-top:4px; }

  /* compact header used on continuation pages */
  .head-compact { display:flex; justify-content:space-between; align-items:baseline; gap:12px; border-bottom:2px solid #111; padding-bottom:6px; margin-bottom:8px; font-size:10.5px; color:#333; }
  .head-compact b { font-family:'Courier New', monospace; }
  .head-compact .hc-shop { font-size:13px; font-weight:700; color:#111; white-space:nowrap; }
  .head-compact .hc-mid { flex:1; min-width:0; text-align:center; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }

  .invmeta-line { display:grid; grid-template-columns:auto auto minmax(0,1fr); column-gap:26px; align-items:center; font-size:11px; color:#333; margin-bottom:9px; }
  .invmeta-line b { font-family:'Courier New', monospace; }
  .invmeta-line .meta-right { display:flex; justify-content:flex-end; align-items:baseline; gap:16px; min-width:0; }
  .invmeta-line .svc { flex:0 1 auto; min-width:0; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }
  .invmeta-line .svc b { font-family:Arial, Helvetica, sans-serif; font-weight:700; }
  .invmeta-line .stat { flex:none; white-space:nowrap; }
  
  /* compact customer + vehicle box */
  .infobox { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); border:1px solid #000; margin-bottom:6px; }
  .infobox .cell { padding:3px 8px; }
  .infobox .cell + .cell { border-left:1px solid #000; }
  .infobox .row { display:flex; justify-content:space-between; padding:0.5px 0; gap:8px; }
  .infobox .lbl { color:#666; font-size:8.5px; text-transform:uppercase; letter-spacing:.04em; white-space:nowrap; }
  .infobox .val { font-weight:600; text-align:right; font-size:10.5px; min-width:0; overflow-wrap:anywhere; }

  /* Labor / Parts: both columns stretch to the same height so the totals line up */
  .columns { display:grid; grid-template-columns:minmax(0,1.1fr) minmax(0,1fr); gap:14px; align-items:stretch; }
  .c { display:flex; flex-direction:column; border:1px solid #000; }
  .c .t { background:#dcdcdc; border-bottom:1px solid #000; padding:5px 9px; font-size:11.5px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; }
  .cb { display:flex; flex-direction:column; flex:1; }
  .cb > .g { flex:none; }
  .cb > .g.f { flex:1 1 auto; }

  .g { display:grid; }
  .g.L { grid-template-columns:minmax(0,1fr) 44px 72px; }
  .g.P { grid-template-columns:minmax(0,1fr) 32px 64px 68px; }
  .g > div { padding:4px 6px; font-size:11.5px; line-height:14px; min-width:0; overflow-wrap:anywhere; }
  .g > div + div { border-left:1px solid #000; text-align:right; white-space:nowrap; padding-left:4px; padding-right:5px; }
  /* no horizontal row lines; each new item gets a little extra space above it so groups stay readable */
  .cb > .g.i:not(:first-child) > div { padding-top:9px; }
  /* comments: same size/line-height/padding as regular line items, white background, slightly indented italic */
  .g.nr > .n { padding-left:18px; padding-right:7px; font-style:italic; color:#555; text-align:left; }
  .g.h > div { background:#eee; border-bottom:1px solid #000; font-size:9px; line-height:14px; text-transform:uppercase; letter-spacing:.03em; color:#444; }
  .g.k > div { background:#f3f3f0; border-top:1px solid #000; font-weight:700; font-size:11.5px; padding:5px 6px; }
  .g.k > div + div { padding-left:4px; padding-right:5px; }
  .g.k > .cont { text-align:right; font-weight:600; font-style:italic; font-size:10.5px; color:#555; white-space:normal; border-left:none; }

  .pagefoot { margin-top:auto; padding-top:6px; text-align:right; font-size:9px; color:#666; letter-spacing:.04em; }

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
  .ack { border-top:1px solid #333; margin:0 8px 6px; padding-top:3px; font-size:12px; text-align:center; color:#333; }
  .notice { padding:6px 8px; font-size:10px; color:#333; line-height:1.4; display:flex; flex-direction:column; justify-content:space-between; gap:6px; }
  .notice .sep { border-top:1px solid #000; margin:0 -8px; }
  .notice b { font-size:10.5px; }
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
    .page { padding:0; box-shadow:none; min-height:0; width:100%; max-width:100%; margin:0; break-after:page; page-break-after:always; }
    .page:last-of-type { break-after:auto; page-break-after:auto; }
    @page { size:letter; margin:0.3in 0.4in; }
    .head-center { padding-bottom:8px; margin-bottom:7px; }
    .bottom { margin-top:10px; }
  }
</style>
</head>
<body>${pagesHtml}
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
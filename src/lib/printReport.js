// Printable Daily / Weekly / Monthly report (modeled on the old InvoMax report).
// Page 1 = shop header + three-column summary + the start of the invoice
// list. If the invoice list is long it continues on extra pages with a
// compact header; the TOTALS row is the last row of the last page.

const SHOP_FALLBACK = {
  name: "Shell Complete Auto Service",
  addr: "",
  phone: "",
  license_number: "",
};

// Invoice-list rows per page (every row is a fixed 18px tall), INCLUDING the
// final TOTALS row. Page 1 holds fewer because the summary takes the space.
// If a page spills onto an extra sheet, LOWER these. If there is a lot of
// empty space, RAISE them.
const FIRST_PAGE_ROWS = 20;
const CONT_PAGE_ROWS = 42;

// Card-type payment methods that always get a line, even at 0.00.
const FIXED_CARDS = ["Visa", "Mastercard", "American Express", "Discover", "ATM"];

const TITLES = { daily: "DAILY REPORT", weekly: "WEEKLY REPORT", monthly: "MONTHLY REPORT" };
const PERIOD_WORD = { daily: "Day", weekly: "Week", monthly: "Month" };

function esc(s) {
  return String(s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
}

// Report amounts print without a "$", like the old report: 1,234.50 -> 1234.50
const fmt = (n) => Number(n || 0).toFixed(2);

// The list shows the date each invoice was PAID.
function invoiceDate(inv) {
  const d = new Date(inv.paid_at || inv.created_at);
  return d.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "2-digit" });
}

function row(label, val, cls = "") {
  return `<div class="r ${cls}"><span>${label}</span><span>${val}</span></div>`;
}

/** Opens a blank window synchronously — call FIRST, before any await, so the
 *  browser doesn't block it as a popup. Pass the handle to printReport as `win`. */
export function openReportWindow() {
  const win = window.open("", "_blank", "width=1000,height=1150");
  if (!win) {
    alert("Please allow pop-ups for this site to print reports.");
    return null;
  }
  win.document.write("<p style='font-family:sans-serif;padding:20px;'>Preparing report…</p>");
  return win;
}

/**
 * printReport
 *  win:        pre-opened window from openReportWindow (optional)
 *  tab:        "daily" | "weekly" | "monthly"
 *  rangeLabel: the period text — daily "9/17/2026", weekly "9/14/2026 – 9/20/2026",
 *              monthly "September 2026" (same label the Reports popup shows)
 *  shop:       { name, addr, phone, license_number } from shop settings
 *  summary:    result of summarizeInvoices(invoices)
 *  invoices:   the paid invoices for the period
 *  extras:     result of getReportExtras(start, end, invoices)
 */
export function printReport({ win, tab, rangeLabel, shop, summary, invoices, extras }) {
  const s = shop || SHOP_FALLBACK;
  const title = TITLES[tab] || "REPORT";
  const periodWord = PERIOD_WORD[tab] || "Period";
  const ex = extras || {};
  const printedAt = new Date().toLocaleString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  // ---- left column: cash drawer + credit cards --------------------------------
  const cardNames = [
    ...FIXED_CARDS,
    ...Object.keys(summary.cardByMethod || {})
      .filter((m) => !FIXED_CARDS.includes(m))
      .sort(),
  ];

  const cashDrawerBox = `
    <div class="col"><div class="bh">Cash Drawer</div>
      <div class="pad">
        ${row("Cash Received", fmt(summary.cashTotal))}
        ${row("Checks Received", fmt(summary.checkTotal))}
        ${row("Number of Checks", summary.checkCount)}
        ${row("Credit Cards Received", fmt(summary.cardTotal))}
        ${row("Number of Cards", summary.cardCount)}
        ${row("Total Drawer", fmt(summary.total), "b")}
      </div>
    </div>`;

  const cardsBox = `
    <div class="col"><div class="bh">Credit Cards</div>
      <div class="pad">
        ${cardNames.map((m) => row(esc(m), fmt((summary.cardByMethod || {})[m] || 0))).join("")}
      </div>
    </div>`;

  // ---- middle column ------------------------------------------------------------
  const openRows =
    tab === "weekly"
      ? row("Open Jobs (Week)", fmt(ex.openWeek))
      : row("Open Jobs (Week)", fmt(ex.openWeek)) + row(`Open Jobs (${periodWord})`, fmt(ex.openPeriod));

  const returnVal = ex.returnPct === null || ex.returnPct === undefined ? "—" : `${ex.returnPct}%`;

  const monthly = ex.monthly || [];
  const maxNet = Math.max(0, ...monthly.map((m) => m.net));
  const bars = monthly
    .map((m, i) => {
      const pct = maxNet > 0 ? Math.max(3, Math.round((m.net / maxNet) * 100)) : 3;
      const dark = i === monthly.length - 1 ? " dark" : "";
      return `<div class="bar${dark}" style="height:${pct}%"></div>`;
    })
    .join("");
  const barLabels = monthly.map((m) => `<span>${esc(m.label)}</span>`).join("");

  const middle = `
    <div class="col"><div class="pad">
      ${openRows}
      ${row("Labor (not taxed)", fmt(summary.labor), "b")}
      ${row("Parts &amp; Supplies (taxed)", fmt(summary.parts))}
      ${row("Uncollected Balances", fmt(ex.uncollected), "b")}
      ${row("Uncollected 30 Days", fmt(ex.uncollected30))}
      <div class="r dark"><span>Return Customer Ratio</span><span>${returnVal}</span></div>
    </div></div>
    <div class="col chart">
      <div class="ct">Monthly Sales</div>
      <div class="bars">${bars}</div>
      <div class="blabels">${barLabels}</div>
    </div>`;

  // ---- right column ---------------------------------------------------------------
  const right = `
    <div class="col"><div class="pad">
      ${row("Parts", fmt(summary.parts))}
      ${row("Labor", fmt(summary.labor))}
      ${row("NET SALES", fmt(summary.net), "b")}
      ${row("Sales Tax", fmt(summary.tax))}
      ${row("Card Surcharge", fmt(summary.surcharge))}
      ${row("TOTAL COLLECTED", fmt(summary.total), "b")}
    </div></div>
    <div class="col"><div class="pad">
      ${row(`Avg Ticket (${summary.count})`, fmt(summary.avgNetTicket))}
      ${row("Parts to Labor Ratio", summary.partsToLaborPct === null ? "—" : summary.partsToLaborPct + "%")}
    </div></div>`;

  // ---- invoice list rows ----------------------------------------------------------------
  const sorted = invoices
    .slice()
    .sort((a, b) => new Date(a.paid_at || a.created_at) - new Date(b.paid_at || b.created_at) || String(a.num).localeCompare(String(b.num), undefined, { numeric: true }));

  const invRows = sorted.map((inv) => {
    const labor = Number(inv.labor_total) || 0;
    const parts = Number(inv.parts_total) || 0;
    const tax = Number(inv.tax) || 0;
    const sur = Number(inv.payment_surcharge) || 0;
    return `<div class="tg"><div>${esc(invoiceDate(inv))}</div><div>${esc(inv.num)}</div><div>${fmt(labor + parts + tax + sur)}</div><div>${fmt(labor)}</div><div>${fmt(parts)}</div><div>${fmt(tax)}</div><div>${esc(inv.payment_method || "—")}</div></div>`;
  });

  const totalsRow = `<div class="tg tt"><div>TOTALS</div><div>${summary.count}</div><div>${fmt(summary.total)}</div><div>${fmt(summary.labor)}</div><div>${fmt(summary.parts)}</div><div>${fmt(summary.tax)}</div><div></div></div>`;

  const items = invRows.length ? [...invRows, totalsRow] : [`<div class="empty">No paid invoices in this period.</div>`, totalsRow];

  // split into pages: first page is shorter because the summary is on it
  const chunks = [items.slice(0, FIRST_PAGE_ROWS)];
  for (let i = FIRST_PAGE_ROWS; i < items.length; i += CONT_PAGE_ROWS) {
    chunks.push(items.slice(i, i + CONT_PAGE_ROWS));
  }
  const pageCount = chunks.length;

  const tableHead = `<div class="tg th"><div>Date</div><div>Invoice</div><div>Total</div><div>Labor</div><div>Parts</div><div>Sales Tax</div><div>Paid By</div></div>`;

  const fullHeader = `
    <div class="head">
      <h1>${esc(s.name)}</h1>
      ${s.license_number ? `<div class="lic">License #<b>${esc(s.license_number)}</b></div>` : ""}
      ${s.addr || s.phone ? `<div class="addr">${esc(s.addr)}${s.addr && s.phone ? " &middot; " : ""}${esc(s.phone)}</div>` : ""}
      <div class="ttl">${title}</div>
      <div class="rng">${esc(rangeLabel)}</div>
    </div>`;

  const compactHeader = (n) => `
    <div class="head-c">
      <span class="hs">${esc(s.name)}</span>
      <span>${title} &middot; ${esc(rangeLabel)}</span>
      <span>Page <b>${n}</b> of <b>${pageCount}</b></span>
    </div>`;

  const summarySection = `
    <div class="top">
      <div class="stack">${cashDrawerBox}${cardsBox}</div>
      <div class="stack">${middle}</div>
      <div class="stack">${right}</div>
    </div>`;

  let pagesHtml = "";
  chunks.forEach((chunk, i) => {
    pagesHtml += `
  <div class="page">
    ${i === 0 ? fullHeader + summarySection : compactHeader(i + 1)}
    <div class="col">
      <div class="bh">Invoices Paid${i > 0 ? " (continued)" : ""}</div>
      ${tableHead}
      ${chunk.join("")}
    </div>
    <div class="foot"><span>Printed ${esc(printedAt)}</span><span>Page ${i + 1} of ${pageCount}</span></div>
  </div>`;
  });

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${title} ${esc(rangeLabel)}</title>
<style>
  * { box-sizing:border-box; margin:0; padding:0; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  body { font-family:Arial, Helvetica, sans-serif; color:#111; padding:0.3in; background:#f0ede4; }
  .page { background:#fff; width:8.5in; min-height:11in; margin:0 auto 0.3in; padding:0.4in 0.5in; box-shadow:0 10px 30px rgba(0,0,0,.15); font-size:11px; display:flex; flex-direction:column; gap:10px; }

  .head { text-align:center; border-bottom:2px solid #111; padding-bottom:8px; }
  .head h1 { font-size:21px; letter-spacing:.02em; }
  .head .lic { font-size:10px; color:#666; margin-top:3px; }
  .head .addr { font-size:11px; color:#333; margin-top:3px; }
  .head .ttl { font-size:14px; font-weight:700; letter-spacing:.07em; margin-top:7px; }
  .head .rng { font-size:12px; margin-top:2px; }
  .head-c { display:flex; justify-content:space-between; align-items:baseline; gap:12px; border-bottom:2px solid #111; padding-bottom:6px; font-size:10.5px; color:#333; }
  .head-c .hs { font-size:13px; font-weight:700; color:#111; }

  .top { display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; align-items:start; }
  .stack { display:flex; flex-direction:column; gap:8px; min-width:0; }

  .col { border:1px solid #000; display:flex; flex-direction:column; min-width:0; }
  .bh { background:#4a4a4a; color:#fff; text-align:center; font-weight:700; letter-spacing:.07em; padding:3px; text-transform:uppercase; font-size:10px; }
  .pad { padding:2px 0; }
  .r { display:flex; justify-content:space-between; gap:6px; padding:2px 7px; line-height:13px; }
  .r span:last-child { font-variant-numeric:tabular-nums; white-space:nowrap; }
  .r.b { font-weight:700; border-top:1px solid #000; margin-top:2px; padding-top:3px; background:#f1f1ee; }
  .r.dark { background:#4a4a4a; color:#fff; font-weight:700; margin-top:3px; }

  .chart { padding:4px 7px 5px; }
  .chart .ct { text-align:center; font-weight:700; font-size:9.5px; text-transform:uppercase; letter-spacing:.05em; margin-bottom:4px; }
  .chart .bars { display:flex; align-items:flex-end; gap:6px; height:64px; }
  .chart .bar { flex:1; background:#999; }
  .chart .bar.dark { background:#555; }
  .chart .blabels { display:flex; gap:6px; font-size:9px; color:#555; text-align:center; margin-top:2px; }
  .chart .blabels span { flex:1; }

  /* invoice list: every row is exactly 18px tall */
  .tg { display:grid; grid-template-columns:70px 64px 80px 80px 80px 72px 1fr; font-variant-numeric:tabular-nums; }
  .tg > div { padding:3px 6px; line-height:12px; height:18px; text-align:right; overflow:hidden; white-space:nowrap; }
  .tg > div:nth-child(1), .tg > div:nth-child(2), .tg > div:nth-child(7) { text-align:left; }
  .tg.th > div { background:#e6e6e2; border-bottom:1px solid #000; font-size:9px; text-transform:uppercase; font-weight:700; padding-top:4px; }
  .tg.tt > div { border-top:2px solid #000; font-weight:700; background:#f1f1ee; }
  .empty { padding:4px 8px; height:18px; line-height:12px; color:#555; font-style:italic; }

  .foot { margin-top:auto; display:flex; justify-content:space-between; font-size:9px; color:#666; border-top:1px solid #bbb; padding-top:5px; }

  @media print {
    body { margin:0; padding:0; background:#fff; }
    .page { padding:0; box-shadow:none; min-height:0; width:100%; max-width:100%; margin:0; break-after:page; page-break-after:always; }
    .page:last-of-type { break-after:auto; page-break-after:auto; }
    @page { size:letter; margin:0.3in 0.4in; }
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
      alert("Please allow pop-ups for this site to print reports.");
      return;
    }
    newWin.document.write(html);
    newWin.document.close();
  }
}
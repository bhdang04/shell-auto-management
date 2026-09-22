function esc(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function money(n) {
  return `$${Number(n || 0).toFixed(2)}`;
}

/** Opens a blank print window synchronously — call this FIRST, before any
 *  await, so the browser still treats it as a direct result of the click
 *  and doesn't block it as a popup. Pass the returned handle into
 *  printPaymentReceipt once the invoice save finishes. */
export function openReceiptWindow() {
  const win = window.open("", "_blank", "width=320,height=600");
  if (!win) {
    alert("Please allow pop-ups for this site to print receipts.");
    return null;
  }
  win.document.write("<p style='font-family:sans-serif;padding:20px;'>Preparing receipt…</p>");
  return win;
}

export function printPaymentReceipt({
  win,
  method,
  surchargeAmount,
  finalTotal,
  invoiceNum,
  invoiceDate,
  customer,
  vehicle,
  items,
  totals,
}) {
  if (!win || win.closed) {
    alert("Please allow pop-ups for this site to print receipts.");
    return;
  }

  // Comments are left off this receipt on purpose — it's meant to be a
  // short paid-in-full ticket, not the full work order. Full notes still
  // show on the main invoice print (printInvoiceReceipt).
  const itemLines = items.filter((it) => it.kind !== "comment");

  const itemsHtml = itemLines.length
    ? itemLines
        .map((it) => {
          const priceDisplay = it.price === "" || it.price === undefined ? "—" : money(it.total);
          return `<div class="row"><span>${esc(it.desc)}</span><span>${priceDisplay}</span></div>`;
        })
        .join("")
    : `<div class="row"><span>No line items</span></div>`;

  const vehicleLine = [vehicle?.year, vehicle?.make, vehicle?.model].filter(Boolean).join(" ");

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Payment Receipt</title>
      <style>
        * { box-sizing:border-box; margin:0; padding:0; }
        body { font-family:'JetBrains Mono', monospace; }
        .page.d2page { width:3.3in; min-height:auto; padding:0.25in; }
        .d2 .center { text-align:center; }
        .d2 h1 { font-size:14px; text-transform:uppercase; letter-spacing:.04em; }
        .d2 .addr { font-size:9.5px; color:#333; margin-top:3px; line-height:1.5; }
        .d2 .dash { border-top:1px dashed #999; margin:10px 0; }
        .d2 .row { display:flex; justify-content:space-between; font-size:10.5px; margin-bottom:3px; }
        .d2 .cust { font-size:10.5px; margin:8px 0; line-height:1.6; }
        .d2 .cust b { display:block; font-size:11.5px; }
        .d2 .totrow { display:flex; justify-content:space-between; font-size:10.5px; margin:2px 0; }
        .d2 .totrow.due { font-weight:700; font-size:13px; border-top:1px dashed #999; margin-top:6px; padding-top:6px; }
        .d2 .thanks { text-align:center; font-size:10px; margin-top:14px; }
      </style>
    </head>
    <body>

      <div class="page d2page d2" id="page-d2">
        <div class="center">
          <h1>Shell Complete Auto</h1>
          <div class="addr">482 Auto Plaza Dr<br>San Jose, CA 95112<br>(408) 555-0142</div>
        </div>

        <div class="dash"></div>
        <div class="row"><span>INVOICE</span><span>${invoiceNum ? "#" + invoiceNum : "NEW"}</span></div>
        <div class="row"><span>DATE</span><span>${esc(invoiceDate)}</span></div>

        <div class="dash"></div>

        <div class="cust">
          <b>${esc(customer?.name || "")}</b>
          ${esc(customer?.phone1 || "")}<br>
          ${esc(vehicleLine)}<br>
          ${vehicle?.plate ? `Plate ${esc(vehicle.plate)}` : ""}
        </div>

        <div class="dash"></div>

        ${itemsHtml}

        <div class="dash"></div>

        <div class="totrow"><span>Labor</span><span>${money(totals?.labor)}</span></div>
        <div class="totrow"><span>Parts</span><span>${money(totals?.parts)}</span></div>
        <div class="totrow"><span>Tax</span><span>${money(totals?.tax)}</span></div>
        ${
          surchargeAmount > 0
            ? `<div class="totrow"><span>Surcharge</span><span>${money(surchargeAmount)}</span></div>`
            : ""
        }
        <div class="totrow"><span>Method</span><span>${esc(method)}</span></div>
        <div class="totrow due"><span>PAID</span><span>${money(finalTotal)}</span></div>

        <div class="thanks">
          *** THANK YOU ***<br>
          Come back soon!
        </div>
      </div>

      <script>window.onload = () => window.print();</script>
    </body>
    </html>
  `;

  win.document.open();
  win.document.write(html);
  win.document.close();
}
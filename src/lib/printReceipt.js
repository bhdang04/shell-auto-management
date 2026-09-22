import { itemRow, money, esc } from "./printInvoice";

/** Opens a blank print window synchronously — call this FIRST, before any
 *  await, so the browser still treats it as a direct result of the click
 *  and doesn't block it as a popup. Pass the returned handle into
 *  writePaymentReceipt once the invoice save finishes. */
export function openReceiptWindow() {
  const win = window.open("", "_blank", "width=400,height=600");
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
  const date = new Date().toLocaleDateString();

  const itemLines = items.filter((it) => it.kind !== "comment");
  const commentLines = items.filter((it) => it.kind === "comment");

  const itemsHtml = itemLines.length
    ? itemLines.map(itemRow).join("")
    : `<tr><td colspan="5" style="color:#888; font-style:italic;">No line items</td></tr>`;

  const notesHtml = commentLines.length
    ? commentLines.map((c) => `${esc(c.desc)}`).join("<br>")
    : "";

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Payment Receipt</title>
      <style>
        .page.d2page { width:3.3in; min-height:auto; padding:0.25in; font-family:'JetBrains Mono', monospace; }
        .d2 .center { text-align:center; }
        .d2 h1 { font-size:14px; text-transform:uppercase; letter-spacing:.04em; }
        .d2 .addr { font-size:6.5px; color:#333; margin-top:3px; line-height:1.5; }
        .d2 .dash { border-top:1px dashed #999; margin:10px 0; }
        .d2 .row { display:flex; justify-content:space-between; font-size:10px; margin-bottom:2px; }
        .d2 .cust { font-size:10.5px; margin:8px 0; line-height:1.6; }
        .d2 .cust b { display:block; font-size:11.5px; }
        .d2 .item { margin-bottom:6px; }
        .d2 .item .top { display:flex; justify-content:space-between; font-size:10.5px; }
        .d2 .item .sub { font-size:9px; color:#555; }
        .d2 .comment-row { font-size:9px; padding:2px 0; }
        .d2 .totrow { display:flex; justify-content:space-between; font-size:10.5px; margin:2px 0; }
        .d2 .totrow.due { font-weight:700; font-size:13px; border-top:1px dashed #999; margin-top:6px; padding-top:6px; }
        .d2 .thanks { text-align:center; font-size:10px; margin-top:14px; }
      </style>
    </head>
    <body>

      <div class="page d2page d2" id="page-d2">
        <div class="center">
        <h1>Shell Complete Auto Service</h1>
        <div class="addr">482 Auto Plaza Dr<br>San Jose, CA 95112<br>(408) 555-0142</div>
    </div>

      <div class="dash"></div>
      <div class="row"><span>INVOICE</span><span>${invoiceNum ? "#" + invoiceNum : "NEW"}</span></div>
      <div class="row"><span>DATE</span><span>${date}</span></div>

      <div class="dash"></div>

      <div class="row"><span>Method</span><span>${method}</span></div>
      <div class="row"><span>Surcharge</span><span>$${surchargeAmount.toFixed(2)}</span></div>
      <div class="row"><span>Paid</span><span>$${finalTotal.toFixed(2)}</span></div>

      <div class="dash"></div>

      <div class="thanks">
        *** THANK YOU ***<br>
        Come back soon!
      </div>

      <script>window.onload = () => window.print();</script>
    </body>
    </html>
  `;

  win.document.open();
  win.document.write(html);
  win.document.close();
}

// ⚠ Make this import match the one at the top of YOUR current reports.js
// (I couldn't see your first line, so this path is a guess).
import { supabase } from "../lib/supabaseClient";

/** Supabase returns at most 1000 rows per request — this keeps asking for the
 *  next page until everything has come back. makeQuery must be ordered. */
async function fetchAll(makeQuery) {
  const PAGE = 1000;
  let all = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await makeQuery().range(from, from + PAGE - 1);
    if (error) throw error;
    all = all.concat(data || []);
    if (!data || data.length < PAGE) break;
  }
  return all;
}

/** Paid invoices whose PAYMENT date (paid_at) falls in the range. */
export async function getPaidInvoicesInRange(startDate, endDate) {
  return fetchAll(() =>
    supabase
      .from("invoices")
      .select(
        `
      id, num, date, created_at, paid_at, status, labor_total, parts_total, tax,
      payment_method, payment_surcharge,
      vehicles ( customer_id, year, make, model, customers ( name ) )
    `
      )
      .eq("status", "Paid")
      .gte("paid_at", startDate.toISOString())
      .lt("paid_at", endDate.toISOString())
      .order("paid_at", { ascending: false })
      .order("id", { ascending: false })
  );
}

/** "cash" | "check" | "card". Anything that isn't Cash or Check (Visa,
 *  Mastercard, American Express, Discover, ATM, Debit Card, …) counts as a card. */
export function paymentKind(method) {
  const m = String(method || "").trim().toLowerCase();
  if (m === "cash") return "cash";
  if (m.startsWith("check")) return "check";
  return "card";
}

export function summarizeInvoices(invoices) {
  const summary = {
    count: invoices.length,
    labor: 0,
    parts: 0,
    tax: 0,
    surcharge: 0,
    total: 0,
    byMethod: {}, // { "Cash": 123.45, "Visa": 67.89, ... }
    // --- added for the printed report ---
    cashTotal: 0,
    checkTotal: 0,
    checkCount: 0,
    cardTotal: 0,
    cardCount: 0,
    cardByMethod: {}, // only the card-type methods
  };

  for (const inv of invoices) {
    const labor = Number(inv.labor_total) || 0;
    const parts = Number(inv.parts_total) || 0;
    const tax = Number(inv.tax) || 0;
    const surcharge = Number(inv.payment_surcharge) || 0;
    const total = labor + parts + tax + surcharge;

    summary.labor += labor;
    summary.parts += parts;
    summary.tax += tax;
    summary.surcharge += surcharge;
    summary.total += total;

    const method = inv.payment_method || "Unknown";
    summary.byMethod[method] = (summary.byMethod[method] || 0) + total;

    const kind = paymentKind(inv.payment_method);
    if (kind === "cash") {
      summary.cashTotal += total;
    } else if (kind === "check") {
      summary.checkTotal += total;
      summary.checkCount += 1;
    } else {
      summary.cardTotal += total;
      summary.cardCount += 1;
      summary.cardByMethod[method] = (summary.cardByMethod[method] || 0) + total;
    }
  }

  summary.avgTicket = summary.count ? summary.total / summary.count : 0;
  // Net sales = parts + labor (no tax, no surcharge). The old InvoMax report
  // averaged this, so the printed report's "Avg Ticket" uses it.
  summary.net = summary.parts + summary.labor;
  summary.avgNetTicket = summary.count ? summary.net / summary.count : 0;
  summary.partsToLaborPct = summary.labor > 0 ? Math.round((summary.parts / summary.labor) * 100) : null;
  return summary;
}

// ---------------------------------------------------------------------------
// Extra numbers used only by the printed report
// ---------------------------------------------------------------------------

const value = (i) => (Number(i.labor_total) || 0) + (Number(i.parts_total) || 0) + (Number(i.tax) || 0);

/** Every invoice that isn't Paid or Voided (still open / uncollected). */
async function getOpenInvoices() {
  return fetchAll(() =>
    supabase
      .from("invoices")
      .select("id, created_at, labor_total, parts_total, tax")
      .not("status", "in", "(Paid,Voided)")
      .order("id", { ascending: true })
  );
}

/** Customer ids (from the given paid invoices) who had an invoice BEFORE the
 *  report period started. */
async function getReturningCustomerIds(invoices, beforeDate) {
  const ids = [...new Set(invoices.map((i) => i.vehicles?.customer_id).filter(Boolean))];
  const returning = new Set();

  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    const rows = await fetchAll(() =>
      supabase
        .from("invoices")
        .select("id, vehicles!inner ( customer_id )")
        .in("vehicles.customer_id", chunk)
        .lt("created_at", beforeDate.toISOString())
        .neq("status", "Voided")
        .order("id", { ascending: true })
    );
    for (const r of rows) {
      const cid = r.vehicles?.customer_id;
      if (cid) returning.add(cid);
    }
  }
  return returning;
}

/** Net sales (parts + labor) for the 6 calendar months ending with the
 *  month that contains `start`. Returns [{ label: "Mar", net: 1234.5 }, …]. */
async function getMonthlySales(start) {
  const first = new Date(start.getFullYear(), start.getMonth() - 5, 1);
  const last = new Date(start.getFullYear(), start.getMonth() + 1, 1);

  const rows = await fetchAll(() =>
    supabase
      .from("invoices")
      .select("id, paid_at, labor_total, parts_total")
      .eq("status", "Paid")
      .gte("paid_at", first.toISOString())
      .lt("paid_at", last.toISOString())
      .order("id", { ascending: true })
  );

  const months = [];
  for (let k = 0; k < 6; k++) {
    const d = new Date(first.getFullYear(), first.getMonth() + k, 1);
    months.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: d.toLocaleDateString("en-US", { month: "short" }),
      net: 0,
    });
  }
  for (const r of rows) {
    const d = new Date(r.paid_at);
    const m = months.find((x) => x.key === `${d.getFullYear()}-${d.getMonth()}`);
    if (m) m.net += (Number(r.labor_total) || 0) + (Number(r.parts_total) || 0);
  }
  return months.map(({ label, net }) => ({ label, net }));
}

/**
 * Everything the printed report needs beyond the paid-invoice list itself.
 *  - uncollected / uncollected30 are measured as of TODAY (open invoices now),
 *    not as of the report date.
 *  - openWeek: open invoices created in the Mon–Sun week containing `start`.
 *  - openPeriod: open invoices created inside the report period.
 *  - returnPct: % of the period's paid invoices that belong to a customer who
 *    had an earlier invoice before the period started (null if none paid).
 */
export async function getReportExtras(start, end, invoices) {
  const [open, returning, monthly] = await Promise.all([
    getOpenInvoices(),
    getReturningCustomerIds(invoices, start),
    getMonthlySales(start),
  ]);

  const weekStart = new Date(start.getFullYear(), start.getMonth(), start.getDate() - ((start.getDay() + 6) % 7));
  const weekEnd = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 7);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);

  let uncollected = 0;
  let uncollected30 = 0;
  let openWeek = 0;
  let openPeriod = 0;
  for (const inv of open) {
    const v = value(inv);
    const created = new Date(inv.created_at);
    uncollected += v;
    if (created < thirtyDaysAgo) uncollected30 += v;
    if (created >= weekStart && created < weekEnd) openWeek += v;
    if (created >= start && created < end) openPeriod += v;
  }

  const returningCount = invoices.filter((i) => returning.has(i.vehicles?.customer_id)).length;
  const returnPct = invoices.length ? Math.round((returningCount / invoices.length) * 100) : null;

  return { uncollected, uncollected30, openWeek, openPeriod, returnPct, monthly };
}
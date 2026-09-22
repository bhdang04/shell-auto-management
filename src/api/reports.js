import { supabase } from "../lib/supabaseClient";

/**
 * Fetches every PAID invoice whose created_at falls within [startDate, endDate).
 * Revenue reporting only makes sense for invoices that have actually been
 * paid — payment_method/payment_surcharge are null on anything still open,
 * so those are excluded rather than counted as $0 collected.
 *
 * startDate/endDate: JS Date objects (local time is fine — converted to
 * ISO/UTC for the query). endDate is exclusive.
 */
export async function getPaidInvoicesInRange(startDate, endDate) {
  const { data, error } = await supabase
    .from("invoices")
    .select(
      `
      id, num, date, created_at, status, labor_total, parts_total, tax,
      payment_method, payment_surcharge,
      vehicles ( year, make, model, customers ( name ) )
    `
    )
    .eq("status", "Paid")
    .gte("created_at", startDate.toISOString())
    .lt("created_at", endDate.toISOString())
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

/** Aggregates a list of paid invoices (from getPaidInvoicesInRange) into
 *  the summary numbers the Reports popup displays. */
export function summarizeInvoices(invoices) {
  const summary = {
    count: invoices.length,
    labor: 0,
    parts: 0,
    tax: 0,
    surcharge: 0,
    total: 0,
    byMethod: {}, // { "Cash": 123.45, "Visa": 67.89, ... }
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
  }

  summary.avgTicket = summary.count ? summary.total / summary.count : 0;
  return summary;
}
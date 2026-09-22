import { supabase } from "../lib/supabaseClient";

export async function createInvoice({ vehicleId, status = "In Bay" }) {
  // `num` is auto-assigned by the invoice_num_seq default — no need to pass it.
  const { data, error } = await supabase
    .from("invoices")
    .insert({ vehicle_id: vehicleId, status })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function addLineItem(invoiceId, { tag, description = "", sub = "", qty = 1, price = 0 }) {
  const { data, error } = await supabase
    .from("line_items")
    .insert({ invoice_id: invoiceId, tag, description, sub, qty, price })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateLineItem(itemId, fields) {
  const { data, error } = await supabase.from("line_items").update(fields).eq("id", itemId).select().single();
  if (error) throw error;
  return data;
}

export async function deleteLineItem(itemId) {
  const { error } = await supabase.from("line_items").delete().eq("id", itemId);
  if (error) throw error;
}

/** Call after any line-item add/edit/delete to keep the invoice's stored totals in sync. */
export async function saveInvoiceTotals(invoiceId, { laborTotal, partsTotal, tax }) {
  const { error } = await supabase
    .from("invoices")
    .update({ labor_total: laborTotal, parts_total: partsTotal, tax })
    .eq("id", invoiceId);
  if (error) throw error;
}

export async function updateInvoiceStatus(invoiceId, status) {
  const { error } = await supabase.from("invoices").update({ status }).eq("id", invoiceId);
  if (error) throw error;
}

/**
 * Saves a full ticket to Supabase: creates the invoice if invoiceId is null,
 * otherwise updates it, then replaces ALL of its line items with whatever's
 * currently in `items` (delete-all-then-insert — simplest correct approach,
 * no diffing needed since a ticket's line count is always small).
 *
 * items: array of { kind, tag, code, desc, sub, qty, price, total }
 * paymentMethod / paymentSurcharge: optional — only set when this save is
 * coming from Take Payment. Omitted (undefined) on ordinary saves, which
 * leaves the existing stored value untouched rather than wiping it out.
 * Returns the saved invoice row (with its real `num`).
 */
export async function saveInvoice({
  invoiceId,
  vehicleId,
  status,
  items,
  laborTotal,
  partsTotal,
  tax,
  paymentMethod,
  paymentSurcharge,
}) {
  const invoiceFields = { status, labor_total: laborTotal, parts_total: partsTotal, tax };
  if (paymentMethod !== undefined) invoiceFields.payment_method = paymentMethod;
  if (paymentSurcharge !== undefined) invoiceFields.payment_surcharge = paymentSurcharge;

  let invoice;
  if (invoiceId) {
    const { data, error } = await supabase
      .from("invoices")
      .update(invoiceFields)
      .eq("id", invoiceId)
      .select()
      .single();
    if (error) throw error;
    invoice = data;
  } else {
    const { data, error } = await supabase
      .from("invoices")
      .insert({ vehicle_id: vehicleId, ...invoiceFields })
      .select()
      .single();
    if (error) throw error;
    invoice = data;
  }

  const { error: deleteError } = await supabase.from("line_items").delete().eq("invoice_id", invoice.id);
  if (deleteError) throw deleteError;

  if (items.length > 0) {
    const rows = items.map((it, i) => ({
      invoice_id: invoice.id,
      kind: it.kind || "item",
      tag: it.kind === "comment" ? null : it.tag,
      code: it.kind === "comment" ? "" : it.code || "",
      description: it.desc || "",
      sub: it.sub || "",
      qty: it.qty === "" || it.qty === undefined ? null : parseFloat(it.qty),
      price: it.price === "" || it.price === undefined ? null : parseFloat(it.price),
      sort_order: i,
    }));
    const { error: insertError } = await supabase.from("line_items").insert(rows);
    if (insertError) throw insertError;
  }

  return invoice;
}
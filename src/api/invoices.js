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
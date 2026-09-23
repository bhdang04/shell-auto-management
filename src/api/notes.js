import { supabase } from "../lib/supabaseClient";

/** Returns the note for an invoice, or null if none exists yet. */
export async function getInvoiceNote(invoiceId) {
  if (!invoiceId) return null;
  const { data, error } = await supabase
    .from("invoice_notes")
    .select("invoice_id, body, updated_at")
    .eq("invoice_id", invoiceId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Creates or updates the note for an invoice. An empty/whitespace-only
 *  body deletes the row instead of storing a blank note — keeps "no note"
 *  and "empty note" from being two different states to handle everywhere
 *  else in the app. */
export async function saveInvoiceNote(invoiceId, body) {
  if (!invoiceId) throw new Error("Can't save a note without a saved invoice.");
  const trimmed = body.trim();

  if (!trimmed) {
    const { error } = await supabase.from("invoice_notes").delete().eq("invoice_id", invoiceId);
    if (error) throw error;
    return null;
  }

  const { data, error } = await supabase
    .from("invoice_notes")
    .upsert({ invoice_id: invoiceId, body: trimmed, updated_at: new Date().toISOString() })
    .select()
    .single();
  if (error) throw error;
  return data;
}
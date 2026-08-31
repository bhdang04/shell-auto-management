import { supabase } from "../lib/supabaseClient";

/**
 * Live search as you type in the Name field.
 * Returns up to 10 matching customers with their first vehicle attached,
 * shaped for the CustomerSearch dropdown.
 */
export async function searchCustomers(query) {
  if (!query.trim()) return [];
  const { data, error } = await supabase
    .from("customers")
    .select("id, name, phone1, phone2, addr, cityzip, vehicles(id, label, specs, plate, vin, odo)")
    .ilike("name", `%${query}%`)
    .limit(10);
  if (error) throw error;
  return data;
}

/**
 * Full record for a selected customer: their info, vehicles, and every
 * invoice + line item on file. This is what populates CustomerForm,
 * VehicleForm, VehicleHistory, and LineItems all at once.
 */
export async function getCustomerWithHistory(customerId) {
  const { data, error } = await supabase
    .from("customers")
    .select(
      `
      id, name, addr, cityzip, phone1, phone2,
      vehicles (
        id, label, specs, plate, vin, odo,
        invoices (
          id, num, date, status, labor_total, parts_total, tax,
          line_items ( id, tag, description, sub, qty, price, total )
        )
      )
    `
    )
    .eq("id", customerId)
    .single();
  if (error) throw error;
  return data;
}

/** "Today's board" in the sidebar: customers with at least one open invoice. */
export async function getOpenBoard() {
  const { data, error } = await supabase
    .from("invoices")
    .select(
      `
      id, num, status, labor_total, parts_total, tax,
      vehicles ( id, label, customer_id, customers ( id, name ) )
    `
    )
    .neq("status", "Paid")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function createCustomer({ name, addr = "", cityzip = "", phone1 = "", phone2 = "" }) {
  const { data, error } = await supabase
    .from("customers")
    .insert({ name, addr, cityzip, phone1, phone2 })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCustomer(id, fields) {
  const { data, error } = await supabase.from("customers").update(fields).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function upsertVehicle(vehicleId, customerId, fields) {
  if (vehicleId) {
    const { data, error } = await supabase.from("vehicles").update(fields).eq("id", vehicleId).select().single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabase
    .from("vehicles")
    .insert({ ...fields, customer_id: customerId })
    .select()
    .single();
  if (error) throw error;
  return data;
}
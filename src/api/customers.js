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
    .select("id, name, first_name, last_name, phone1, phone2, addr, cityzip, vehicles(id, year, make, model, engine_specs, plate, vin, odo)")
    .ilike("name", `%${query}%`)
    .limit(10);
  if (error) throw error;
  return data;
}

/** Every customer on file, for the "Customers" catalog browser. */
export async function getAllCustomers() {
  const { data, error } = await supabase
    .from("customers")
    .select("id, name, first_name, last_name, phone1, cityzip, vehicles(id)")
    .order("name", { ascending: true });
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
      id, name, first_name, last_name, addr, cityzip, phone1, phone2,
      vehicles (
        id, year, make, model, engine_specs, plate, vin, odo,
        invoices (
          id, num, date, status, labor_total, parts_total, tax,
          payment_method, payment_surcharge,
          line_items ( id, kind, tag, code, description, sub, qty, price, total )
        )
      )
    `
    )
    .eq("id", customerId)
    .single();
  if (error) throw error;
  return data;
}

/** "Open Invoices" panel: every invoice not yet closed out, shop-wide. */
export async function getOpenBoard() {
  const { data, error } = await supabase
    .from("invoices")
    .select(
      `
      id, num, date, status, labor_total, parts_total, tax,
      vehicles ( id, year, make, model, customer_id, customers ( id, name ), appointments ( date ) )
    `
    )
    .not("status", "in", '("Paid","Voided")')
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function createCustomer({ first_name = "", last_name = "", addr = "", cityzip = "", phone1 = "", phone2 = "" }) {
  const { data, error } = await supabase
    .from("customers")
    .insert({ first_name, last_name, addr, cityzip, phone1, phone2 })
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

/** Powers TopBar's jump search — invoice #, license plate, or VIN.
 *  Returns { customer, vehicleId, invoiceId } so the caller can select the
 *  specific matched vehicle/invoice even if the customer has more than one
 *  vehicle on file. invoiceId is only set when the match came from an
 *  invoice number. */
export async function findCustomerByLookup(query) {
  let q = query.trim();
  if (!q) return null;
  if (q.startsWith("#")) q = q.slice(1).trim();

  const { data: invoiceMatch } = await supabase
    .from("invoices")
    .select("id, vehicle_id")
    .eq("num", q)
    .maybeSingle();

  let vehicleId = invoiceMatch?.vehicle_id || null;
  const invoiceId = invoiceMatch?.id || null;

  if (!vehicleId) {
    const { data: vehicleMatch } = await supabase
      .from("vehicles")
      .select("id")
      .or(`plate.ilike.%${q}%,vin.ilike.%${q}%`)
      .limit(1)
      .maybeSingle();
    vehicleId = vehicleMatch?.id || null;
  }

  if (!vehicleId) return null;

  const { data: vehicleRow } = await supabase.from("vehicles").select("customer_id").eq("id", vehicleId).single();
  if (!vehicleRow) return null;

  const customer = await getCustomerWithHistory(vehicleRow.customer_id);
  return { customer, vehicleId, invoiceId };
}
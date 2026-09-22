import { supabase } from "../lib/supabaseClient";

export async function createAppointment({ vehicleId, customerId, date, note = "" }) {
  const { data, error } = await supabase
    .from("appointments")
    .insert({ vehicle_id: vehicleId, customer_id: customerId, date, note })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getUpcomingAppointments(vehicleId) {
  const { data, error } = await supabase
    .from("appointments")
    .select("*")
    .eq("vehicle_id", vehicleId)
    .gte("date", new Date().toISOString().slice(0, 10))
    .order("date", { ascending: true });
  if (error) throw error;
  return data;
}

/** Every appointment scheduled for today, with vehicle + customer info
 *  attached — used to build the "Expected Today" section of the shop
 *  board. There's no "checked in" flag on this table, so the caller is
 *  responsible for cross-referencing against open invoices to figure out
 *  which of these have already been turned into a repair order. */
export async function getTodaysAppointments() {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("appointments")
    .select(
      `
      id, vehicle_id, customer_id, date, note,
      vehicles ( id, year, make, model, customers ( id, name ) )
    `
    )
    .eq("date", today)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}
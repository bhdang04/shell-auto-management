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
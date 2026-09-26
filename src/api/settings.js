import { supabase } from "../lib/supabaseClient";

export async function getShopSettings() {
  const { data, error } = await supabase.from("shop_settings").select("*").eq("id", 1).single();
  if (error) throw error;
  return data;
}

export async function updateShopSettings(fields) {
  const { data, error } = await supabase.from("shop_settings").update(fields).eq("id", 1).select().single();
  if (error) throw error;
  return data;
}
import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

/**
 * useCatalog(type)
 * type: "part" | "labor"
 *
 * Loads that slice of the shared `catalog` table, exposes search filtering,
 * and read/write helpers so a popup can add/edit/delete entries directly.
 */
export function useCatalog(type) {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Postgres numeric columns come back as strings over PostgREST — coerce
  // once, here, so every consumer downstream can just do math on price.
  function normalize(row) {
    return { ...row, price: Number(row.price) };
  }

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("catalog")
      .select("*")
      .eq("type", type)
      .order("code", { ascending: true });

    if (error) {
      setError(error);
    } else {
      setItems(data.map(normalize));
      setError(null);
    }
    setLoading(false);
  }, [type]);

  useEffect(() => {
    load();
  }, [load]);

  async function addItem({ code, description, price }) {
    const { data, error } = await supabase
      .from("catalog")
      .insert({
        type,
        code: code.trim(),
        description,
        price: parseFloat(price) || 0,
      })
      .select()
      .single();
    if (!error) setItems((prev) => [...prev, normalize(data)]);
    return { data, error };
  }

  async function updateItem(id, fields) {
    const { data, error } = await supabase.from("catalog").update(fields).eq("id", id).select().single();
    if (!error) setItems((prev) => prev.map((it) => (it.id === id ? normalize(data) : it)));
    return { data, error };
  }

  async function deleteItem(id) {
    const { error } = await supabase.from("catalog").delete().eq("id", id);
    if (!error) setItems((prev) => prev.filter((it) => it.id !== id));
    return { error };
  }

  const filtered = items.filter((item) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    const code = item.code || "";
    const description = item.description || "";
    return code.toLowerCase().includes(term) || description.toLowerCase().includes(term);
  });

  return {
    items,
    filtered,
    search,
    setSearch,
    loading,
    error,
    refresh: load,
    addItem,
    updateItem,
    deleteItem,
  };
}
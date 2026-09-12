import { useEffect, useState } from "react";
import { supabase } from "../supabase";

export function useCatalog(type) {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      let query = supabase
        .from("catalog")
        .select("*")
        .eq("type", type);

      const { data, error } = await query;

      if (!error) setItems(data);
    }

    load();
  }, [type]);

  const filtered = items.filter(item => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      item.code.toLowerCase().includes(term) ||
      item.description.toLowerCase().includes(term)
    );
  });

  return { filtered, search, setSearch };
}
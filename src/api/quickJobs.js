import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export const CATEGORIES = [
  "Kit Jobs",
  "Transmission",
  "Oil Changes",
  "Tune Ups",
  "A/C",
  "Brakes",
  "Cooling",
  "Analysis & Inspections",
  "Additional Service",
];

const VALID_KINDS = ["item", "comment"];

function assertValidKind(kind) {
  if (!VALID_KINDS.includes(kind)) {
    throw new Error(`Invalid line kind "${kind}" — must be "item" or "comment".`);
  }
}

// --- Consuming side (ticket flow) — unchanged from before ---

export function useQuickJobs(category) {
  const [jobs, setJobs] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadJobs() {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("quick_jobs")
        .select("*")
        .eq("category", category)
        .order("name", { ascending: true });

      if (error) {
        console.error("Error fetching quick jobs:", error);
        setError(error);
        setJobs([]);
      } else {
        setJobs(data || []);
      }

      setLoading(false);
    }

    if (category) {
      loadJobs();
    }
  }, [category]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return jobs;
    return jobs.filter((job) => job.name.toLowerCase().includes(query));
  }, [jobs, search]);

  return { filtered, search, setSearch, loading, error };
}

export async function getQuickJobLines(jobId) {
  const { data, error } = await supabase
    .from("quick_job_lines")
    .select(`id, quick_job_id, sort_order, kind, tag, code, description, qty, price`)
    .eq("quick_job_id", jobId)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Error fetching quick job lines:", error);
    throw error;
  }

  return data || [];
}

// --- Admin side (new) ---

/** Every quick job across all categories, for the admin list. */
export async function getAllQuickJobs() {
  const { data, error } = await supabase
    .from("quick_jobs")
    .select("*")
    .order("category", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function createQuickJob({ category, code = "", name }) {
  const { data, error } = await supabase
    .from("quick_jobs")
    .insert({ category, code, name })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateQuickJob(id, fields) {
  const { data, error } = await supabase.from("quick_jobs").update(fields).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

/** Deletes a quick job and all its lines. Lines are deleted explicitly
 *  first rather than relying on a DB cascade being configured. */
export async function deleteQuickJob(id) {
  const { error: linesError } = await supabase.from("quick_job_lines").delete().eq("quick_job_id", id);
  if (linesError) throw linesError;
  const { error } = await supabase.from("quick_jobs").delete().eq("id", id);
  if (error) throw error;
}

export async function createQuickJobLine({ quickJobId, sortOrder, kind, tag, code, description, qty, price }) {
  assertValidKind(kind);
  const { data, error } = await supabase
    .from("quick_job_lines")
    .insert({
      quick_job_id: quickJobId,
      sort_order: sortOrder,
      kind,
      tag: kind === "comment" ? null : tag,
      code: kind === "comment" ? "" : code || "",
      description,
      qty: qty === "" || qty === undefined ? null : qty,
      price: price === "" || price === undefined ? null : price,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateQuickJobLine(id, fields) {
  if (fields.kind) assertValidKind(fields.kind);
  const { data, error } = await supabase.from("quick_job_lines").update(fields).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteQuickJobLine(id) {
  const { error } = await supabase.from("quick_job_lines").delete().eq("id", id);
  if (error) throw error;
}

/** lines: [{ id, sort_order }, ...] — used after a manual up/down move. */
export async function reorderQuickJobLines(lines) {
  const updates = lines.map((l) =>
    supabase.from("quick_job_lines").update({ sort_order: l.sort_order }).eq("id", l.id)
  );
  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  if (failed) throw failed.error;
}
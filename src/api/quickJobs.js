import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

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

    return jobs.filter((job) =>
      job.name.toLowerCase().includes(query)
    );
  }, [jobs, search]);

  return {
    filtered,
    search,
    setSearch,
    loading,
    error,
  };
}

export async function getQuickJobLines(jobId) {
  // We'll fill this in based on your actual quick-job line table.
}
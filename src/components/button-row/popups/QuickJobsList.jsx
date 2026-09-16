import { useQuickJobs, getQuickJobLines } from "../../../api/quickJobs";

/**
 * QuickJobPicker
 * Props:
 *  - category: which category's jobs to list
 *  - onPick(lines): fired with the job's full line-item template once
 *    fetched — the parent expands these into real ticket lines
 */
export default function QuickJobPicker({ category, onPick }) {
  const { filtered, search, setSearch, loading, error } = useQuickJobs(category);

  async function handlePick(job) {
    try {
      const lines = await getQuickJobLines(job.id);
      onPick(lines);
    } catch (err) {
      console.error("Failed to load job lines:", err);
    }
  }

  return (
    <>
      <div className="lookup-toolbar">
        <input
          className="lookup-search-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search jobs..."
        />
      </div>
      <div className="lookup-list">
        {error && <div className="lookup-empty">Couldn't load jobs — check your Supabase connection.</div>}
        {loading && <div className="lookup-empty">Loading...</div>}
        {!loading && !error && filtered.length === 0 && (
          <div className="lookup-empty">No jobs in this category yet.</div>
        )}
        {filtered.map((job) => (
          <div className="lookup-item job-item" key={job.id} onClick={() => handlePick(job)}>
            <div className="li-top">
              <span className="desc">{job.name}</span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
import { useEffect, useState } from "react";
import Popup from "../Modal";
import {
  CATEGORIES,
  getAllQuickJobs,
  createQuickJob,
  updateQuickJob,
  deleteQuickJob,
  getQuickJobLines,
  createQuickJobLine,
  updateQuickJobLine,
  deleteQuickJobLine,
  reorderQuickJobLines,
} from "../../../api/quickJobs";
import { useCatalog } from "../../../api/catalog";

function money(n) {
  return n === "" || n === null || n === undefined ? "" : "$" + Number(n).toFixed(2);
}

const emptyJobForm = { category: CATEGORIES[0], code: "", name: "" };

export default function QuickJobsAdminPopup({ isOpen, onClose }) {
  const [jobs, setJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [jobsError, setJobsError] = useState(null);

  const [selectedJobId, setSelectedJobId] = useState(null);
  const [creatingJob, setCreatingJob] = useState(false);
  const [jobForm, setJobForm] = useState(emptyJobForm);
  const [savingJob, setSavingJob] = useState(false);

  const [lines, setLines] = useState([]);
  const [linesLoading, setLinesLoading] = useState(false);

  const [addMode, setAddMode] = useState(null); // null | "item" | "comment"
  const [itemType, setItemType] = useState("part"); // "part" | "labor" — for the catalog picker
  const [commentText, setCommentText] = useState("");
  const [editingLineId, setEditingLineId] = useState(null);
  const [editLineForm, setEditLineForm] = useState({ description: "", qty: "", price: "" });

  const {
    filtered: catalogItems,
    search: catalogSearch,
    setSearch: setCatalogSearch,
    loading: catalogLoading,
  } = useCatalog(itemType);

  const selectedJob = jobs.find((j) => j.id === selectedJobId) || null;

  async function refreshJobs() {
    setJobsLoading(true);
    setJobsError(null);
    try {
      const data = await getAllQuickJobs();
      setJobs(data);
    } catch (err) {
      console.error("Failed to load quick jobs:", err);
      setJobsError(err);
    } finally {
      setJobsLoading(false);
    }
  }

  useEffect(() => {
    if (isOpen) refreshJobs();
  }, [isOpen]);

  async function refreshLines(jobId) {
    if (!jobId) {
      setLines([]);
      return;
    }
    setLinesLoading(true);
    try {
      const data = await getQuickJobLines(jobId);
      setLines(data);
    } catch (err) {
      console.error("Failed to load job lines:", err);
    } finally {
      setLinesLoading(false);
    }
  }

  useEffect(() => {
    refreshLines(selectedJobId);
    setAddMode(null);
    setEditingLineId(null);
  }, [selectedJobId]);

  function handleSelectJob(job) {
    setCreatingJob(false);
    setSelectedJobId(job.id);
    setJobForm({ category: job.category, code: job.code || "", name: job.name });
  }

  function handleNewJob() {
    setSelectedJobId(null);
    setCreatingJob(true);
    setJobForm(emptyJobForm);
  }

  async function handleSaveJob() {
    if (!jobForm.name.trim()) return;
    setSavingJob(true);
    try {
      if (creatingJob) {
        const created = await createQuickJob({
          category: jobForm.category,
          code: jobForm.code.trim(),
          name: jobForm.name.trim(),
        });
        await refreshJobs();
        setCreatingJob(false);
        setSelectedJobId(created.id);
      } else if (selectedJobId) {
        await updateQuickJob(selectedJobId, {
          category: jobForm.category,
          code: jobForm.code.trim(),
          name: jobForm.name.trim(),
        });
        await refreshJobs();
      }
    } catch (err) {
      console.error("Failed to save quick job:", err);
      alert("Failed to save — see console for details.");
    } finally {
      setSavingJob(false);
    }
  }

  async function handleDeleteJob(job, e) {
    e.stopPropagation();
    if (!window.confirm(`Delete "${job.name}" and all its line items? This can't be undone.`)) return;
    try {
      await deleteQuickJob(job.id);
      if (selectedJobId === job.id) {
        setSelectedJobId(null);
        setLines([]);
      }
      await refreshJobs();
    } catch (err) {
      console.error("Failed to delete quick job:", err);
      alert("Failed to delete — see console for details.");
    }
  }

  async function handleAddItemLine(catalogItem) {
    if (!selectedJobId) return;
    const nextSort = lines.length ? Math.max(...lines.map((l) => l.sort_order || 0)) + 1 : 0;
    try {
      const created = await createQuickJobLine({
        quickJobId: selectedJobId,
        sortOrder: nextSort,
        kind: "item",
        tag: itemType === "labor" ? "LABOR" : "PART",
        code: catalogItem.code,
        description: catalogItem.description,
        qty: 1,
        price: catalogItem.price,
      });
      setLines((prev) => [...prev, created]);
    } catch (err) {
      console.error("Failed to add line:", err);
      alert(err.message || "Failed to add line.");
    }
  }

  async function handleAddCommentLine() {
    if (!selectedJobId || !commentText.trim()) return;
    const nextSort = lines.length ? Math.max(...lines.map((l) => l.sort_order || 0)) + 1 : 0;
    try {
      const created = await createQuickJobLine({
        quickJobId: selectedJobId,
        sortOrder: nextSort,
        kind: "comment",
        tag: null,
        code: "",
        description: commentText.trim(),
        qty: null,
        price: null,
      });
      setLines((prev) => [...prev, created]);
      setCommentText("");
    } catch (err) {
      console.error("Failed to add comment line:", err);
      alert(err.message || "Failed to add comment.");
    }
  }

  function openEditLine(line) {
    setEditingLineId(line.id);
    setEditLineForm({
      description: line.description || "",
      qty: line.qty === null ? "" : String(line.qty),
      price: line.price === null ? "" : String(line.price),
    });
  }

  async function handleSaveLineEdit(line) {
    try {
      const updated = await updateQuickJobLine(line.id, {
        description: editLineForm.description,
        qty: editLineForm.qty === "" ? null : parseFloat(editLineForm.qty),
        price: editLineForm.price === "" ? null : parseFloat(editLineForm.price),
      });
      setLines((prev) => prev.map((l) => (l.id === line.id ? updated : l)));
      setEditingLineId(null);
    } catch (err) {
      console.error("Failed to update line:", err);
      alert("Failed to update line.");
    }
  }

  async function handleDeleteLine(line) {
    if (!window.confirm("Remove this line from the job?")) return;
    try {
      await deleteQuickJobLine(line.id);
      setLines((prev) => prev.filter((l) => l.id !== line.id));
    } catch (err) {
      console.error("Failed to delete line:", err);
      alert("Failed to delete line.");
    }
  }

  async function moveLine(index, direction) {
    const target = index + direction;
    if (target < 0 || target >= lines.length) return;
    const a = lines[index];
    const b = lines[target];
    const swapped = [...lines];
    swapped[index] = { ...b, sort_order: a.sort_order };
    swapped[target] = { ...a, sort_order: b.sort_order };
    swapped.sort((x, y) => x.sort_order - y.sort_order);
    setLines(swapped);
    try {
      await reorderQuickJobLines([
        { id: a.id, sort_order: b.sort_order },
        { id: b.id, sort_order: a.sort_order },
      ]);
    } catch (err) {
      console.error("Failed to reorder:", err);
    }
  }

  return (
    <Popup isOpen={isOpen} onClose={onClose} title="Manage Quick Jobs" variant="console">
        <div className="qja-layout">
            <div className="qja-sidebar">
                <div className="lookup-toolbar">
                    <button className="btn-small" onClick={handleNewJob} style={{ width: "100%" }}>
                        + New Quick Job
                    </button>
                </div>
            <div className="lookup-list">
            {jobsLoading && <div className="lookup-empty">Loading...</div>}
            {jobsError && <div className="lookup-empty">Couldn't load jobs.</div>}
            {!jobsLoading && !jobsError && jobs.length === 0 && (
              <div className="lookup-empty">No quick jobs yet.</div>
            )}
            {jobs.map((job) => (
              <div
                className={`lookup-item qja-job-item ${selectedJobId === job.id ? "on" : ""}`}
                key={job.id}
                onClick={() => handleSelectJob(job)}
              >
                <div className="li-top">
                  <span className="desc">{job.name}</span>
                </div>
                <div className="li-bottom">
                  <span className="price">{job.category}</span>
                  <span className="row-actions">
                    <button className="icon-btn danger" onClick={(e) => handleDeleteJob(job, e)} title="Delete">
                      ✕
                    </button>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="qja-main">
          {!selectedJob && !creatingJob ? (
            <div className="lookup-empty">Select a quick job on the left, or create a new one.</div>
          ) : (
            <>
              <div className="catalog-form">
                <div className="field-row">
                  <div className="field">
                    <label>Category</label>
                    <select value={jobForm.category} onChange={(e) => setJobForm({ ...jobForm, category: e.target.value })}>
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label>Code (optional)</label>
                    <input value={jobForm.code} onChange={(e) => setJobForm({ ...jobForm, code: e.target.value })} />
                  </div>
                </div>
                <div className="field">
                  <label>Job Name</label>
                  <input
                    value={jobForm.name}
                    onChange={(e) => setJobForm({ ...jobForm, name: e.target.value })}
                    placeholder="e.g. LOF Regular"
                    autoFocus
                  />
                </div>
                <div className="btn-row">
                  <button className="btn primary" onClick={handleSaveJob} disabled={savingJob || !jobForm.name.trim()}>
                    {savingJob ? "Saving..." : creatingJob ? "Create Job" : "Save Changes"}
                  </button>
                </div>
              </div>

              {selectedJobId && (
                <>
                  <div className="board-section-title">Line Items</div>

                  {linesLoading ? (
                    <div className="lookup-empty">Loading lines...</div>
                  ) : (
                    <div className="lookup-list">
                      {lines.length === 0 && <div className="lookup-empty">No lines yet — add one below.</div>}
                      {lines.map((line, i) => (
                        <div className="lookup-item" key={line.id} style={{ cursor: "default" }}>
                          {editingLineId === line.id ? (
                            <div>
                              <div className="field">
                                <label>Description</label>
                                <input
                                  value={editLineForm.description}
                                  onChange={(e) => setEditLineForm({ ...editLineForm, description: e.target.value })}
                                />
                              </div>
                              {line.kind === "item" && (
                                <div className="field-row">
                                  <div className="field">
                                    <label>Qty (blank = fill in on ticket)</label>
                                    <input
                                      value={editLineForm.qty}
                                      onChange={(e) => setEditLineForm({ ...editLineForm, qty: e.target.value })}
                                    />
                                  </div>
                                  <div className="field">
                                    <label>Price (blank = fill in on ticket)</label>
                                    <input
                                      value={editLineForm.price}
                                      onChange={(e) => setEditLineForm({ ...editLineForm, price: e.target.value })}
                                    />
                                  </div>
                                </div>
                              )}
                              <div className="btn-row">
                                <button className="btn" onClick={() => setEditingLineId(null)}>
                                  Cancel
                                </button>
                                <button className="btn primary" onClick={() => handleSaveLineEdit(line)}>
                                  Save
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="li-top">
                                {line.kind === "item" ? (
                                  <>
                                    <span className="code">{line.tag}</span>
                                    <span className="desc">{line.description}</span>
                                  </>
                                ) : (
                                  <span className="desc" style={{ fontStyle: "italic", color: "var(--muted)" }}>
                                    {line.description}
                                  </span>
                                )}
                              </div>
                              <div className="li-bottom">
                                <span className="price">
                                  {line.kind === "item" ? `${line.qty ?? "—"} × ${money(line.price) || "—"}` : "Comment"}
                                </span>
                                <span className="row-actions">
                                  <button className="icon-btn" onClick={() => moveLine(i, -1)} title="Move up" disabled={i === 0}>
                                    ↑
                                  </button>
                                  <button
                                    className="icon-btn"
                                    onClick={() => moveLine(i, 1)}
                                    title="Move down"
                                    disabled={i === lines.length - 1}
                                  >
                                    ↓
                                  </button>
                                  <button className="icon-btn" onClick={() => openEditLine(line)} title="Edit">
                                    ✎
                                  </button>
                                  <button className="icon-btn danger" onClick={() => handleDeleteLine(line)} title="Delete">
                                    ✕
                                  </button>
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="board-section-title">Add a Line</div>
                  <div className="qja-add-tabs">
                    <button
                      className={`qja-add-tab ${addMode === "item" ? "on" : ""}`}
                      onClick={() => setAddMode(addMode === "item" ? null : "item")}
                    >
                      + Part / Labor
                    </button>
                    <button
                      className={`qja-add-tab ${addMode === "comment" ? "on" : ""}`}
                      onClick={() => setAddMode(addMode === "comment" ? null : "comment")}
                    >
                      + Comment
                    </button>
                  </div>

                  {addMode === "item" && (
                                        <div className="catalog-form">
                      <div className="qja-type-tabs">
                        <button className={`qja-type-tab ${itemType === "part" ? "on" : ""}`} onClick={() => setItemType("part")}>
                          Parts
                        </button>
                        <button className={`qja-type-tab ${itemType === "labor" ? "on" : ""}`} onClick={() => setItemType("labor")}>
                          Labor
                        </button>
                      </div>
                      <input
                        className="lookup-search-input"
                        value={catalogSearch}
                        onChange={(e) => setCatalogSearch(e.target.value)}
                        placeholder="Search catalog..."
                        style={{ marginBottom: 12 }}
                      />
                      <div className="lookup-list qja-catalog-list">
                        {catalogLoading && <div className="lookup-empty">Loading...</div>}
                        {!catalogLoading && catalogItems.length === 0 && <div className="lookup-empty">No matches.</div>}
                        {catalogItems.map((it) => (
                          <div className="lookup-item" key={it.id} onClick={() => handleAddItemLine(it)}>
                            <div className="li-top">
                              <span className="code">{it.code}</span>
                              <span className="desc">{it.description}</span>
                            </div>
                            <div className="li-bottom">
                              <span className="price">${Number(it.price || 0).toFixed(2)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {addMode === "comment" && (
                    <div className="catalog-form">
                      <div className="field">
                        <label>Comment text</label>
                        <textarea value={commentText} onChange={(e) => setCommentText(e.target.value)} />
                      </div>
                      <div className="btn-row">
                        <button className="btn primary" onClick={handleAddCommentLine} disabled={!commentText.trim()}>
                          Add Comment Line
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </Popup>
  );
}
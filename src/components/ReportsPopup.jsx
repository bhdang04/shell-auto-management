import { useEffect, useState } from "react";
import Popup from "./button-row/Modal";
import { getPaidInvoicesInRange, summarizeInvoices, getReportExtras } from "../api/reports";
import { getShopSettings } from "../api/settings";
import { printReport, openReportWindow } from "../lib/printReport";

function money(n) {
  return "$" + Number(n || 0).toFixed(2);
}

function todayInputValue() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function currentMonthInputValue() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** ISO week helpers — <input type="week"> uses "YYYY-Www" (ISO 8601 week
 *  numbering), which JS has no built-in parser/formatter for. */
function getISOWeekInputValue(d) {
  const date = new Date(d.getTime());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const week1 = new Date(date.getFullYear(), 0, 4);
  const weekNo = 1 + Math.round(((date - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return `${date.getFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

function isoWeekStringToMonday(weekString) {
  const [yearStr, weekStr] = weekString.split("-W");
  const year = Number(yearStr);
  const week = Number(weekStr);
  const jan4 = new Date(year, 0, 4);
  const jan4Day = (jan4.getDay() + 6) % 7; // Mon=0..Sun=6
  const week1Monday = new Date(jan4);
  week1Monday.setDate(jan4.getDate() - jan4Day);
  const monday = new Date(week1Monday);
  monday.setDate(week1Monday.getDate() + (week - 1) * 7);
  return monday;
}

function getRange(tab, dailyValue, weeklyValue, monthlyValue) {
  if (tab === "daily") {
    const [y, m, d] = dailyValue.split("-").map(Number);
    const start = new Date(y, m - 1, d);
    const end = new Date(y, m - 1, d + 1);
    return { start, end, label: start.toLocaleDateString() };
  }
  if (tab === "weekly") {
    const start = isoWeekStringToMonday(weeklyValue);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    const endDisplay = new Date(end);
    endDisplay.setDate(end.getDate() - 1);
    return { start, end, label: `${start.toLocaleDateString()} – ${endDisplay.toLocaleDateString()}` };
  }
  const [y, m] = monthlyValue.split("-").map(Number);
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 1);
  return { start, end, label: start.toLocaleDateString(undefined, { month: "long", year: "numeric" }) };
}

const TABS = [
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
];

const inputStyle = {
  background: "var(--bg)",
  border: "1px solid var(--line)",
  color: "var(--text)",
  padding: "8px 10px",
  borderRadius: 5,
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 13,
};

const sectionTitleStyle = {
  fontFamily: "'Oswald', sans-serif",
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: ".09em",
  color: "var(--muted)",
  marginTop: 24,
  marginBottom: 10,
  borderBottom: "1px solid var(--line)",
  paddingBottom: 6,
};

export default function ReportsPopup({ isOpen, onClose }) {
  const [tab, setTab] = useState("daily");
  const [dailyValue, setDailyValue] = useState(todayInputValue());
  const [weeklyValue, setWeeklyValue] = useState(getISOWeekInputValue(new Date()));
  const [monthlyValue, setMonthlyValue] = useState(currentMonthInputValue());
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [printing, setPrinting] = useState(false);

  const { start, end, label } = getRange(tab, dailyValue, weeklyValue, monthlyValue);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getPaidInvoicesInRange(start, end)
      .then((data) => {
        if (!cancelled) setInvoices(data);
      })
      .catch((err) => {
        console.error("Failed to load report:", err);
        if (!cancelled) setError("Failed to load report data.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, tab, dailyValue, weeklyValue, monthlyValue]);

  const summary = summarizeInvoices(invoices);

  /** Prints the period currently shown. The window has to be opened BEFORE
   *  any await, or the browser blocks it as a popup. */
  async function handlePrint() {
    const win = openReportWindow();
    if (!win) return;
    setPrinting(true);
    try {
      const [extras, shop] = await Promise.all([
        getReportExtras(start, end, invoices),
        getShopSettings().catch(() => null),
      ]);
      printReport({ win, tab, rangeLabel: label, shop, summary, invoices, extras });
    } catch (err) {
      console.error("Failed to print report:", err);
      setError("Failed to print report.");
      if (win && !win.closed) win.close();
    } finally {
      setPrinting(false);
    }
  }

  const FIXED_METHODS = ["Cash", "Visa", "Mastercard", "American Express", "Discover", "ATM"];
  const fixedEntries = FIXED_METHODS.map((m) => [m, summary.byMethod[m] || 0]);

  const otherEntries = Object.entries(summary.byMethod)
    .filter(([method]) => !FIXED_METHODS.includes(method))
    .sort((a, b) => b[1] - a[1]);

  const methodEntries = [...fixedEntries, ...otherEntries];

  return (
    <Popup isOpen={isOpen} onClose={onClose} title="Reports" variant="console">
      <div className="console-tabs">
        {TABS.map((t) => (
          <div key={t.id} className={`console-tab ${tab === t.id ? "on" : ""}`} onClick={() => setTab(t.id)}>
            {t.label}
          </div>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
        {tab === "daily" && (
          <input type="date" value={dailyValue} onChange={(e) => setDailyValue(e.target.value)} style={inputStyle} />
        )}
        {tab === "weekly" && (
          <input type="week" value={weeklyValue} onChange={(e) => setWeeklyValue(e.target.value)} style={inputStyle} />
        )}
        {tab === "monthly" && (
          <input type="month" value={monthlyValue} onChange={(e) => setMonthlyValue(e.target.value)} style={inputStyle} />
        )}
        <div style={{ fontSize: 13, color: "var(--muted)" }}>{label}</div>
        <button
          className="btn-small"
          style={{ marginLeft: "auto", height: 36, padding: "0 18px" }}
          onClick={handlePrint}
          disabled={loading || printing || !!error}
        >
          {printing ? "Preparing…" : "Print Report"}
        </button>
      </div>

      {loading ? (
        <div className="lookup-empty">Loading…</div>
      ) : error ? (
        <div className="lookup-empty" style={{ color: "var(--bad)" }}>
          {error}
        </div>
      ) : (
        <>
          <div className="grid-3" style={{ marginBottom: 18 }}>
            <div className="job-card" style={{ cursor: "default" }}>
              <div className="jd">Total Collected</div>
              <div className="jn" style={{ fontSize: 20, color: "var(--accent)" }}>
                {money(summary.total)}
              </div>
            </div>
            <div className="job-card" style={{ cursor: "default" }}>
              <div className="jd">Invoices</div>
              <div className="jn" style={{ fontSize: 20 }}>
                {summary.count}
              </div>
            </div>
            <div className="job-card" style={{ cursor: "default" }}>
              <div className="jd">Avg Ticket</div>
              <div className="jn" style={{ fontSize: 20 }}>
                {money(summary.avgTicket)}
              </div>
            </div>
          </div>

          <div className="profit-row">
            <span>Labor</span>
            <span className="v">{money(summary.labor)}</span>
          </div>
          <div className="profit-row">
            <span>Parts</span>
            <span className="v">{money(summary.parts)}</span>
          </div>
          <div className="profit-row">
            <span>Sales Tax</span>
            <span className="v">{money(summary.tax)}</span>
          </div>
          <div className="profit-row">
            <span>Card Surcharge</span>
            <span className="v">{money(summary.surcharge)}</span>
          </div>
          <div className="profit-row total">
            <span>Total</span>
            <span className="v">{money(summary.total)}</span>
          </div>

          <div style={sectionTitleStyle}>By Payment Method</div>
          {methodEntries.length === 0 ? (
            <div className="lookup-empty">No paid invoices in this period.</div>
          ) : (
            methodEntries.map(([method, amt]) => (
              <div className="console-line" key={method}>
                <span>{method}</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{money(amt)}</span>
              </div>
            ))
          )}

          <div style={sectionTitleStyle}>Invoices</div>
          {invoices.length === 0 ? (
            <div className="lookup-empty">No paid invoices in this period.</div>
          ) : (
            invoices.map((inv) => {
              const total =
                Number(inv.labor_total) + Number(inv.parts_total) + Number(inv.tax) + Number(inv.payment_surcharge || 0);
              const custName = inv.vehicles?.customers?.name || "—";
              const vehLabel = [inv.vehicles?.year, inv.vehicles?.make, inv.vehicles?.model].filter(Boolean).join(" ");
              return (
                <div className="console-line" key={inv.id}>
                  <span>
                    #{inv.num} · {custName}
                    <span style={{ color: "var(--muted)", marginLeft: 6 }}>{vehLabel}</span>
                  </span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    {inv.payment_method} · {money(total)}
                  </span>
                </div>
              );
            })
          )}
        </>
      )}
    </Popup>
  );
}
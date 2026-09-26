import { useEffect, useState } from "react";
import Popup from "./button-row/Modal";
import { getShopSettings, updateShopSettings } from "../api/settings";
import { bulkSetLaborPrice } from "../api/catalog";

export default function ShopSettingsPopup({ isOpen, onClose, onSaved }) {
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [applyingRate, setApplyingRate] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setError(null);
    getShopSettings()
      .then((s) =>
        setForm({
          name: s.name,
          addr: s.addr,
          phone: s.phone,
          license_number: s.license_number,
          labor_rate: String(s.labor_rate),
          tax_rate: String(Number(s.tax_rate) * 100), // stored as a fraction, edited as a percent
        })
      )
      .catch((err) => {
        console.error("Failed to load shop settings:", err);
        setError("Couldn't load settings.");
      })
      .finally(() => setLoading(false));
  }, [isOpen]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const saved = await updateShopSettings({
        name: form.name,
        addr: form.addr,
        phone: form.phone,
        license_number: form.license_number,
        labor_rate: parseFloat(form.labor_rate) || 0,
        tax_rate: (parseFloat(form.tax_rate) || 0) / 100,
      });
      onSaved?.(saved);
      onClose();
    } catch (err) {
      console.error("Failed to save shop settings:", err);
      setError("Couldn't save — try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleApplyLaborRate() {
    const rate = parseFloat(form.labor_rate) || 0;
    if (!window.confirm(`Set every existing LABOR catalog item's price to $${rate.toFixed(2)}?`)) return;
    setApplyingRate(true);
    try {
      await bulkSetLaborPrice(rate);
      alert("Done — all labor items updated.");
    } catch (err) {
      console.error("Failed to bulk-update labor price:", err);
      alert("Failed to update labor items.");
    } finally {
      setApplyingRate(false);
    }
  }

  return (
    <Popup isOpen={isOpen} onClose={onClose} title="Shop Settings" variant="compact">
      {loading || !form ? (
        <div className="lookup-empty">Loading...</div>
      ) : (
        <>
          <div className="field">
            <label>Shop Name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="field">
            <label>Address</label>
            <input value={form.addr} onChange={(e) => setForm({ ...form, addr: e.target.value })} />
          </div>
          <div className="field-row">
            <div className="field">
              <label>Phone</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="field">
              <label>License #</label>
              <input
                value={form.license_number}
                onChange={(e) => setForm({ ...form, license_number: e.target.value })}
              />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Default Labor Rate ($/hr)</label>
              <input value={form.labor_rate} onChange={(e) => setForm({ ...form, labor_rate: e.target.value })} />
            </div>
            <div className="field">
              <label>Sales Tax Rate (%)</label>
              <input value={form.tax_rate} onChange={(e) => setForm({ ...form, tax_rate: e.target.value })} />
            </div>
          </div>

          <button className="btn-small" onClick={handleApplyLaborRate} disabled={applyingRate} style={{ width: "100%", marginBottom: 14 }}>
            {applyingRate ? "Applying..." : "Apply this rate to all existing Labor items"}
          </button>

          {error && (
            <div className="lookup-empty" style={{ color: "var(--bad)" }}>
              {error}
            </div>
          )}
          <div className="btn-row">
            <button className="btn" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button className="btn primary" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </>
      )}
    </Popup>
  );
}
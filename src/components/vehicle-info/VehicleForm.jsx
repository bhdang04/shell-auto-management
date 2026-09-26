import { useState } from "react";
import VehicleHistory from "./VehicleHistory";
import MakeField from "./MakeField";
import ModelField from "./ModelField";
import { decodeVin, vinResultToSpecs } from "../../api/vehicleLookup";

/**
 * VehicleForm
 * Props:
 *  - vehicle: { year, make, model, engine_specs, plate, vin, odo }
 *  - onFieldChange(field, value): update a single vehicle field
 *  - history: passed straight through to VehicleHistory
 *  - onSelectInvoice(index): passed straight through to VehicleHistory
 *  - vehicleCount: how many vehicles the current customer has on file
 *  - onSwitchVehicle(): open the picker to switch to a different one
 *  - onAddVehicle(): create a new blank vehicle for the current customer
 */
export default function VehicleForm({
  vehicle,
  onFieldChange,
  history,
  onSelectInvoice,
  vehicleCount = 0,
  onSwitchVehicle,
  onAddVehicle,
  onVinLookupChange, // (isLooking: boolean) — lets the parent block Save while a VIN lookup is in flight
}) {
  const [vinStatus, setVinStatus] = useState(null); // null | "looking" | "done" | "error"

  async function handleVinBlur() {
    const vin = vehicle.vin.trim();
    if (vin.length !== 17) return; // not a full VIN yet, nothing to look up
    setVinStatus("looking");
    onVinLookupChange?.(true);
    try {
      const result = await decodeVin(vin);
      if (!result.make) {
        setVinStatus("error"); // valid-length VIN, but NHTSA didn't recognize it
        return;
      }
      // Don't clobber fields the tech already filled in by hand.
      if (!String(vehicle.year || "").trim()) onFieldChange("year", result.year);
      if (!vehicle.make?.trim()) onFieldChange("make", result.make);
      if (!vehicle.model?.trim()) onFieldChange("model", result.model);
      if (!vehicle.engine_specs?.trim()) onFieldChange("engine_specs", vinResultToSpecs(result));
      setVinStatus("done");
    } catch (err) {
      console.error("VIN decode failed:", err);
      setVinStatus("error");
    } finally {
      onVinLookupChange?.(false);
    }
  }

  return (
    <div className="ro-card">
      <div className="ro-card-head">
        <h4>Vehicle</h4>
        {vehicleCount > 0 && (
          <div className="ro-card-actions">
            {vehicleCount > 1 && (
              <button className="ro-card-link" onClick={onSwitchVehicle}>
                Switch ({vehicleCount})
              </button>
            )}
            <button className="ro-card-link" onClick={onAddVehicle}>
              + Add Vehicle
            </button>
          </div>
        )}
      </div>

      <div className="field-row veh-ymm">
        <div className="field">
          <label>Year</label>
          <input
            value={vehicle.year || ""}
            onChange={(e) => onFieldChange("year", e.target.value)}
            placeholder="2019"
            maxLength={4}
            inputMode="numeric"
          />
        </div>
        <MakeField value={vehicle.make || ""} onChange={(v) => onFieldChange("make", v)} />
        <ModelField
          value={vehicle.model || ""}
          onChange={(v) => onFieldChange("model", v)}
          make={vehicle.make}
          year={vehicle.year}
        />
      </div>

      <div className="field-row">
        <div className="field">
          <label>Engine / Drivetrain</label>
          <input value={vehicle.engine_specs || ""} onChange={(e) => onFieldChange("engine_specs", e.target.value)} />
        </div>
        <div className="field">
          <label>Odometer</label>
          <input value={vehicle.odo} onChange={(e) => onFieldChange("odo", e.target.value)} />
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <label>License Plate</label>
          <input value={vehicle.plate} onChange={(e) => onFieldChange("plate", e.target.value)} />
        </div>
        <div className="field">
          <label>
            VIN{" "}
            {vinStatus === "looking" && <span className="vin-status">looking up...</span>}
            {vinStatus === "done" && <span className="vin-status ok">✓ filled from VIN</span>}
            {vinStatus === "error" && <span className="vin-status err">not found</span>}
          </label>
          <input
            value={vehicle.vin}
            onChange={(e) => {
              onFieldChange("vin", e.target.value);
              if (vinStatus) setVinStatus(null);
            }}
            onBlur={handleVinBlur}
            placeholder="17-character VIN"
            maxLength={17}
          />
        </div>
      </div>

      <VehicleHistory history={history} onSelectInvoice={onSelectInvoice} />
    </div>
  );
}

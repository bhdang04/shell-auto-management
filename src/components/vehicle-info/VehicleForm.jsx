import VehicleHistory from "./VehicleHistory";

/**
 * VehicleForm
 * Props:
 *  - vehicle: { label, specs, plate, vin, odo }
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
}) {
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

      <div className="field-row single">
        <div className="field">
          <label>Year / Make / Model</label>
          <input
            value={vehicle.label}
            onChange={(e) => onFieldChange("label", e.target.value)}
            placeholder="e.g. 2019 Toyota Tacoma SR5"
          />
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <label>Engine / Drivetrain</label>
          <input value={vehicle.specs} onChange={(e) => onFieldChange("specs", e.target.value)} />
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
          <label>VIN</label>
          <input value={vehicle.vin} onChange={(e) => onFieldChange("vin", e.target.value)} />
        </div>
      </div>

      <VehicleHistory history={history} onSelectInvoice={onSelectInvoice} />
    </div>
  );
}
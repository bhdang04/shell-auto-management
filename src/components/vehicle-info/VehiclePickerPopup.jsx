import Modal from "../button-row/Modal";

/**
 * VehiclePickerPopup
 * Shown when a selected customer has more than one vehicle — lets the tech
 * pick which one this repair order is for.
 *
 * Props:
 *  - isOpen, onClose
 *  - vehicles: array of { id, year, make, model, engine_specs, plate, vin, odo }
 *  - onSelect(vehicle): fired when one is picked
 */
export default function VehiclePickerPopup({ isOpen, onClose, vehicles, onSelect }) {
  function vehicleLabel(v) {
    const label = [v.year, v.make, v.model].filter(Boolean).join(" ");
    return label || "Unlabeled vehicle";
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Select Vehicle" variant="compact">
      <div className="lookup-list">
        {(vehicles || []).map((v) => (
          <div className="lookup-item" key={v.id} onClick={() => onSelect(v)}>
            <div className="li-top">
              <span className="desc">{vehicleLabel(v)}</span>
            </div>
            <div className="li-bottom">
              <span className="price">{v.plate ? `Plate ${v.plate}` : "No plate on file"}</span>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
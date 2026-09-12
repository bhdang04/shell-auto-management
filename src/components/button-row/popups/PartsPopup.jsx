import Popup from "../Modal";
import CatalogList from "./CatalogList";

/**
 * PartsPopup
 * Browse, search, add, edit, and delete Part catalog entries. Clicking a
 * row (not its edit/delete icons) picks it and adds it as a line item.
 */
export default function PartsPopup({ isOpen, onClose, onPick }) {
  function handlePick(item) {
    if (onPick) onPick(item);
    onClose();
  }

  return (
    <Popup isOpen={isOpen} onClose={onClose} title="Parts" variant="drawer">
      <CatalogList tag="PART" onPick={handlePick} />
    </Popup>
  );
}

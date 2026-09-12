import Popup from "../Modal";
import CatalogList from "./CatalogList";

/**
 * LaborPopup
 * Browse, search, add, edit, and delete Labor catalog entries (from Supabase).
 * Clicking a row (not its edit/delete icons) picks it and adds it as a line item.
 */
export default function LaborPopup({ isOpen, onClose, onPick }) {
  function handlePick(item) {
    if (onPick) onPick(item);
    onClose();
  }

  return (
    <Popup isOpen={isOpen} onClose={onClose} title="Labor" variant="drawer">
      <CatalogList type="labor" onPick={handlePick} />
    </Popup>
  );
}
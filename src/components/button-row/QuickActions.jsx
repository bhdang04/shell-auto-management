const ACTIONS = ["Parts", "Labor", "Quick Jobs", "Profit", "Done", "Note", "Estimate", "Schedule"];

/**
 * QuickActions
 * Row of shortcut buttons below the Customer/Vehicle form. All stubbed —
 * wire up onClick handlers per-button as each one gets built out.
 */
export default function QuickActions() {
  return (
    <div className="quick-actions">
      {ACTIONS.map((label) => (
        <button key={label} className="quick-action-btn" onClick={() => {}}>
          {label}
        </button>
      ))}
    </div>
  );
}

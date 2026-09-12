import { useEffect, useRef } from "react";

/**
 * Popup
 * Thin wrapper around the native <dialog> element — gives us focus trapping,
 * Escape-to-close, and top-layer stacking for free.
 *
 * Props:
 *  - isOpen, onClose: standard controlled-modal props
 *  - title: shown in the header
 *  - variant: "" | "compact" | "drawer" | "console" — controls size/shape via CSS
 *  - children: modal body content
 */
export default function Popup({ isOpen, onClose, title, variant = "", children }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  function handleCancel(e) {
    e.preventDefault(); // let React state drive closing, not the browser default
    onClose();
  }

  function handleBackdropClick(e) {
    // when you click outside the dialog's box, the click target IS the
    // <dialog> element itself (its padding box == the backdrop area)
    if (e.target === dialogRef.current) onClose();
  }

  const className = ["popup-modal", variant && `popup-modal--${variant}`].filter(Boolean).join(" ");

  return (
    <dialog ref={dialogRef} onCancel={handleCancel} onClick={handleBackdropClick} className={className}>
      <div className="popup-header">
        <h2>{title}</h2>
        <button onClick={onClose} className="close-btn" aria-label="Close">
          &times;
        </button>
      </div>
      <div className="popup-content">{children}</div>
    </dialog>
  );
}

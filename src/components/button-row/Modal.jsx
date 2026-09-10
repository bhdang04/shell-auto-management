import React, { useEffect, useRef } from 'react'

export default function Popup({ isOpen, onClose, title, children}) {
    const dialogRef = useRef(null)

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;

        if (isOpen) {
            dialog.showModal();
        } else {
            dialog.close();
        }
    }, [isOpen]);

    const handleCancel = (e) => {
    e.preventDefault();
    onClose();
  };

  return (
    <dialog ref={dialogRef} onCancel={handleCancel} className="popup-modal">
      <div className="popup-header">
        <h2>{title}</h2>
        <button onClick={onClose} className="close-btn">&times;</button>
      </div>
      <div className="popup-content">
        {children}
      </div>
    </dialog>
  );
}
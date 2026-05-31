// frontend/src/components/Modal.jsx

/**
 * Simple modal:
 * - covers screen with backdrop
 * - closes on backdrop click or ESC
 * - children is modal content
 */
import { useEffect } from "react";

export default function Modal({ open, onClose, title, children }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => {
        // Close if user clicks outside the modal card
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-100 px-3 py-2 text-sm hover:bg-slate-200"
          >
            Close
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}

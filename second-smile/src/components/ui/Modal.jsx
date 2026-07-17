import { useEffect } from "react";
import { createPortal } from "react-dom";

export function Modal({ children, onClose }) {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape" && onClose) onClose();
    };
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      {children}
    </div>,
    document.body
  );
}

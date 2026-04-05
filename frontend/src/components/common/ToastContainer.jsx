import React from "react";
import { useToast } from "../../context/ToastContext";

const ICON = { success: "✅", error: "❌", info: "ℹ️" };

export default function ToastContainer() {
  const { toasts } = useToast();
  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <span>{ICON[t.type]}</span>
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}

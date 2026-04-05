import React, { createContext, useContext, useState, useCallback } from "react";

const ToastCtx = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const add = useCallback((msg, type = "info") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);

  const value = {
    toasts,
    success: (m) => add(m, "success"),
    error:   (m) => add(m, "error"),
    info:    (m) => add(m, "info"),
  };

  return <ToastCtx.Provider value={value}>{children}</ToastCtx.Provider>;
}

export function useToast() {
  return useContext(ToastCtx);
}

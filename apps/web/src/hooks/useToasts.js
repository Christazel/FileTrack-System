import { useCallback, useState } from "react";

import { TOAST_TIMEOUT_MS } from "../appDefaults";

export function useToasts() {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = "success") => {
    const toastId = Date.now();
    const newToast = { id: toastId, message, type };
    setToasts((prev) => [...prev, newToast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toastId));
    }, TOAST_TIMEOUT_MS);
  }, []);

  return { toasts, showToast };
}

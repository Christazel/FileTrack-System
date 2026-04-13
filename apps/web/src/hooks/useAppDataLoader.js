import { useCallback, useEffect, useState } from "react";

export function useAppDataLoader({
  token,
  user,
  onAfterMutateRef,
  loadDocumentsDomain,
  loadAdminDomain,
  loadNotifications,
  loadLogs,
  showToast,
}) {
  const [loading, setLoading] = useState(false);

  const loadAll = useCallback(async () => {
    if (!token) {
      return;
    }

    setLoading(true);

    try {
      await Promise.all([
        loadDocumentsDomain(),
        loadAdminDomain(),
        loadNotifications(),
        loadLogs(),
      ]);
    } finally {
      setLoading(false);
    }
  }, [loadAdminDomain, loadDocumentsDomain, loadLogs, loadNotifications, token]);

  useEffect(() => {
    if (onAfterMutateRef) {
      onAfterMutateRef.current = loadAll;
    }
  }, [loadAll, onAfterMutateRef]);

  useEffect(() => {
    if (token && user) {
      loadAll();
    }
  }, [token, user, loadAll]);

  const refreshAll = useCallback(async () => {
    await loadAll();
    showToast("Data terbaru berhasil dimuat.");
  }, [loadAll, showToast]);

  return {
    loading,
    loadAll,
    refreshAll,
  };
}

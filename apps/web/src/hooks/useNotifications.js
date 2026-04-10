import { useCallback, useMemo, useState } from "react";

import { getApiErrorMessage } from "../appDefaults";

export function useNotifications({ api, token, showToast, isManagerLike, onAfterMutateRef }) {
  const [notifications, setNotifications] = useState([]);
  const [logs, setLogs] = useState([]);

  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const loadNotifications = useCallback(async () => {
    if (!token) {
      return;
    }

    try {
      const response = await api.get("/notifications", { headers });
      setNotifications(response.data);
    } catch (requestError) {
      showToast(getApiErrorMessage(requestError, "Gagal mengambil notifikasi."), "error");
    }
  }, [api, headers, showToast, token]);

  const loadLogs = useCallback(async () => {
    if (!token || !isManagerLike) {
      setLogs([]);
      return;
    }

    try {
      const response = await api.get("/logs", { headers });
      setLogs(response?.data?.items || []);
    } catch (requestError) {
      showToast(getApiErrorMessage(requestError, "Gagal mengambil log."), "error");
    }
  }, [api, headers, isManagerLike, showToast, token]);

  const markNotificationRead = useCallback(
    async (notificationId) => {
      try {
        await api.patch(`/notifications/${notificationId}/read`, {}, { headers });
        await (onAfterMutateRef?.current?.() ?? loadNotifications());
      } catch (requestError) {
        showToast(getApiErrorMessage(requestError, "Gagal memperbarui notifikasi."), "error");
      }
    },
    [api, headers, loadNotifications, onAfterMutateRef, showToast],
  );

  const markAllNotificationsRead = useCallback(async () => {
    try {
      await api.patch("/notifications/read-all", {}, { headers });
      await (onAfterMutateRef?.current?.() ?? loadNotifications());
    } catch (requestError) {
      showToast(getApiErrorMessage(requestError, "Gagal menandai notifikasi."), "error");
    }
  }, [api, headers, loadNotifications, onAfterMutateRef, showToast]);

  const resetNotificationsState = useCallback(() => {
    setNotifications([]);
    setLogs([]);
  }, []);

  return {
    notifications,
    logs,
    loadNotifications,
    loadLogs,
    markNotificationRead,
    markAllNotificationsRead,
    resetNotificationsState,
  };
}

import { useCallback } from "react";

export function useAppLogout({ authLogout, resetDocumentsState, resetAdminState, resetNotificationsState }) {
  return useCallback(() => {
    authLogout();
    resetDocumentsState();
    resetAdminState();
    resetNotificationsState();
  }, [authLogout, resetAdminState, resetDocumentsState, resetNotificationsState]);
}

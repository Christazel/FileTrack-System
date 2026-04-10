import { useCallback, useState } from "react";

const ONBOARDING_KEY = "filetrack_onboarding_seen";

export function useOnboarding({ showToast }) {
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem(ONBOARDING_KEY));

  const dismissOnboarding = useCallback(() => {
    localStorage.setItem(ONBOARDING_KEY, "true");
    setShowOnboarding(false);
    showToast("Panduan ditutup. Anda dapat melihatnya kembali di menu.", "info");
  }, [showToast]);

  return { showOnboarding, dismissOnboarding };
}

import { useCallback, useEffect, useState } from "react";

import { getApiErrorMessage } from "../appDefaults";

export function useAuth({ api, showToast }) {
  const [token, setToken] = useState("");
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("admin@filetrack.local");
  const [password, setPassword] = useState("Password123!");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    localStorage.removeItem("filetrack_token");
    localStorage.removeItem("filetrack_user");
    sessionStorage.removeItem("filetrack_token");
    sessionStorage.removeItem("filetrack_user");
  }, []);

  const handleLogin = useCallback(
    async (event) => {
      event.preventDefault();
      setError("");
      setSuccess("");

      try {
        const response = await api.post("/auth/login", { email, password });
        const nextToken = response.data.token;
        const nextUser = response.data.user;

        setToken(nextToken);
        setUser(nextUser);
        showToast("Login berhasil.");
      } catch (requestError) {
        showToast(getApiErrorMessage(requestError, "Login gagal."), "error");
      }
    },
    [api, email, password, showToast],
  );

  const logout = useCallback(() => {
    setToken("");
    setUser(null);
    setError("");
    setSuccess("");
  }, []);

  return {
    token,
    user,
    email,
    password,
    error,
    success,
    setEmail,
    setPassword,
    setError,
    setSuccess,
    handleLogin,
    logout,
  };
}

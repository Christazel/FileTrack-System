import { useCallback, useMemo, useState } from "react";

import { getApiErrorMessage } from "../appDefaults";

export function useAdmin({ api, token, showToast, onAfterMutateRef }) {
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);

  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const loadUsers = useCallback(async () => {
    if (!token) {
      return;
    }

    try {
      const response = await api.get("/users", { headers });
      setUsers(response.data);
    } catch (requestError) {
      showToast(getApiErrorMessage(requestError, "Gagal mengambil data user."), "error");
    }
  }, [api, headers, showToast, token]);

  const loadDepartments = useCallback(async () => {
    if (!token) {
      return;
    }

    try {
      const response = await api.get("/departments", { headers });
      setDepartments(response.data);
    } catch (requestError) {
      showToast(getApiErrorMessage(requestError, "Gagal mengambil data departemen."), "error");
    }
  }, [api, headers, showToast, token]);

  const loadAdminDomain = useCallback(async () => {
    await Promise.all([loadUsers(), loadDepartments()]);
  }, [loadDepartments, loadUsers]);

  const adminCreateUser = useCallback(
    async (payload) => {
      try {
        await api.post(
          "/users",
          {
            name: payload.name,
            email: payload.email,
            role: payload.role,
            departmentId: payload.departmentId || undefined,
            password: payload.password || undefined,
          },
          { headers },
        );
        showToast("User berhasil dibuat.");
        await (onAfterMutateRef?.current?.() ?? loadUsers());
      } catch (requestError) {
        showToast(getApiErrorMessage(requestError, "Gagal membuat user."), "error");
      }
    },
    [api, headers, loadUsers, onAfterMutateRef, showToast],
  );

  const adminUpdateUser = useCallback(
    async (userId, payload) => {
      try {
        await api.patch(
          `/users/${userId}`,
          {
            ...(payload.name ? { name: payload.name } : {}),
            ...(payload.email ? { email: payload.email } : {}),
            ...(payload.role ? { role: payload.role } : {}),
            ...(payload.departmentId !== undefined ? { departmentId: payload.departmentId } : {}),
          },
          { headers },
        );
        showToast("User diperbarui.");
        await (onAfterMutateRef?.current?.() ?? loadUsers());
      } catch (requestError) {
        showToast(getApiErrorMessage(requestError, "Gagal update user."), "error");
      }
    },
    [api, headers, loadUsers, onAfterMutateRef, showToast],
  );

  const adminResetPassword = useCallback(
    async (userId) => {
      try {
        await api.post(`/users/${userId}/reset-password`, {}, { headers });
        showToast("Password direset ke default (atau sesuai input backend)." );
      } catch (requestError) {
        showToast(getApiErrorMessage(requestError, "Gagal reset password."), "error");
      }
    },
    [api, headers, showToast],
  );

  const adminDeleteUser = useCallback(
    async (userId) => {
      try {
        await api.delete(`/users/${userId}`, { headers });
        showToast("User dihapus.");
        await (onAfterMutateRef?.current?.() ?? loadUsers());
      } catch (requestError) {
        showToast(getApiErrorMessage(requestError, "Gagal menghapus user."), "error");
      }
    },
    [api, headers, loadUsers, onAfterMutateRef, showToast],
  );

  const adminCreateDepartment = useCallback(
    async (payload) => {
      try {
        await api.post("/departments", { name: payload.name }, { headers });
        showToast("Departemen berhasil dibuat.");
        await (onAfterMutateRef?.current?.() ?? loadDepartments());
      } catch (requestError) {
        showToast(getApiErrorMessage(requestError, "Gagal membuat departemen."), "error");
      }
    },
    [api, headers, loadDepartments, onAfterMutateRef, showToast],
  );

  const adminUpdateDepartment = useCallback(
    async (departmentId, payload) => {
      try {
        await api.patch(`/departments/${departmentId}`,
          { name: payload.name },
          { headers },
        );
        showToast("Departemen diperbarui.");
        await (onAfterMutateRef?.current?.() ?? loadDepartments());
      } catch (requestError) {
        showToast(getApiErrorMessage(requestError, "Gagal update departemen."), "error");
      }
    },
    [api, headers, loadDepartments, onAfterMutateRef, showToast],
  );

  const adminDeleteDepartment = useCallback(
    async (departmentId) => {
      try {
        await api.delete(`/departments/${departmentId}`, { headers });
        showToast("Departemen dihapus.");
        await (onAfterMutateRef?.current?.() ?? loadDepartments());
      } catch (requestError) {
        showToast(getApiErrorMessage(requestError, "Gagal menghapus departemen."), "error");
      }
    },
    [api, headers, loadDepartments, onAfterMutateRef, showToast],
  );

  const resetAdminState = useCallback(() => {
    setUsers([]);
    setDepartments([]);
  }, []);

  return {
    users,
    departments,
    loadUsers,
    loadDepartments,
    loadAdminDomain,
    adminCreateUser,
    adminUpdateUser,
    adminResetPassword,
    adminDeleteUser,
    adminCreateDepartment,
    adminUpdateDepartment,
    adminDeleteDepartment,
    resetAdminState,
  };
}

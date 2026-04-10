import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import LoginPage from "./components/LoginPage";
import Sidebar from "./components/layout/Sidebar";
import Topbar from "./components/layout/Topbar";
import HomeSection from "./components/sections/HomeSection";
import DocumentsSection from "./components/sections/DocumentsSection";
import NotificationsSection from "./components/sections/NotificationsSection";
import PreviewModal from "./components/modals/PreviewModal";
import ToastContainer from "./components/ui/ToastContainer";
import OnboardingOverlay from "./components/ui/OnboardingOverlay";
import {
  TOAST_TIMEOUT_MS,
  publicFeatures,
  publicProofPoints,
  publicWorkflow,
} from "./appDefaults";

import { useAdmin } from "./hooks/useAdmin";
import { useAuth } from "./hooks/useAuth";
import { useDocuments } from "./hooks/useDocuments";
import { useNotifications } from "./hooks/useNotifications";

import api from "./apiClient";

const DEFAULT_SORT_BY = "createdAt";
const DEFAULT_SORT_ORDER = "desc";

function App() {
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState("home");

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const sortBy = DEFAULT_SORT_BY;
  const sortOrder = DEFAULT_SORT_ORDER;

  const [toasts, setToasts] = useState([]);
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem("filetrack_onboarding_seen"));

  const showToast = useCallback((message, type = "success") => {
    const toastId = Date.now();
    const newToast = { id: toastId, message, type };
    setToasts((prev) => [...prev, newToast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toastId));
    }, TOAST_TIMEOUT_MS);
  }, []);

  const auth = useAuth({ api, showToast });
  const { token, user, email, password, error, success, setSuccess, setEmail, setPassword, handleLogin, logout: authLogout } = auth;

  const isManagerLike = user?.role === "ADMIN" || user?.role === "MANAGER";
  const canManageCategories = user?.role === "ADMIN";
  const canCreateDocuments = isManagerLike;
  const isAdmin = user?.role === "ADMIN";

  const onAfterMutateRef = useRef(null);

  const documentsApi = useDocuments({ api, token, showToast, onAfterMutateRef });
  const adminApi = useAdmin({ api, token, showToast, onAfterMutateRef });
  const notificationsApi = useNotifications({ api, token, showToast, isManagerLike, onAfterMutateRef });

  const {
    dashboard,
    categories,
    documents,
    query,
    setQuery,
    categoryId,
    setCategoryId,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    resetFilters,
    newCategory,
    setNewCategory,
    uploadForm,
    setUploadForm,
    previewModal,
    setVersionDrafts,
    shareDrafts,
    setShareDrafts,
    documentVersions,
    documentShares,
    documentComments,
    documentLogs,
    loadDocumentsDomain,
    searchDocuments,
    handleUpload,
    createCategory,
    adminUpdateCategory,
    adminDeleteCategory,
    downloadDocument,
    openPreview,
    openVersions,
    closeModal,
    addComment,
    assignDocument,
    updateWorkflowStatus,
    decideDocument,
    uploadVersion,
    shareDocument,
    resetDocumentsState,
  } = documentsApi;

  const {
    users,
    departments,
    loadAdminDomain,
    adminCreateUser,
    adminUpdateUser,
    adminResetPassword,
    adminDeleteUser,
    adminCreateDepartment,
    adminUpdateDepartment,
    adminDeleteDepartment,
    resetAdminState,
  } = adminApi;

  const {
    notifications,
    logs,
    loadNotifications,
    loadLogs,
    markNotificationRead,
    markAllNotificationsRead,
    resetNotificationsState,
  } = notificationsApi;

  const unreadNotifications = notifications.filter((item) => !item.isRead).length;
  const recentDocuments = dashboard.recentDocuments || [];

  useEffect(() => {
    if (!success) {
      return;
    }

    const timer = setTimeout(() => {
      setSuccess("");
    }, 2800);

    return () => clearTimeout(timer);
  }, [setSuccess, success]);

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
    onAfterMutateRef.current = loadAll;
  }, [loadAll]);

  useEffect(() => {
    if (token && user) {
      loadAll();
    }
  }, [token, user, loadAll]);

  const logout = useCallback(() => {
    authLogout();
    resetDocumentsState();
    resetAdminState();
    resetNotificationsState();
  }, [authLogout, resetAdminState, resetDocumentsState, resetNotificationsState]);

  const sortedDocuments = useMemo(() => {
    const sorted = [...documents].sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];

      if (sortBy === "createdAt" || sortBy === "updatedAt") {
        aVal = new Date(a[sortBy]);
        bVal = new Date(b[sortBy]);
      }

      if (typeof aVal === "string") {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [documents, sortBy, sortOrder]);

  const totalPages = Math.ceil(sortedDocuments.length / pageSize);
  const paginatedDocuments = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedDocuments.slice(start, start + pageSize);
  }, [sortedDocuments, currentPage, pageSize]);

  function dismissOnboarding() {
    localStorage.setItem("filetrack_onboarding_seen", "true");
    setShowOnboarding(false);
    showToast("Panduan ditutup. Anda dapat melihatnya kembali di menu.", "info");
  }

  async function refreshAll() {
    await loadAll();
    showToast("Data terbaru berhasil dimuat.");
  }

  if (!token || !user) {
    return (
      <LoginPage
        publicProofPoints={publicProofPoints}
        publicFeatures={publicFeatures}
        publicWorkflow={publicWorkflow}
        email={email}
        password={password}
        setEmail={setEmail}
        setPassword={setPassword}
        handleLogin={handleLogin}
        error={error}
        success={success}
      />
    );
  }

  return (
    <main className="app-shell">
      <Sidebar
        user={user}
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        documentsCount={documents.length}
        unreadNotifications={unreadNotifications}
        refreshAll={refreshAll}
        logout={logout}
      />

      <Topbar
        activeSection={activeSection}
        userName={user.name}
        unreadNotifications={unreadNotifications}
        markAllNotificationsRead={markAllNotificationsRead}
      />

      <div className="main-content">
        {activeSection === "home" ? (
          <HomeSection
            user={user}
            dashboard={dashboard}
            unreadNotifications={unreadNotifications}
            recentDocuments={recentDocuments}
            notifications={notifications}
            markNotificationRead={markNotificationRead}
            setActiveSection={setActiveSection}
            users={users}
            departments={departments}
            isAdmin={isAdmin}
            adminCreateUser={adminCreateUser}
            adminUpdateUser={adminUpdateUser}
            adminResetPassword={adminResetPassword}
            adminDeleteUser={adminDeleteUser}
            adminCreateDepartment={adminCreateDepartment}
            adminUpdateDepartment={adminUpdateDepartment}
            adminDeleteDepartment={adminDeleteDepartment}
          />
        ) : null}

        {activeSection === "documents" ? (
          <DocumentsSection
            canCreateDocuments={canCreateDocuments}
            canManageCategories={canManageCategories}
            uploadForm={uploadForm}
            setUploadForm={setUploadForm}
            handleUpload={handleUpload}
            categories={categories}
            newCategory={newCategory}
            setNewCategory={setNewCategory}
            createCategory={createCategory}
            adminUpdateCategory={adminUpdateCategory}
            adminDeleteCategory={adminDeleteCategory}
            resetFilters={resetFilters}
            searchDocuments={searchDocuments}
            query={query}
            setQuery={setQuery}
            categoryId={categoryId}
            setCategoryId={setCategoryId}
            dateFrom={dateFrom}
            setDateFrom={setDateFrom}
            dateTo={dateTo}
            setDateTo={setDateTo}
            paginatedDocuments={paginatedDocuments}
            sortedDocuments={sortedDocuments}
            currentPage={currentPage}
            totalPages={totalPages}
            setCurrentPage={setCurrentPage}
            openPreview={openPreview}
            openVersions={openVersions}
            downloadDocument={downloadDocument}
          />
        ) : null}

        {activeSection === "notifications" ? (
          <NotificationsSection
            notifications={notifications}
            markNotificationRead={markNotificationRead}
            isManagerLike={isManagerLike}
            logs={logs}
          />
        ) : null}

        {loading ? <p className="status-note">Memuat data...</p> : null}
        {error ? <p className="error-text status-note">{error}</p> : null}
        {success ? <p className="success-text status-note">{success}</p> : null}

        <footer className="app-footer">
          <span className="app-footer-brand">FileTrack System</span>
          <span className="app-footer-meta">© {new Date().getFullYear()} Secure workspace documents</span>
        </footer>

        <PreviewModal
          previewModal={previewModal}
          closeModal={closeModal}
          documentShares={documentShares}
          documentVersions={documentVersions}
          documentComments={documentComments}
          documentLogs={documentLogs}
          setVersionDrafts={setVersionDrafts}
          uploadVersion={uploadVersion}
          shareDrafts={shareDrafts}
          setShareDrafts={setShareDrafts}
          users={users}
          user={user}
          shareDocument={shareDocument}
          addComment={addComment}
          assignDocument={assignDocument}
          updateWorkflowStatus={updateWorkflowStatus}
          decideDocument={decideDocument}
        />

        <ToastContainer toasts={toasts} />

        <OnboardingOverlay
          showOnboarding={showOnboarding}
          token={token}
          activeSection={activeSection}
          dismissOnboarding={dismissOnboarding}
        />
      </div>
    </main>
  );
}

export default App;

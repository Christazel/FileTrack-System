import { useCallback, useEffect, useRef, useState } from "react";
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
  publicFeatures,
  publicProofPoints,
  publicWorkflow,
} from "./appDefaults";

import { useAdmin } from "./hooks/useAdmin";
import { useAppDataLoader } from "./hooks/useAppDataLoader";
import { useAuth } from "./hooks/useAuth";
import { useDocuments } from "./hooks/useDocuments";
import { useDocumentPagination } from "./hooks/useDocumentPagination";
import { useOnboarding } from "./hooks/useOnboarding";
import { useNotifications } from "./hooks/useNotifications";
import { useToasts } from "./hooks/useToasts";

import api from "./apiClient";

const DEFAULT_SORT_BY = "createdAt";
const DEFAULT_SORT_ORDER = "desc";

function App() {
  const [activeSection, setActiveSection] = useState("home");
  const sortBy = DEFAULT_SORT_BY;
  const sortOrder = DEFAULT_SORT_ORDER;

  const { toasts, showToast } = useToasts();

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

  const { showOnboarding, dismissOnboarding } = useOnboarding({ showToast });

  const {
    currentPage,
    setCurrentPage,
    sortedDocuments,
    totalPages,
    paginatedDocuments,
  } = useDocumentPagination({ documents, sortBy, sortOrder, initialPageSize: 10 });

  useEffect(() => {
    if (!success) {
      return;
    }

    const timer = setTimeout(() => {
      setSuccess("");
    }, 2800);

    return () => clearTimeout(timer);
  }, [setSuccess, success]);

  const { loading, refreshAll } = useAppDataLoader({
    token,
    user,
    onAfterMutateRef,
    loadDocumentsDomain,
    loadAdminDomain,
    loadNotifications,
    loadLogs,
    showToast,
  });

  const logout = useCallback(() => {
    authLogout();
    resetDocumentsState();
    resetAdminState();
    resetNotificationsState();
  }, [authLogout, resetAdminState, resetDocumentsState, resetNotificationsState]);

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

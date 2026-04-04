import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import LoginPage from "./components/LoginPage";
import Sidebar from "./components/layout/Sidebar";
import Topbar from "./components/layout/Topbar";
import HomeSection from "./components/sections/HomeSection";
import DocumentsSection from "./components/sections/DocumentsSection";
import NotificationsSection from "./components/sections/NotificationsSection";
import PreviewModal from "./components/modals/PreviewModal";
import ToastContainer from "./components/ui/ToastContainer";
import OnboardingOverlay from "./components/ui/OnboardingOverlay";

const api = axios.create({ baseURL: "/api" });

const emptyDocumentModal = {
  type: null,
  document: null,
  blobUrl: "",
};

const publicFeatures = [
  {
    title: "RBAC Aman",
    description: "Role admin, manager, dan staff dengan hak akses berbeda untuk setiap aksi penting.",
  },
  {
    title: "Search Cepat",
    description: "Cari berdasarkan nama, kategori, tanggal, atau tag dalam satu tampilan yang ringkas.",
  },
  {
    title: "Preview & Versioning",
    description: "Buka PDF langsung dari browser dan simpan revisi dokumen tanpa kehilangan histori.",
  },
  {
    title: "Share & Notifikasi",
    description: "Bagikan file ke user lain dan pantau semua aktivitas penting secara real time.",
  },
];

const publicProofPoints = [
  { label: "Upload maksimal", value: "10 MB" },
  { label: "Format didukung", value: "PDF, DOCX, XLSX" },
  { label: "Mode akses", value: "JWT + RBAC" },
];

const publicWorkflow = [
  "Login sesuai role",
  "Upload dan kategorikan dokumen",
  "Preview, share, dan revisi file",
  "Pantau log dan notifikasi",
];

function App() {
  const [token, setToken] = useState(localStorage.getItem("filetrack_token") || "");
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("filetrack_user");
    return raw ? JSON.parse(raw) : null;
  });
  const [email, setEmail] = useState("admin@filetrack.local");
  const [password, setPassword] = useState("Password123!");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const [dashboard, setDashboard] = useState({ totalDocuments: 0, totalUsers: 0, recentDocuments: [], uploadStats: [] });
  const [categories, setCategories] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [logs, setLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [notifications, setNotifications] = useState([]);

  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [newCategory, setNewCategory] = useState("");
  const [uploadForm, setUploadForm] = useState({ title: "", categoryId: "", tags: "", file: null });

  const [previewModal, setPreviewModal] = useState(emptyDocumentModal);
  const [versionDrafts, setVersionDrafts] = useState({});
  const [shareDrafts, setShareDrafts] = useState({});
  const [documentVersions, setDocumentVersions] = useState([]);
  const [documentShares, setDocumentShares] = useState([]);
  const [documentComments, setDocumentComments] = useState([]);
  const [activeSection, setActiveSection] = useState("home");

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");

  const [toasts, setToasts] = useState([]);
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem("filetrack_onboarding_seen"));

  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);
  const isManagerLike = user?.role === "ADMIN" || user?.role === "MANAGER";
  const canManageCategories = user?.role === "ADMIN";
  const canCreateDocuments = isManagerLike;
  const isAdmin = user?.role === "ADMIN";

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
  }, [success]);

  function resolveDocument(documentOrId) {
    if (typeof documentOrId === "object" && documentOrId) {
      return documentOrId;
    }

    return documents.find((document) => document.id === documentOrId) || { id: documentOrId };
  }

  async function loadData(activeToken = token) {
    if (!activeToken) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const authHeaders = { Authorization: `Bearer ${activeToken}` };
      const requests = [
        api.get("/dashboard/summary", { headers: authHeaders }),
        api.get("/categories", { headers: authHeaders }),
        api.get("/documents", { headers: authHeaders }),
        api.get("/users", { headers: authHeaders }),
        api.get("/departments", { headers: authHeaders }),
        api.get("/notifications", { headers: authHeaders }),
      ];

      if (isManagerLike) {
        requests.push(api.get("/logs", { headers: authHeaders }));
      }

      const results = await Promise.all(requests);
      const [dashboardRes, categoriesRes, documentsRes, usersRes, departmentsRes, notificationsRes, logsRes] = results;

      setDashboard(dashboardRes.data);
      setCategories(categoriesRes.data);
      setDocuments(documentsRes.data);
      setUsers(usersRes.data);
      setDepartments(departmentsRes.data);
      setNotifications(notificationsRes.data);
      setLogs(logsRes?.data?.items || []);
    } catch (requestError) {
      showToast(requestError.response?.data?.message || "Gagal mengambil data.", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token && user) {
      loadData(token);
    }
  }, [token, user?.role]);

  useEffect(() => {
    return () => {
      if (previewModal.blobUrl) {
        URL.revokeObjectURL(previewModal.blobUrl);
      }
    };
  }, [previewModal.blobUrl]);

  async function handleLogin(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    try {
      const response = await api.post("/auth/login", { email, password });
      const nextToken = response.data.token;
      const nextUser = response.data.user;

      localStorage.setItem("filetrack_token", nextToken);
      localStorage.setItem("filetrack_user", JSON.stringify(nextUser));

      setToken(nextToken);
      setUser(nextUser);
      showToast("Login berhasil.");
    } catch (requestError) {
      showToast(requestError.response?.data?.message || "Login gagal.", "error");
    }
  }

  function logout() {
    localStorage.removeItem("filetrack_token");
    localStorage.removeItem("filetrack_user");
    setToken("");
    setUser(null);
    setDocuments([]);
    setNotifications([]);
    setDashboard({ totalDocuments: 0, totalUsers: 0, recentDocuments: [], uploadStats: [] });
    setLogs([]);
    setDepartments([]);
    setPreviewModal(emptyDocumentModal);
  }

  async function adminCreateUser(payload) {
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
      await loadData();
    } catch (requestError) {
      showToast(requestError.response?.data?.message || "Gagal membuat user.", "error");
    }
  }

  async function adminUpdateUser(userId, payload) {
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
      await loadData();
    } catch (requestError) {
      showToast(requestError.response?.data?.message || "Gagal update user.", "error");
    }
  }

  async function adminResetPassword(userId) {
    try {
      await api.post(`/users/${userId}/reset-password`, {}, { headers });
      showToast("Password direset ke default (atau sesuai input backend).");
    } catch (requestError) {
      showToast(requestError.response?.data?.message || "Gagal reset password.", "error");
    }
  }

  async function adminDeleteUser(userId) {
    try {
      await api.delete(`/users/${userId}`, { headers });
      showToast("User dihapus.");
      await loadData();
    } catch (requestError) {
      showToast(requestError.response?.data?.message || "Gagal menghapus user.", "error");
    }
  }

  function showToast(message, type = "success") {
    const toastId = Date.now();
    const newToast = { id: toastId, message, type };
    setToasts((prev) => [...prev, newToast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toastId));
    }, 3000);
  }

  function handleSortClick(column) {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
    setCurrentPage(1);
  }

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

  async function searchDocuments() {
    const params = {
      ...(query ? { q: query } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(dateFrom ? { dateFrom } : {}),
      ...(dateTo ? { dateTo } : {}),
    };

    try {
      const response = await api.get("/documents", { headers, params });
      setDocuments(response.data);
    } catch (requestError) {
      showToast(requestError.response?.data?.message || "Pencarian gagal.", "error");
    }
  }

  async function handleUpload(event) {
    event.preventDefault();
    const formData = new FormData();
    formData.append("title", uploadForm.title);
    formData.append("categoryId", uploadForm.categoryId);
    formData.append("tags", uploadForm.tags);
    formData.append("file", uploadForm.file);

    try {
      await api.post("/documents", formData, {
        headers: {
          ...headers,
          "Content-Type": "multipart/form-data",
        },
      });

      setUploadForm({ title: "", categoryId: "", tags: "", file: null });
      showToast("Dokumen berhasil diunggah.");
      await loadData();
    } catch (requestError) {
      showToast(requestError.response?.data?.message || "Upload gagal.", "error");
    }
  }

  async function createCategory(event) {
    event.preventDefault();
    if (!newCategory.trim()) {
      return;
    }

    try {
      await api.post("/categories", { name: newCategory.trim() }, { headers });
      setNewCategory("");
      showToast("Kategori berhasil ditambahkan.");
      await loadData();
    } catch (requestError) {
      showToast(requestError.response?.data?.message || "Gagal membuat kategori.", "error");
    }
  }

  async function downloadDocument(id, originalName) {
    try {
      const response = await api.get(`/documents/${id}/download`, {
        headers,
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", originalName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showToast("Download berhasil.");
      await loadData();
    } catch (requestError) {
      showToast(requestError.response?.data?.message || "Gagal download dokumen.", "error");
    }
  }

  async function openPreview(doc) {
    if (previewModal.blobUrl) {
      URL.revokeObjectURL(previewModal.blobUrl);
    }

    if (doc.mimeType !== "application/pdf") {
      setPreviewModal({ type: "detail", document: doc, blobUrl: "" });
      return;
    }

    try {
      const response = await api.get(`/documents/${doc.id}/preview`, {
        headers,
        responseType: "blob",
      });
      const blobUrl = URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
      setPreviewModal({ type: "preview", document: doc, blobUrl });
    } catch (requestError) {
      showToast(requestError.response?.data?.message || "Gagal memuat preview.", "error");
    }
  }

  async function openVersions(doc) {
    const activeDocument = resolveDocument(doc);

    try {
      const [versionsRes, sharesRes, commentsRes] = await Promise.all([
        api.get(`/documents/${activeDocument.id}/versions`, { headers }),
        api.get(`/documents/${activeDocument.id}/shares`, { headers }),
        api.get(`/documents/${activeDocument.id}/comments`, { headers }),
      ]);
      setDocumentVersions(versionsRes.data);
      setDocumentShares(sharesRes.data);
      setDocumentComments(commentsRes.data);
      setPreviewModal({ type: "versions", document: activeDocument, blobUrl: "" });
    } catch (requestError) {
      showToast(requestError.response?.data?.message || "Gagal memuat versi dokumen.", "error");
    }
  }

  async function addComment(docId, message) {
    if (!message?.trim()) {
      showToast("Komentar tidak boleh kosong.", "error");
      return;
    }

    try {
      await api.post(
        `/documents/${docId}/comments`,
        { message: message.trim() },
        { headers },
      );
      showToast("Komentar ditambahkan.");
      await loadData();
      await openVersions(docId);
    } catch (requestError) {
      showToast(requestError.response?.data?.message || "Gagal menambah komentar.", "error");
    }
  }

  async function assignDocument(docId, assignedToId) {
    if (!assignedToId) {
      showToast("Pilih staff terlebih dahulu.", "error");
      return;
    }

    try {
      await api.patch(
        `/documents/${docId}/assign`,
        { assignedToId: Number(assignedToId) },
        { headers },
      );
      showToast("Dokumen berhasil di-assign.");
      await loadData();
      await openVersions(docId);
    } catch (requestError) {
      showToast(requestError.response?.data?.message || "Gagal assign dokumen.", "error");
    }
  }

  async function updateWorkflowStatus(docId, workflowStatus) {
    if (!workflowStatus) {
      showToast("Pilih status terlebih dahulu.", "error");
      return;
    }

    try {
      await api.patch(
        `/documents/${docId}/status`,
        { workflowStatus },
        { headers },
      );
      showToast("Status diperbarui.");
      await loadData();
      await openVersions(docId);
    } catch (requestError) {
      showToast(requestError.response?.data?.message || "Gagal update status.", "error");
    }
  }

  async function decideDocument(docId, approvalStatus, note) {
    try {
      await api.post(
        `/documents/${docId}/decision`,
        { approvalStatus, ...(note ? { note } : {}) },
        { headers },
      );
      showToast("Keputusan tersimpan.");
      await loadData();
      await openVersions(docId);
    } catch (requestError) {
      showToast(requestError.response?.data?.message || "Gagal menyimpan keputusan.", "error");
    }
  }

  async function uploadVersion(docId) {
    const draft = versionDrafts[docId];
    if (!draft?.file) {
      showToast("Pilih file versi baru terlebih dahulu.", "error");
      return;
    }

    const formData = new FormData();
    formData.append("file", draft.file);

    try {
      await api.post(`/documents/${docId}/versions`, formData, {
        headers: {
          ...headers,
          "Content-Type": "multipart/form-data",
        },
      });
      setVersionDrafts((current) => ({ ...current, [docId]: { file: null } }));
      showToast("Versi baru berhasil ditambahkan.");
      await loadData();
      await openVersions(docId);
    } catch (requestError) {
      showToast(requestError.response?.data?.message || "Gagal menambah versi.", "error");
    }
  }

  async function shareDocument(docId) {
    const draft = shareDrafts[docId];
    if (!draft?.sharedToId) {
      showToast("Pilih user tujuan terlebih dahulu.", "error");
      return;
    }

    try {
      await api.post(
        `/documents/${docId}/share`,
        {
          sharedToId: Number(draft.sharedToId),
          message: draft.message || "",
        },
        { headers },
      );
      setShareDrafts((current) => ({ ...current, [docId]: { sharedToId: "", message: "" } }));
      showToast("Dokumen berhasil dibagikan.");
      await loadData();
      await openVersions(docId);
    } catch (requestError) {
      showToast(requestError.response?.data?.message || "Gagal membagikan dokumen.", "error");
    }
  }

  async function markNotificationRead(notificationId) {
    try {
      await api.patch(`/notifications/${notificationId}/read`, {}, { headers });
      await loadData();
    } catch (requestError) {
      showToast(requestError.response?.data?.message || "Gagal memperbarui notifikasi.", "error");
    }
  }

  async function markAllNotificationsRead() {
    try {
      await api.patch("/notifications/read-all", {}, { headers });
      await loadData();
    } catch (requestError) {
      showToast(requestError.response?.data?.message || "Gagal menandai notifikasi.", "error");
    }
  }

  async function refreshAll() {
    await loadData();
    showToast("Data terbaru berhasil dimuat.");
  }

  function resetFilters() {
    setQuery("");
    setCategoryId("");
    setDateFrom("");
    setDateTo("");
  }

  const closeModal = () => {
    if (previewModal.blobUrl) {
      URL.revokeObjectURL(previewModal.blobUrl);
    }
    setPreviewModal(emptyDocumentModal);
    setDocumentVersions([]);
    setDocumentShares([]);
    setDocumentComments([]);
  };

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
          />
        ) : null}

        {activeSection === "documents" ? (
          <DocumentsSection
            isManagerLike={isManagerLike}
            canCreateDocuments={canCreateDocuments}
            canManageCategories={canManageCategories}
            uploadForm={uploadForm}
            setUploadForm={setUploadForm}
            handleUpload={handleUpload}
            categories={categories}
            newCategory={newCategory}
            setNewCategory={setNewCategory}
            createCategory={createCategory}
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
          versionDrafts={versionDrafts}
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

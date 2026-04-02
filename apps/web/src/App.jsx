import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import dayjs from "dayjs";

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
  const [activeSection, setActiveSection] = useState("home");

  // Pagination and sorting
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");

  // Toast notifications
  const [toasts, setToasts] = useState([]);

  // Onboarding
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem("filetrack_onboarding_seen"));

  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);
  const isManagerLike = user?.role === "ADMIN" || user?.role === "MANAGER";

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
        api.get("/notifications", { headers: authHeaders }),
      ];

      if (isManagerLike) {
        requests.push(api.get("/logs", { headers: authHeaders }));
      }

      const results = await Promise.all(requests);
      const [dashboardRes, categoriesRes, documentsRes, usersRes, notificationsRes, logsRes] = results;

      setDashboard(dashboardRes.data);
      setCategories(categoriesRes.data);
      setDocuments(documentsRes.data);
      setUsers(usersRes.data);
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
    setPreviewModal(emptyDocumentModal);
  }

  // Helper: Show toast notification
  function showToast(message, type = "success") {
    const toastId = Date.now();
    const newToast = { id: toastId, message, type };
    setToasts((prev) => [...prev, newToast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toastId));
    }, 3000);
  }

  // Helper: Handle sort column click
  function handleSortClick(column) {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
    setCurrentPage(1);
  }

  // Helper: Get sorted and paginated documents
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

  // Helper: Dismiss onboarding
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
      const [versionsRes, sharesRes] = await Promise.all([
        api.get(`/documents/${activeDocument.id}/versions`, { headers }),
        api.get(`/documents/${activeDocument.id}/shares`, { headers }),
      ]);
      setDocumentVersions(versionsRes.data);
      setDocumentShares(sharesRes.data);
      setPreviewModal({ type: "versions", document: activeDocument, blobUrl: "" });
    } catch (requestError) {
      showToast(requestError.response?.data?.message || "Gagal memuat versi dokumen.", "error");
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
  };

  if (!token || !user) {
    return (
      <main className="login-layout">
        <section className="landing-shell">
          <div className="landing-grid">
            <article className="landing-hero panel hero-card">
              <div className="hero-copy">
                <p className="eyebrow">FileTrack System</p>
                <h1>Document management yang terlihat siap dipakai perusahaan.</h1>
                <p className="subtext">
                  FileTrack System menyatukan upload, search cepat, preview PDF, versioning, sharing, notifikasi, dan role management dalam satu pengalaman yang rapi.
                </p>
                <div className="proof-strip">
                  {publicProofPoints.map((item) => (
                    <div key={item.label} className="proof-item">
                      <small>{item.label}</small>
                      <strong>{item.value}</strong>
                    </div>
                  ))}
                </div>
              </div>
              <div className="feature-grid">
                {publicFeatures.map((feature) => (
                  <article key={feature.title} className="feature-card">
                    <span className="feature-dot" />
                    <h3>{feature.title}</h3>
                    <p>{feature.description}</p>
                  </article>
                ))}
              </div>
            </article>

            <aside className="login-card auth-card">
              <div className="auth-badge">Secure access</div>
              <h2>Masuk ke dashboard</h2>
              <p className="subtext">Gunakan akun demo untuk melihat role, log aktivitas, dan panel notifikasi.</p>
              <form onSubmit={handleLogin} className="form-grid auth-form">
                <label>
                  Email
                  <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
                </label>
                <label>
                  Password
                  <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
                </label>
                <button type="submit">Masuk ke Dashboard</button>
              </form>
              <div className="demo-box">
                <strong>Demo accounts</strong>
                <ul>
                  <li>admin@filetrack.local</li>
                  <li>manager@filetrack.local</li>
                  <li>staff@filetrack.local</li>
                </ul>
                <p>Password: Password123!</p>
              </div>
              {error ? <p className="error-text">{error}</p> : null}
              {success ? <p className="success-text">{success}</p> : null}
            </aside>
          </div>

          <section className="landing-band panel">
            <div>
              <p className="eyebrow">How it works</p>
              <h3>Alur yang mudah dipresentasikan.</h3>
            </div>
            <div className="workflow-grid">
              {publicWorkflow.map((step, index) => (
                <div key={step} className="workflow-step">
                  <span>0{index + 1}</span>
                  <p>{step}</p>
                </div>
              ))}
            </div>
          </section>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar premium-topbar">
        <div>
          <p className="eyebrow">FileTrack System</p>
          <h2>Welcome back, {user.name}</h2>
          <p className="subtext">Role: {user.role} • {dayjs().format("DD MMM YYYY")}</p>
        </div>
        <div className="topbar-actions">
          <button className="ghost-btn" type="button" onClick={refreshAll}>Refresh</button>
          <button className="ghost-btn bell-btn" type="button" onClick={markAllNotificationsRead}>
            Notif {unreadNotifications ? `(${unreadNotifications})` : ""}
          </button>
          <button onClick={logout} className="ghost-btn" type="button">Logout</button>
        </div>
      </header>

      <section className="section-nav panel">
        <button type="button" className={activeSection === "home" ? "tab-btn active" : "tab-btn"} onClick={() => setActiveSection("home")}>
          Beranda
        </button>
        <button type="button" className={activeSection === "documents" ? "tab-btn active" : "tab-btn"} onClick={() => setActiveSection("documents")}>
          Dokumen ({documents.length})
        </button>
        <button type="button" className={activeSection === "notifications" ? "tab-btn active" : "tab-btn"} onClick={() => setActiveSection("notifications")}>
          Notifikasi {unreadNotifications ? `(${unreadNotifications})` : ""}
        </button>
      </section>

      {activeSection === "home" ? (
        <>
          <section className="hero-banner panel">
            <div>
              <p className="eyebrow">Operational Overview</p>
              <h1>Ruang kerja dokumen yang fokus ke aksi penting.</h1>
              <p className="subtext">Mulai dari Beranda untuk melihat prioritas harian, lalu masuk ke menu Dokumen atau Notifikasi saat butuh aksi detail.</p>
            </div>
            <div className="hero-stats">
              <div><span>{dashboard.totalDocuments}</span><small>Dokumen</small></div>
              <div><span>{dashboard.totalUsers}</span><small>User</small></div>
              <div><span>{unreadNotifications}</span><small>Notif baru</small></div>
            </div>
          </section>

          <section className="stats-grid">
            <article className="stat-card accent-card">
              <p>Total Dokumen</p>
              <strong>{dashboard.totalDocuments}</strong>
              <span>Semua file aktif di sistem.</span>
            </article>
            <article className="stat-card accent-card secondary">
              <p>Total Pengguna</p>
              <strong>{dashboard.totalUsers}</strong>
              <span>Akun yang dapat mengakses workspace.</span>
            </article>
            <article className="stat-card accent-card tertiary">
              <p>Dokumen Terbaru</p>
              <strong>{recentDocuments.length}</strong>
              <span>Prioritas untuk direview hari ini.</span>
            </article>
          </section>

          <section className="dashboard-grid">
            <div className="stack-col">
              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">Recent Activity</p>
                    <h3>Dokumen terbaru</h3>
                  </div>
                  <button type="button" className="ghost-btn" onClick={() => setActiveSection("documents")}>Buka menu dokumen</button>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Judul</th>
                        <th>Kategori</th>
                        <th>Uploader</th>
                        <th>Tanggal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentDocuments.length ? recentDocuments.map((doc) => (
                        <tr key={doc.id}>
                          <td>{doc.title}</td>
                          <td>{doc.category?.name || "-"}</td>
                          <td>{doc.uploadedBy?.name || "-"}</td>
                          <td>{dayjs(doc.createdAt).format("DD MMM YYYY HH:mm")}</td>
                        </tr>
                      )) : (
                        <tr><td colSpan="4" className="empty-cell">Belum ada dokumen terbaru.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>

            <aside className="stack-col side-col">
              <section className="panel notifications-panel">
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">Quick Inbox</p>
                    <h3>Notifikasi penting</h3>
                  </div>
                  <button type="button" className="ghost-btn" onClick={() => setActiveSection("notifications")}>Lihat semua</button>
                </div>
                <div className="notification-list">
                  {notifications.slice(0, 5).length ? notifications.slice(0, 5).map((item) => (
                    <button key={item.id} type="button" className={`notification-item ${item.isRead ? "read" : "unread"}`} onClick={() => markNotificationRead(item.id)}>
                      <strong>{item.title}</strong>
                      <span>{item.detail || "-"}</span>
                      <small>{dayjs(item.createdAt).format("DD MMM HH:mm")}</small>
                    </button>
                  )) : <div className="notification-item static"><strong>Belum ada notifikasi.</strong></div>}
                </div>
              </section>
            </aside>
          </section>
        </>
      ) : null}

      {activeSection === "documents" ? (
        <section className="dashboard-grid">
          <div className="stack-col">
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Upload</p>
                  <h3>Tambah dokumen baru</h3>
                </div>
              </div>
              <form className="form-inline upload-form" onSubmit={handleUpload}>
                <input placeholder="Judul dokumen" value={uploadForm.title} onChange={(e) => setUploadForm((p) => ({ ...p, title: e.target.value }))} required />
                <select value={uploadForm.categoryId} onChange={(e) => setUploadForm((p) => ({ ...p, categoryId: e.target.value }))} required>
                  <option value="">Pilih kategori</option>
                  {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
                <input placeholder="Tag, pisahkan koma" value={uploadForm.tags} onChange={(e) => setUploadForm((p) => ({ ...p, tags: e.target.value }))} />
                <input type="file" onChange={(e) => setUploadForm((p) => ({ ...p, file: e.target.files?.[0] || null }))} required />
                <button type="submit">Upload</button>
              </form>
            </section>

            {isManagerLike ? (
              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">Kategori</p>
                    <h3>Manajemen kategori</h3>
                  </div>
                </div>
                <form className="form-inline compact-form" onSubmit={createCategory}>
                  <input placeholder="Kategori baru" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} />
                  <button type="submit">Tambah</button>
                </form>
              </section>
            ) : null}

            <section className="panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Search</p>
                  <h3>Pencarian dokumen</h3>
                </div>
                <div className="action-row">
                  <button type="button" className="ghost-btn" onClick={resetFilters}>Reset filter</button>
                  <button type="button" onClick={searchDocuments}>Cari</button>
                </div>
              </div>
              <div className="form-inline search-form">
                <input placeholder="Cari nama file, judul, tag" value={query} onChange={(e) => setQuery(e.target.value)} />
                <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                  <option value="">Semua kategori</option>
                  {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </div>
            </section>

            <section className="panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Dokumen</p>
                  <h3>Daftar dokumen</h3>
                </div>
                <span className="chip">Preview PDF • Versioning • Share</span>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th style={{ cursor: "pointer" }} onClick={() => handleSortClick("title")}>
                        Judul {sortBy === "title" ? (sortOrder === "asc" ? "↑" : "↓") : ""}
                      </th>
                      <th>File</th>
                      <th>Kategori</th>
                      <th>Versi</th>
                      <th>Tag</th>
                      <th>Uploader</th>
                      <th style={{ cursor: "pointer" }} onClick={() => handleSortClick("createdAt")}>
                        Tanggal {sortBy === "createdAt" ? (sortOrder === "asc" ? "↑" : "↓") : ""}
                      </th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedDocuments.length ? paginatedDocuments.map((doc) => (
                      <tr key={doc.id}>
                        <td>{doc.title}</td>
                        <td>{doc.originalName}</td>
                        <td><span className="chip soft">{doc.category?.name}</span></td>
                        <td>v{doc.currentVersion || doc.versions?.[0]?.versionNumber || 1}</td>
                        <td>{doc.tags?.map((tag) => tag.name).join(", ") || "-"}</td>
                        <td>{doc.uploadedBy?.name}</td>
                        <td>{dayjs(doc.createdAt).format("DD MMM YYYY HH:mm")}</td>
                        <td>
                          <div className="row-actions">
                            {doc.mimeType === "application/pdf" ? (
                              <button type="button" onClick={() => openPreview(doc)}>Preview</button>
                            ) : null}
                            <button type="button" className="ghost-btn" onClick={() => openVersions(doc)}>Versi</button>
                            <button type="button" className="ghost-btn" onClick={() => downloadDocument(doc.id, doc.originalName)}>Download</button>
                          </div>
                        </td>
                      </tr>
                    )) : <tr><td colSpan="8" className="empty-cell">Belum ada dokumen. Mulai dari upload dokumen baru.</td></tr>}
                  </tbody>
                </table>
              </div>
              {sortedDocuments.length > 0 ? (
                <div className="pagination-controls">
                  <button type="button" className="ghost-btn" onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1}>Sebelumnya</button>
                  <span className="page-info">Halaman {currentPage} dari {totalPages} • Menampilkan {paginatedDocuments.length} dari {sortedDocuments.length} dokumen</span>
                  <button type="button" className="ghost-btn" onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}>Selanjutnya</button>
                </div>
              ) : null}
            </section>
          </div>

          <aside className="stack-col side-col">
            <section className="panel notifications-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Tips</p>
                  <h3>Alur rekomendasi</h3>
                </div>
              </div>
              <div className="notification-list">
                <div className="notification-item static"><strong>1. Upload</strong><span>Isi judul, kategori, tag, lalu upload file.</span></div>
                <div className="notification-item static"><strong>2. Review</strong><span>Gunakan preview PDF sebelum dibagikan ke tim.</span></div>
                <div className="notification-item static"><strong>3. Revisi</strong><span>Tambahkan versi baru agar riwayat tetap tercatat.</span></div>
                <div className="notification-item static"><strong>4. Share</strong><span>Bagikan ke user terkait dan pantau notifikasi.</span></div>
              </div>
            </section>
          </aside>
        </section>
      ) : null}

      {activeSection === "notifications" ? (
        <section className="dashboard-grid single-view-grid">
          <div className="stack-col">
            <section className="panel notifications-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Notifications</p>
                  <h3>Notifikasi terbaru</h3>
                </div>
              </div>
              <div className="notification-list">
                {notifications.length ? notifications.map((item) => (
                  <button key={item.id} type="button" className={`notification-item ${item.isRead ? "read" : "unread"}`} onClick={() => markNotificationRead(item.id)}>
                    <strong>{item.title}</strong>
                    <span>{item.detail || "-"}</span>
                    <small>{dayjs(item.createdAt).format("DD MMM YYYY HH:mm")}</small>
                  </button>
                )) : <div className="notification-item static"><strong>Tidak ada notifikasi.</strong><span>Notifikasi akan muncul setelah upload/share dokumen.</span></div>}
              </div>
            </section>

            {isManagerLike ? (
              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">Activity</p>
                    <h3>Log sistem</h3>
                  </div>
                </div>
                <div className="notification-list logs-list">
                  {logs.length ? logs.map((item) => (
                    <div key={item.id} className="notification-item static">
                      <strong>{item.action}</strong>
                      <span>{item.detail || "-"}</span>
                      <small>{item.user?.name} • {dayjs(item.timestamp).format("DD MMM HH:mm")}</small>
                    </div>
                  )) : <div className="notification-item static"><strong>Belum ada log aktivitas.</strong></div>}
                </div>
              </section>
            ) : null}
          </div>
        </section>
      ) : null}

      {loading ? <p className="status-note">Memuat data...</p> : null}
      {error ? <p className="error-text status-note">{error}</p> : null}
      {success ? <p className="success-text status-note">{success}</p> : null}

      {previewModal.type ? (
        <div className="modal-backdrop" onClick={closeModal} role="presentation">
          <section className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p className="eyebrow">{previewModal.type === "preview" ? "Preview PDF" : previewModal.type === "versions" ? "Versioning" : "Detail"}</p>
                <h3>{previewModal.document?.title}</h3>
              </div>
              <button className="ghost-btn" type="button" onClick={closeModal}>Tutup</button>
            </div>

            {previewModal.type === "preview" ? (
              <iframe className="preview-frame" title="PDF preview" src={previewModal.blobUrl} />
            ) : null}

            {previewModal.type === "detail" ? (
              <div className="detail-grid">
                <div><span>File</span><strong>{previewModal.document?.originalName}</strong></div>
                <div><span>Kategori</span><strong>{previewModal.document?.category?.name}</strong></div>
                <div><span>Versi</span><strong>v{previewModal.document?.currentVersion || 1}</strong></div>
                <div><span>Uploader</span><strong>{previewModal.document?.uploadedBy?.name}</strong></div>
              </div>
            ) : null}

            {previewModal.type === "versions" ? (
              <div className="modal-stack">
                <div className="detail-grid compact">
                  <div><span>File</span><strong>{previewModal.document?.originalName}</strong></div>
                  <div><span>Kategori</span><strong>{previewModal.document?.category?.name}</strong></div>
                  <div><span>Versi sekarang</span><strong>v{previewModal.document?.currentVersion || 1}</strong></div>
                  <div><span>Share</span><strong>{documentShares.length} kali</strong></div>
                </div>

                <section className="subpanel">
                  <h4>Tambah versi baru</h4>
                  <div className="form-inline version-form">
                    <input
                      type="file"
                      onChange={(e) =>
                        setVersionDrafts((current) => ({
                          ...current,
                          [previewModal.document.id]: { file: e.target.files?.[0] || null },
                        }))
                      }
                    />
                    <button type="button" onClick={() => uploadVersion(previewModal.document.id)}>Upload versi</button>
                  </div>
                </section>

                <section className="subpanel">
                  <h4>Share ke user</h4>
                  <div className="form-inline share-form">
                    <select
                      value={shareDrafts[previewModal.document.id]?.sharedToId || ""}
                      onChange={(e) =>
                        setShareDrafts((current) => ({
                          ...current,
                          [previewModal.document.id]: {
                            ...(current[previewModal.document.id] || {}),
                            sharedToId: e.target.value,
                          },
                        }))
                      }
                    >
                      <option value="">Pilih user</option>
                      {users
                        .filter((candidate) => candidate.id !== user.id)
                        .map((candidate) => (
                          <option key={candidate.id} value={candidate.id}>
                            {candidate.name} • {candidate.role}
                          </option>
                        ))}
                    </select>
                    <input
                      placeholder="Pesan share"
                      value={shareDrafts[previewModal.document.id]?.message || ""}
                      onChange={(e) =>
                        setShareDrafts((current) => ({
                          ...current,
                          [previewModal.document.id]: {
                            ...(current[previewModal.document.id] || {}),
                            message: e.target.value,
                          },
                        }))
                      }
                    />
                    <button type="button" onClick={() => shareDocument(previewModal.document.id)}>Share</button>
                  </div>
                </section>

                <section className="subpanel timeline-box">
                  <h4>Riwayat versi</h4>
                  <div className="timeline-list">
                    {documentVersions.map((version) => (
                      <div key={version.id} className="timeline-item">
                        <strong>v{version.versionNumber}</strong>
                        <span>{version.originalName}</span>
                        <small>{version.uploadedBy?.name} • {dayjs(version.createdAt).format("DD MMM YYYY HH:mm")}</small>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="subpanel timeline-box">
                  <h4>Riwayat share</h4>
                  <div className="timeline-list">
                    {documentShares.map((share) => (
                      <div key={share.id} className="timeline-item">
                        <strong>{share.sharedTo?.name}</strong>
                        <span>{share.message || "Tanpa pesan"}</span>
                        <small>{share.sharedBy?.name} • {dayjs(share.createdAt).format("DD MMM YYYY HH:mm")}</small>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            ) : null}
          </section>
        </div>
      ) : null}

      {/* Toast Notifications Container */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            {toast.message}
          </div>
        ))}
      </div>

      {/* Onboarding Overlay */}
      {showOnboarding && token && activeSection === "documents" ? (
        <div className="onboarding-overlay">
          <div className="onboarding-card">
            <div className="onboarding-header">
              <h2>👋 Selamat datang di FileTrack!</h2>
              <button type="button" className="ghost-btn close-onboarding" onClick={dismissOnboarding}>✕</button>
            </div>
            <div className="onboarding-steps">
              <div className="onboarding-step">
                <span className="step-number">1</span>
                <div>
                  <strong>Upload Dokumen</strong>
                  <p>Isi judul, pilih kategori, dan upload file PDF/DOCX/XLSX Anda.</p>
                </div>
              </div>
              <div className="onboarding-step">
                <span className="step-number">2</span>
                <div>
                  <strong>Cari & Filter</strong>
                  <p>Gunakan kolom pencarian untuk menemukan dokumen berdasarkan nama, kategori, atau tanggal.</p>
                </div>
              </div>
              <div className="onboarding-step">
                <span className="step-number">3</span>
                <div>
                  <strong>Preview & Versi</strong>
                  <p>Lihat PDF langsung dan kelola versioning untuk melacak perubahan file.</p>
                </div>
              </div>
              <div className="onboarding-step">
                <span className="step-number">4</span>
                <div>
                  <strong>Bagikan ke Tim</strong>
                  <p>Klik Versi untuk berbagi dokumen dengan rekan kerja dan kirim pesan.</p>
                </div>
              </div>
            </div>
            <button type="button" onClick={dismissOnboarding}>Mengerti!</button>
          </div>
        </div>
      ) : null}
    </main>
  );
}

export default App;

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import dayjs from "dayjs";

const api = axios.create({ baseURL: "/api" });

const emptyDocumentModal = {
  type: null,
  document: null,
  blobUrl: "",
};

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

  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);
  const isManagerLike = user?.role === "ADMIN" || user?.role === "MANAGER";

  const unreadNotifications = notifications.filter((item) => !item.isRead).length;

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
      setError(requestError.response?.data?.message || "Gagal mengambil data.");
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
      setSuccess("Login berhasil.");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Login gagal.");
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
      setError(requestError.response?.data?.message || "Pencarian gagal.");
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
      setSuccess("Dokumen berhasil diunggah.");
      await loadData();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Upload gagal.");
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
      setSuccess("Kategori berhasil ditambahkan.");
      await loadData();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Gagal membuat kategori.");
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
      setSuccess("Download berhasil.");
      await loadData();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Gagal download dokumen.");
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
      setError(requestError.response?.data?.message || "Gagal memuat preview.");
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
      setError(requestError.response?.data?.message || "Gagal memuat versi dokumen.");
    }
  }

  async function uploadVersion(docId) {
    const draft = versionDrafts[docId];
    if (!draft?.file) {
      setError("Pilih file versi baru terlebih dahulu.");
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
      setSuccess("Versi baru berhasil ditambahkan.");
      await loadData();
      await openVersions(docId);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Gagal menambah versi.");
    }
  }

  async function shareDocument(docId) {
    const draft = shareDrafts[docId];
    if (!draft?.sharedToId) {
      setError("Pilih user tujuan terlebih dahulu.");
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
      setSuccess("Dokumen berhasil dibagikan.");
      await loadData();
      await openVersions(docId);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Gagal membagikan dokumen.");
    }
  }

  async function markNotificationRead(notificationId) {
    try {
      await api.patch(`/notifications/${notificationId}/read`, {}, { headers });
      await loadData();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Gagal memperbarui notifikasi.");
    }
  }

  async function markAllNotificationsRead() {
    try {
      await api.patch("/notifications/read-all", {}, { headers });
      await loadData();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Gagal menandai notifikasi.");
    }
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
        <section className="login-card hero-card">
          <div className="hero-copy">
            <p className="eyebrow">FileTrack System</p>
            <h1>Document control yang rapi, cepat, dan aman.</h1>
            <p className="subtext">
              Login berbasis role, upload dokumen, preview PDF, versioning, share antar user, dan notifikasi dalam satu dashboard.
            </p>
          </div>
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
          {error ? <p className="error-text">{error}</p> : null}
          {success ? <p className="success-text">{success}</p> : null}
          <p className="hint">Demo akun: admin@filetrack.local / Password123!</p>
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
          <button className="ghost-btn bell-btn" type="button" onClick={markAllNotificationsRead}>
            Notif {unreadNotifications ? `(${unreadNotifications})` : ""}
          </button>
          <button onClick={logout} className="ghost-btn" type="button">Logout</button>
        </div>
      </header>

      <section className="hero-banner panel">
        <div>
          <p className="eyebrow">Operational Overview</p>
          <h1>Arsip digital yang siap demo, audit, dan dipakai harian.</h1>
          <p className="subtext">Kelola dokumen, pantau aktivitas, bagikan file antar user, dan buka PDF langsung dari dashboard.</p>
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
          <span>Semua file yang tersimpan aktif.</span>
        </article>
        <article className="stat-card accent-card secondary">
          <p>Total Pengguna</p>
          <strong>{dashboard.totalUsers}</strong>
          <span>Admin, manager, dan staff.</span>
        </article>
        <article className="stat-card accent-card tertiary">
          <p>Dokumen Terbaru</p>
          <strong>{dashboard.recentDocuments.length}</strong>
          <span>Masuk pada feed terbaru.</span>
        </article>
      </section>

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
              <button type="button" onClick={searchDocuments}>Cari</button>
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
                    <th>Judul</th>
                    <th>File</th>
                    <th>Kategori</th>
                    <th>Versi</th>
                    <th>Tag</th>
                    <th>Uploader</th>
                    <th>Tanggal</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => (
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
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <aside className="stack-col side-col">
          <section className="panel notifications-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Notifications</p>
                <h3>Notifikasi terbaru</h3>
              </div>
            </div>
            <div className="notification-list">
              {notifications.map((item) => (
                <button key={item.id} type="button" className={`notification-item ${item.isRead ? "read" : "unread"}`} onClick={() => markNotificationRead(item.id)}>
                  <strong>{item.title}</strong>
                  <span>{item.detail || "-"}</span>
                  <small>{dayjs(item.createdAt).format("DD MMM HH:mm")}</small>
                </button>
              ))}
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
                {logs.map((item) => (
                  <div key={item.id} className="notification-item static">
                    <strong>{item.action}</strong>
                    <span>{item.detail || "-"}</span>
                    <small>{item.user?.name} • {dayjs(item.timestamp).format("DD MMM HH:mm")}</small>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </aside>
      </section>

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
    </main>
  );
}

export default App;

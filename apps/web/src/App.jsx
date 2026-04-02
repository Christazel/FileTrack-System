import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import dayjs from "dayjs";

const api = axios.create({
  baseURL: "/api",
});

function App() {
  const [token, setToken] = useState(localStorage.getItem("filetrack_token") || "");
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("filetrack_user");
    return raw ? JSON.parse(raw) : null;
  });
  const [email, setEmail] = useState("admin@filetrack.local");
  const [password, setPassword] = useState("Password123!");
  const [error, setError] = useState("");

  const [dashboard, setDashboard] = useState({ totalDocuments: 0, totalUsers: 0, recentDocuments: [], uploadStats: [] });
  const [categories, setCategories] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [logs, setLogs] = useState([]);

  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [newCategory, setNewCategory] = useState("");
  const [uploadForm, setUploadForm] = useState({ title: "", categoryId: "", tags: "", file: null });
  const [loading, setLoading] = useState(false);

  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);
  const isManagerLike = user?.role === "ADMIN" || user?.role === "MANAGER";

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
      ];

      if (isManagerLike) {
        requests.push(api.get("/logs", { headers: authHeaders }));
      }

      const [dashboardRes, categoriesRes, documentsRes, logsRes] = await Promise.all(requests);
      setDashboard(dashboardRes.data);
      setCategories(categoriesRes.data);
      setDocuments(documentsRes.data);
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

  async function handleLogin(event) {
    event.preventDefault();
    setError("");

    try {
      const response = await api.post("/auth/login", { email, password });
      const nextToken = response.data.token;
      const nextUser = response.data.user;

      localStorage.setItem("filetrack_token", nextToken);
      localStorage.setItem("filetrack_user", JSON.stringify(nextUser));

      setToken(nextToken);
      setUser(nextUser);
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
    setDashboard({ totalDocuments: 0, totalUsers: 0, recentDocuments: [], uploadStats: [] });
    setLogs([]);
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
      await api.post(
        "/categories",
        { name: newCategory.trim() },
        {
          headers,
        },
      );
      setNewCategory("");
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
      await loadData();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Gagal download dokumen.");
    }
  }

  if (!token || !user) {
    return (
      <main className="login-layout">
        <section className="login-card">
          <p className="eyebrow">FileTrack System</p>
          <h1>Digital Document Hub</h1>
          <p className="subtext">Login sesuai role untuk mengelola arsip perusahaan tanpa kertas.</p>
          <form onSubmit={handleLogin} className="form-grid">
            <label>
              Email
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
            </label>
            <label>
              Password
              <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
            </label>
            <button type="submit">Masuk</button>
          </form>
          {error ? <p className="error-text">{error}</p> : null}
          <p className="hint">Demo akun: admin@filetrack.local / Password123!</p>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">FileTrack System</p>
          <h2>Halo, {user.name}</h2>
          <p className="subtext">Role: {user.role}</p>
        </div>
        <button onClick={logout} className="ghost-btn">Logout</button>
      </header>

      <section className="stats-grid">
        <article className="stat-card">
          <p>Total Dokumen</p>
          <strong>{dashboard.totalDocuments}</strong>
        </article>
        <article className="stat-card">
          <p>Total Pengguna</p>
          <strong>{dashboard.totalUsers}</strong>
        </article>
        <article className="stat-card">
          <p>Dokumen Terbaru</p>
          <strong>{dashboard.recentDocuments.length}</strong>
        </article>
      </section>

      <section className="panel">
        <h3>Upload Dokumen</h3>
        <form className="form-inline" onSubmit={handleUpload}>
          <input
            placeholder="Judul dokumen"
            value={uploadForm.title}
            onChange={(e) => setUploadForm((p) => ({ ...p, title: e.target.value }))}
            required
          />
          <select
            value={uploadForm.categoryId}
            onChange={(e) => setUploadForm((p) => ({ ...p, categoryId: e.target.value }))}
            required
          >
            <option value="">Pilih kategori</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
          <input
            placeholder="Tag, pisahkan koma"
            value={uploadForm.tags}
            onChange={(e) => setUploadForm((p) => ({ ...p, tags: e.target.value }))}
          />
          <input
            type="file"
            onChange={(e) => setUploadForm((p) => ({ ...p, file: e.target.files?.[0] || null }))}
            required
          />
          <button type="submit">Upload</button>
        </form>
      </section>

      {isManagerLike ? (
        <section className="panel">
          <h3>Manajemen Kategori</h3>
          <form className="form-inline" onSubmit={createCategory}>
            <input
              placeholder="Kategori baru"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
            />
            <button type="submit">Tambah</button>
          </form>
        </section>
      ) : null}

      <section className="panel">
        <h3>Pencarian Dokumen</h3>
        <div className="form-inline">
          <input placeholder="Cari nama file, judul, tag" value={query} onChange={(e) => setQuery(e.target.value)} />
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">Semua kategori</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          <button onClick={searchDocuments} type="button">Cari</button>
        </div>
      </section>

      <section className="panel">
        <h3>Daftar Dokumen</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Judul</th>
                <th>File</th>
                <th>Kategori</th>
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
                  <td>{doc.category?.name}</td>
                  <td>{doc.tags?.map((tag) => tag.name).join(", ") || "-"}</td>
                  <td>{doc.uploadedBy?.name}</td>
                  <td>{dayjs(doc.createdAt).format("DD MMM YYYY HH:mm")}</td>
                  <td>
                    <button onClick={() => downloadDocument(doc.id, doc.originalName)} type="button">Download</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {isManagerLike ? (
        <section className="panel">
          <h3>Aktivitas Sistem</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Aksi</th>
                  <th>Detail</th>
                  <th>Waktu</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((item) => (
                  <tr key={item.id}>
                    <td>{item.user?.name}</td>
                    <td>{item.user?.role}</td>
                    <td>{item.action}</td>
                    <td>{item.detail || "-"}</td>
                    <td>{dayjs(item.timestamp).format("DD MMM YYYY HH:mm")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {loading ? <p className="subtext">Memuat data...</p> : null}
      {error ? <p className="error-text">{error}</p> : null}
    </main>
  );
}

export default App;

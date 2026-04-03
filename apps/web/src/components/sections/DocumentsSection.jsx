import { useState } from "react";
import dayjs from "dayjs";

export default function DocumentsSection({
  isManagerLike,
  uploadForm,
  setUploadForm,
  handleUpload,
  categories,
  newCategory,
  setNewCategory,
  createCategory,
  resetFilters,
  searchDocuments,
  query,
  setQuery,
  categoryId,
  setCategoryId,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  paginatedDocuments,
  sortedDocuments,
  currentPage,
  totalPages,
  setCurrentPage,
  openPreview,
  openVersions,
  downloadDocument,
}) {
  const [showTips, setShowTips] = useState(true);

  return (
    <section className="dashboard-grid documents-grid documents-shell-saas">
      <div className="stack-col">
        <section className="panel saas-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Upload</p>
              <h3>Tambah dokumen baru</h3>
            </div>
          </div>
          <form className="form-inline upload-form" onSubmit={handleUpload}>
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
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
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
          <section className="panel saas-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Kategori</p>
                <h3>Manajemen kategori</h3>
              </div>
            </div>
            <form className="form-inline compact-form" onSubmit={createCategory}>
              <input
                placeholder="Kategori baru"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
              />
              <button type="submit">Tambah</button>
            </form>
          </section>
        ) : null}

        <section className="panel saas-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Search</p>
              <h3>Pencarian dokumen</h3>
            </div>
            <div className="action-row">
              <button type="button" className="ghost-btn" onClick={resetFilters}>
                Reset filter
              </button>
              <button type="button" onClick={searchDocuments}>
                Cari
              </button>
            </div>
          </div>
          <div className="search-box">
            <span aria-hidden="true">🔍</span>
            <input
              placeholder="Cari dokumen..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="form-inline search-form">
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">Semua kategori</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
        </section>

        <section className="panel saas-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Dokumen</p>
              <h3>Daftar dokumen</h3>
            </div>
            <span className="chip">Preview PDF • Versioning • Share</span>
          </div>
          <div className="doc-list">
            {paginatedDocuments.length ? (
              paginatedDocuments.map((doc) => (
                <div key={doc.id} className="doc-card interactive saas-card">
                  <div className="doc-header">
                    <h4>{doc.title}</h4>
                    <span className="chip soft">{doc.category?.name}</span>
                  </div>
                  <div className="doc-meta">
                    <span>{doc.originalName}</span>
                    <span>v{doc.currentVersion || 1}</span>
                    {doc.tags?.length > 0 ? (
                      <span>{doc.tags.map((tag) => tag.name).join(", ").slice(0, 24)}</span>
                    ) : null}
                  </div>
                  <div className="doc-footer">
                    <small>
                      {doc.uploadedBy?.name} • {dayjs(doc.createdAt).format("DD MMM YYYY")}
                    </small>
                    <div className="doc-actions">
                      {doc.mimeType === "application/pdf" ? (
                        <button
                          type="button"
                          className="ghost-btn small"
                          onClick={() => openPreview(doc)}
                        >
                          Preview
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="ghost-btn small"
                        onClick={() => openVersions(doc)}
                      >
                        Versi
                      </button>
                      <button
                        type="button"
                        className="ghost-btn small"
                        onClick={() => downloadDocument(doc.id, doc.originalName)}
                      >
                        Download
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <p>📂 Belum ada dokumen</p>
                <span>Mulai upload dokumen pertama Anda</span>
              </div>
            )}
          </div>
          {sortedDocuments.length > 0 ? (
            <div className="pagination-controls">
              <button
                type="button"
                className="ghost-btn"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                ← Sebelumnya
              </button>
              <span className="page-info">
                Halaman {currentPage} dari {totalPages} • {paginatedDocuments.length} / {sortedDocuments.length}
              </span>
              <button
                type="button"
                className="ghost-btn"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                Selanjutnya →
              </button>
            </div>
          ) : null}
        </section>
      </div>

      <aside className="stack-col side-col documents-side-col">
        {showTips ? (
          <section className="panel notifications-panel saas-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Tips</p>
                <h3>Alur rekomendasi</h3>
              </div>
              <button
                type="button"
                className="ghost-btn tips-toggle-btn"
                onClick={() => setShowTips(false)}
              >
                Tutup
              </button>
            </div>
            <div className="notification-list">
              <div className="notification-item static">
                <strong>1. Upload</strong>
                <span>Masukkan judul, kategori, dan file.</span>
              </div>
              <div className="notification-item static">
                <strong>2. Review</strong>
                <span>Preview dulu sebelum dibagikan.</span>
              </div>
              <div className="notification-item static">
                <strong>3. Revisi</strong>
                <span>Tambah versi baru saat ada update.</span>
              </div>
              <div className="notification-item static">
                <strong>4. Share</strong>
                <span>Kirim ke user yang relevan.</span>
              </div>
            </div>
          </section>
        ) : (
          <section className="panel tips-collapsed-panel saas-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Tips</p>
                <h3>Tips disembunyikan</h3>
              </div>
              <button
                type="button"
                className="ghost-btn tips-toggle-btn"
                onClick={() => setShowTips(true)}
              >
                Tampilkan
              </button>
            </div>
            <p className="subtext">Panel tips bisa kamu tampilkan lagi kapan saja.</p>
          </section>
        )}
      </aside>
    </section>
  );
}

import dayjs from "dayjs";

export default function HomeSection({
  dashboard,
  unreadNotifications,
  recentDocuments,
  notifications,
  markNotificationRead,
  setActiveSection,
}) {
  return (
    <>
      <section className="workspace-summary panel">
        <div className="workspace-copy">
          <p className="eyebrow">Operational Overview</p>
          <h1>Ruang kerja dokumen yang lebih fokus dan cepat dipindai.</h1>
          <p className="subtext">Pantau file penting, notifikasi, dan aktivitas tim dari satu tampilan yang lebih tenang.</p>
        </div>
        <div className="workspace-pills">
          <div className="workspace-pill">
            <small>Dokumen</small>
            <strong>{dashboard.totalDocuments}</strong>
          </div>
          <div className="workspace-pill">
            <small>User</small>
            <strong>{dashboard.totalUsers}</strong>
          </div>
          <div className="workspace-pill">
            <small>Notif</small>
            <strong>{unreadNotifications}</strong>
          </div>
        </div>
      </section>

      <section className="stats-grid">
        <article className="modern-card">
          <div className="card-icon">📄</div>
          <p className="card-label">Total Dokumen</p>
          <h3 className="card-value">{dashboard.totalDocuments}</h3>
          <span className="card-desc">File aktif di sistem</span>
        </article>
        <article className="modern-card">
          <div className="card-icon">👥</div>
          <p className="card-label">Total Pengguna</p>
          <h3 className="card-value">{dashboard.totalUsers}</h3>
          <span className="card-desc">Akun workspace</span>
        </article>
        <article className="modern-card">
          <div className="card-icon">⏱️</div>
          <p className="card-label">Dokumen Terbaru</p>
          <h3 className="card-value">{recentDocuments.length}</h3>
          <span className="card-desc">Prioritas untuk direview</span>
        </article>
      </section>

      <section className="dashboard-grid compact-grid">
        <div className="stack-col">
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Recent Activity</p>
                <h3>Dokumen terbaru</h3>
              </div>
              <button type="button" className="ghost-btn" onClick={() => setActiveSection("documents")}>Lihat semua</button>
            </div>
            <div className="doc-list">
              {recentDocuments.length ? (
                recentDocuments.slice(0, 5).map((doc) => (
                  <div key={doc.id} className="doc-card">
                    <div className="doc-header">
                      <h4>{doc.title}</h4>
                      <span className="chip soft">{doc.category?.name}</span>
                    </div>
                    <div className="doc-meta">
                      <span>📄 {doc.originalName}</span>
                      <span>v{doc.currentVersion || 1}</span>
                    </div>
                    <div className="doc-footer">
                      <small>{doc.uploadedBy?.name} • {dayjs(doc.createdAt).format("DD MMM")}</small>
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
  );
}

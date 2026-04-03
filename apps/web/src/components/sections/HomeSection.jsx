import dayjs from "dayjs";

export default function HomeSection({
  dashboard,
  unreadNotifications,
  recentDocuments,
  notifications,
  markNotificationRead,
  setActiveSection,
}) {
  const summaryCards = [
    { icon: "📄", label: "Total Dokumen", value: dashboard.totalDocuments, description: "File aktif di sistem" },
    { icon: "👥", label: "Total Pengguna", value: dashboard.totalUsers, description: "Akun workspace" },
    { icon: "⏱️", label: "Dokumen Terbaru", value: recentDocuments.length, description: "Prioritas untuk direview" },
  ];

  const kpis = [
    { label: "Dokumen", value: dashboard.totalDocuments },
    { label: "User", value: dashboard.totalUsers },
    { label: "Unread", value: unreadNotifications },
    { label: "Status", value: unreadNotifications > 0 ? "Needs action" : "Healthy" },
  ];

  return (
    <section className="home-shell home-shell-saas">
      <section className="panel home-saas-hero">
        <div className="home-saas-hero-inner">
          <div className="home-saas-hero-copy">
            <p className="eyebrow">Dashboard</p>
            <h1>Ringkasan workspace, rapi dan cepat dipindai.</h1>
            <p className="subtext">
              Fokus ke hal yang penting: jumlah dokumen, user aktif, dan notifikasi yang perlu kamu tindak.
            </p>
            <div className="home-saas-hero-meta">
              <span className="chip">Live</span>
              <span className="chip soft">{dayjs().format("dddd, DD MMM YYYY")}</span>
            </div>
          </div>

          <div className="home-saas-kpis" aria-label="Key metrics">
            {kpis.map((item) => (
              <article key={item.label} className={`home-saas-kpi ${item.label === "Unread" && unreadNotifications > 0 ? "warn" : ""}`}>
                <small>{item.label}</small>
                <strong>{item.value}</strong>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="stats-grid home-stats-grid">
        {summaryCards.map((item) => (
          <article key={item.label} className="modern-card home-stat-card home-saas-stat">
            <div className="home-stat-top">
              <span className="home-stat-icon" aria-hidden="true">{item.icon}</span>
              <span className="home-stat-kicker">{item.label}</span>
            </div>
            <h3 className="home-stat-value">{item.value}</h3>
            <span className="home-stat-desc">{item.description}</span>
          </article>
        ))}
      </section>

      <section className="dashboard-grid compact-grid">
        <div className="stack-col">
          <section className="panel home-panel home-saas-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Recent Activity</p>
                <h3>Dokumen terbaru</h3>
              </div>
              <button type="button" className="ghost-btn home-panel-action" onClick={() => setActiveSection("documents")}>Lihat semua</button>
            </div>
            <div className="doc-list home-doc-list">
              {recentDocuments.length ? (
                recentDocuments.slice(0, 5).map((doc) => (
                  <div key={doc.id} className="doc-card home-doc-card">
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
          <section className="panel notifications-panel home-panel home-saas-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Quick Inbox</p>
                <h3>Notifikasi penting</h3>
              </div>
              <button type="button" className="ghost-btn home-panel-action" onClick={() => setActiveSection("notifications")}>Lihat semua</button>
            </div>
            <div className="notification-list home-notification-list">
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
    </section>
  );
}

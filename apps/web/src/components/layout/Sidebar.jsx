export default function Sidebar({
  user,
  activeSection,
  setActiveSection,
  documentsCount,
  unreadNotifications,
  refreshAll,
  logout,
}) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2>📁 FileTrack</h2>
        <p className="sidebar-user">{user.name}</p>
        <span className={`badge-role role-${user.role.toLowerCase()}`}>{user.role}</span>
      </div>

      <nav className="sidebar-nav">
        <button
          type="button"
          className={`nav-btn ${activeSection === "home" ? "active" : ""}`}
          onClick={() => setActiveSection("home")}
        >
          🏠 Dashboard
        </button>
        <button
          type="button"
          className={`nav-btn ${activeSection === "documents" ? "active" : ""}`}
          onClick={() => setActiveSection("documents")}
        >
          📄 Dokumen <span className="nav-badge">{documentsCount}</span>
        </button>
        <button
          type="button"
          className={`nav-btn ${activeSection === "notifications" ? "active" : ""}`}
          onClick={() => setActiveSection("notifications")}
        >
          🔔 Notifikasi {unreadNotifications > 0 && <span className="nav-badge unread">{unreadNotifications}</span>}
        </button>
      </nav>

      <div className="sidebar-footer">
        <button type="button" className="sidebar-action refresh-btn" onClick={refreshAll} title="Refresh">🔄</button>
        <button type="button" className="sidebar-action logout-btn" onClick={logout} title="Logout">🚪</button>
      </div>
    </aside>
  );
}

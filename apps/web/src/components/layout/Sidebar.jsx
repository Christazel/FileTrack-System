export default function Sidebar({
  user,
  activeSection,
  setActiveSection,
  documentsCount,
  unreadNotifications,
  refreshAll,
  logout,
}) {
  const navItems = [
    { key: "home", label: "Dashboard" },
    { key: "documents", label: "Dokumen", badge: documentsCount },
    {
      key: "notifications",
      label: "Notifikasi",
      badge: unreadNotifications > 0 ? unreadNotifications : null,
    },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="brand-shell">
          <div className="brand-mark" aria-hidden="true">FT</div>
          <div>
            <h2>FileTrack</h2>
            <p className="sidebar-user">{user.name}</p>
          </div>
        </div>
        <div className="sidebar-meta">
          <span className={`badge-role role-${user.role.toLowerCase()}`}>{user.role}</span>
          <span className="presence-pill">Online</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`nav-btn ${activeSection === item.key ? "active" : ""}`}
            onClick={() => setActiveSection(item.key)}
          >
            <span className="nav-label">{item.label}</span>
            {item.badge !== null && item.badge !== undefined ? (
              <span className={`nav-badge ${item.key === "notifications" ? "unread" : ""}`}>{item.badge}</span>
            ) : null}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button type="button" className="sidebar-action refresh-btn" onClick={refreshAll} title="Refresh">
          Muat ulang
        </button>
        <button type="button" className="sidebar-action logout-btn" onClick={logout} title="Logout">
          Keluar
        </button>
      </div>
    </aside>
  );
}

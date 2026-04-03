import dayjs from "dayjs";

export default function Topbar({ activeSection, userName, unreadNotifications, markAllNotificationsRead }) {
  const sectionTitle = activeSection === "home" ? "Dashboard" : activeSection === "documents" ? "Dokumen" : "Notifikasi";
  const sectionHint =
    activeSection === "home"
      ? "Pantau performa workspace"
      : activeSection === "documents"
        ? "Kelola file dan versi"
        : "Inbox aktivitas terbaru";

  return (
    <header className="topbar">
      <div className="topbar-content">
        <div className="topbar-main">
          <div className="topbar-context">
            <span className="topbar-context-pill">{sectionTitle}</span>
            <span className="topbar-context-hint">{sectionHint}</span>
          </div>
          <h2 className="topbar-title">Selamat datang kembali, {userName}!</h2>
          <div className="topbar-meta">
            <span className="topbar-chip">{dayjs().format("dddd, DD MMMM YYYY")}</span>
            <span className="topbar-chip subtle">System ready</span>
          </div>
        </div>

        <div className="topbar-actions">
          <button className="topbar-alert-btn" type="button" onClick={markAllNotificationsRead}>
            <span aria-hidden="true">🔔</span>
            Tandai Dibaca
            <span className={`topbar-alert-count ${unreadNotifications > 0 ? "active" : ""}`}>{unreadNotifications}</span>
          </button>
        </div>
      </div>
    </header>
  );
}

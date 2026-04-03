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
          <p className="topbar-kicker">{dayjs().format("dddd, DD MMMM YYYY")}</p>
          <h2 className="topbar-title">{sectionTitle}</h2>
          <p className="topbar-subtitle">{sectionHint}</p>
        </div>

        <div className="topbar-actions">
          <span className="topbar-user">{userName}</span>
          <button className="topbar-alert-btn" type="button" onClick={markAllNotificationsRead}>
            Tandai Dibaca
            <span className={`topbar-alert-count ${unreadNotifications > 0 ? "active" : ""}`}>{unreadNotifications}</span>
          </button>
        </div>
      </div>
    </header>
  );
}

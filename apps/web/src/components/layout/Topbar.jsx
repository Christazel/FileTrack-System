import dayjs from "dayjs";
import { Bell } from "lucide-react";

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
          <h2 className="topbar-title">Halo, {userName}</h2>
        </div>

        <div className="topbar-actions">
          <span className="topbar-date">{dayjs().format("dddd, DD MMMM YYYY")}</span>
          <button className="topbar-alert-btn" type="button" onClick={markAllNotificationsRead}>
            <Bell size={16} aria-hidden="true" />
            Tandai Dibaca
            <span className={`topbar-alert-count ${unreadNotifications > 0 ? "active" : ""}`}>{unreadNotifications}</span>
          </button>
        </div>
      </div>
    </header>
  );
}

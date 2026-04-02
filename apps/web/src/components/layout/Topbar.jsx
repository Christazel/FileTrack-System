import dayjs from "dayjs";

export default function Topbar({ activeSection, userName, unreadNotifications, markAllNotificationsRead }) {
  return (
    <header className="topbar">
      <div className="topbar-content">
        <div>
          <p className="eyebrow">{activeSection === "home" ? "Dashboard" : activeSection === "documents" ? "Dokumen" : "Notifikasi"}</p>
          <h2 style={{ textTransform: "capitalize" }}>Selamat datang kembali, {userName}!</h2>
          <p className="subtext">{dayjs().format("dddd, DD MMMM YYYY")}</p>
        </div>
        <div className="topbar-actions">
          <button className="ghost-btn" type="button" onClick={markAllNotificationsRead}>
            🔔 {unreadNotifications > 0 ? `(${unreadNotifications})` : ""}
          </button>
        </div>
      </div>
    </header>
  );
}

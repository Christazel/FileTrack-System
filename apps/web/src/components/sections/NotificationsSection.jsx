import dayjs from "dayjs";

export default function NotificationsSection({ notifications, markNotificationRead, isManagerLike, logs }) {
  return (
    <section className="dashboard-grid single-view-grid">
      <div className="stack-col">
        <section className="panel notifications-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Notifications</p>
              <h3>Notifikasi terbaru</h3>
            </div>
          </div>
          <div className="notification-list">
            {notifications.length ? notifications.map((item) => (
              <button key={item.id} type="button" className={`notification-item ${item.isRead ? "read" : "unread"}`} onClick={() => markNotificationRead(item.id)}>
                <strong>{item.title}</strong>
                <span>{item.detail || "-"}</span>
                <small>{dayjs(item.createdAt).format("DD MMM YYYY HH:mm")}</small>
              </button>
            )) : <div className="notification-item static"><strong>Tidak ada notifikasi.</strong><span>Notifikasi akan muncul setelah upload/share dokumen.</span></div>}
          </div>
        </section>

        {isManagerLike ? (
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Activity</p>
                <h3>Log sistem</h3>
              </div>
            </div>
            <div className="notification-list logs-list">
              {logs.length ? logs.map((item) => (
                <div key={item.id} className="notification-item static">
                  <strong>{item.action}</strong>
                  <span>{item.detail || "-"}</span>
                  <small>{item.user?.name} • {dayjs(item.timestamp).format("DD MMM HH:mm")}</small>
                </div>
              )) : <div className="notification-item static"><strong>Belum ada log aktivitas.</strong></div>}
            </div>
          </section>
        ) : null}
      </div>
    </section>
  );
}

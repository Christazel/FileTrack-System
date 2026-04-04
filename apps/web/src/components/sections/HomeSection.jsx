import { useMemo, useState } from "react";
import dayjs from "dayjs";

export default function HomeSection({
  user,
  dashboard,
  unreadNotifications,
  recentDocuments,
  notifications,
  markNotificationRead,
  setActiveSection,
  users,
  departments,
  isAdmin,
  adminCreateUser,
  adminUpdateUser,
  adminResetPassword,
  adminDeleteUser,
  adminCreateDepartment,
  adminUpdateDepartment,
  adminDeleteDepartment,
}) {
  const summaryCards = [
    { icon: "DOC", label: "Total Dokumen", value: dashboard.totalDocuments, description: "File aktif di sistem" },
    { icon: "USR", label: "Total Pengguna", value: dashboard.totalUsers, description: "Akun workspace" },
    { icon: "NEW", label: "Dokumen Terbaru", value: recentDocuments.length, description: "Prioritas untuk direview" },
  ];

  const kpis = [
    { label: "Dokumen", value: dashboard.totalDocuments },
    { label: "User", value: dashboard.totalUsers },
    { label: "Unread", value: unreadNotifications },
    { label: "Status", value: unreadNotifications > 0 ? "Needs action" : "Healthy" },
  ];

  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    role: "STAFF",
    departmentId: "",
    password: "",
  });

  const [editDrafts, setEditDrafts] = useState({});
  const [departmentDrafts, setDepartmentDrafts] = useState({});
  const [newDepartment, setNewDepartment] = useState("");

  const orderedUsers = useMemo(() => {
    const userList = Array.isArray(users) ? users : [];
    return [...userList].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [users]);

  const orderedDepartments = useMemo(() => {
    const departmentOptions = Array.isArray(departments) ? departments : [];
    return [...departmentOptions].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [departments]);

  function getDraftFor(target) {
    const existing = editDrafts[target.id];
    if (existing) {
      return existing;
    }

    return {
      name: target.name || "",
      email: target.email || "",
      role: target.role || "STAFF",
      departmentId: target.departmentId ?? "",
    };
  }

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
                      <span>{doc.originalName}</span>
                      <span>v{doc.currentVersion || 1}</span>
                    </div>
                    <div className="doc-footer">
                      <small>{doc.uploadedBy?.name} • {dayjs(doc.createdAt).format("DD MMM")}</small>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  <p>Belum ada dokumen</p>
                  <span>Mulai upload dokumen pertama Anda</span>
                </div>
              )}
            </div>
          </section>

          {isAdmin ? (
            <section className="panel home-panel home-saas-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Admin</p>
                  <h3>Kelola user</h3>
                </div>
              </div>

              <section className="subpanel saas-subpanel">
                <h4>Kelola departemen</h4>
                <form
                  className="form-inline compact-form"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!newDepartment.trim()) {
                      return;
                    }
                    await adminCreateDepartment({ name: newDepartment.trim() });
                    setNewDepartment("");
                  }}
                >
                  <input
                    placeholder="Nama departemen"
                    value={newDepartment}
                    onChange={(e) => setNewDepartment(e.target.value)}
                  />
                  <button type="submit">Tambah</button>
                </form>

                <div className="timeline-list" style={{ marginTop: 12 }}>
                  {orderedDepartments.length ? (
                    orderedDepartments.map((dept) => {
                      const draft = departmentDrafts[dept.id] ?? dept.name;
                      return (
                        <div key={dept.id} className="timeline-item">
                          <strong>{dept.name}</strong>
                          <div className="form-inline compact-form" style={{ marginTop: 10 }}>
                            <input
                              value={draft}
                              onChange={(e) =>
                                setDepartmentDrafts((current) => ({
                                  ...current,
                                  [dept.id]: e.target.value,
                                }))
                              }
                              placeholder="Nama departemen"
                            />
                            <button
                              type="button"
                              onClick={async () => {
                                await adminUpdateDepartment(dept.id, { name: String(draft || "").trim() });
                                setDepartmentDrafts((current) => {
                                  const next = { ...current };
                                  delete next[dept.id];
                                  return next;
                                });
                              }}
                              disabled={!String(draft || "").trim()}
                            >
                              Simpan
                            </button>
                            <button
                              type="button"
                              className="ghost-btn"
                              onClick={() => {
                                const ok = window.confirm(`Hapus departemen ${dept.name}?`);
                                if (ok) {
                                  adminDeleteDepartment(dept.id);
                                }
                              }}
                            >
                              Hapus
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="timeline-item">
                      <span>Belum ada departemen</span>
                    </div>
                  )}
                </div>
              </section>

              <section className="subpanel saas-subpanel">
                <h4>Buat user</h4>
                <form
                  className="form-inline upload-form spacious"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!createForm.name.trim() || !createForm.email.trim()) {
                      return;
                    }

                    await adminCreateUser({
                      name: createForm.name.trim(),
                      email: createForm.email.trim(),
                      role: createForm.role,
                      departmentId: createForm.departmentId ? Number(createForm.departmentId) : undefined,
                      password: createForm.password || undefined,
                    });

                    setCreateForm({ name: "", email: "", role: "STAFF", departmentId: "", password: "" });
                  }}
                >
                  <input
                    placeholder="Nama"
                    value={createForm.name}
                    onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))}
                    required
                  />
                  <input
                    placeholder="Email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm((p) => ({ ...p, email: e.target.value }))}
                    required
                  />
                  <select
                    value={createForm.role}
                    onChange={(e) => setCreateForm((p) => ({ ...p, role: e.target.value }))}
                  >
                    <option value="ADMIN">ADMIN</option>
                    <option value="MANAGER">MANAGER</option>
                    <option value="STAFF">STAFF</option>
                  </select>
                  <select
                    value={createForm.departmentId}
                    onChange={(e) => setCreateForm((p) => ({ ...p, departmentId: e.target.value }))}
                  >
                    <option value="">Tanpa departemen</option>
                    {orderedDepartments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                  <input
                    placeholder="Password (opsional)"
                    value={createForm.password}
                    onChange={(e) => setCreateForm((p) => ({ ...p, password: e.target.value }))}
                  />
                  <button type="submit">Buat</button>
                </form>
                <p className="subtext">Jika password kosong, default: Password123!</p>
              </section>

              <section className="subpanel timeline-box saas-subpanel">
                <h4>Daftar user</h4>
                <div className="timeline-list">
                  {orderedUsers.map((item) => {
                    const draft = getDraftFor(item);
                    const isSelf = user?.id === item.id;

                    return (
                      <div key={item.id} className="timeline-item">
                        <strong>{item.name}</strong>
                        <small>{item.email} • {item.role}</small>

                        <div className="form-inline upload-form spacious" style={{ marginTop: 10 }}>
                          <input
                            value={draft.name}
                            onChange={(e) =>
                              setEditDrafts((current) => ({
                                ...current,
                                [item.id]: { ...draft, name: e.target.value },
                              }))
                            }
                            placeholder="Nama"
                          />
                          <input
                            value={draft.email}
                            onChange={(e) =>
                              setEditDrafts((current) => ({
                                ...current,
                                [item.id]: { ...draft, email: e.target.value },
                              }))
                            }
                            placeholder="Email"
                          />
                          <select
                            value={draft.role}
                            onChange={(e) =>
                              setEditDrafts((current) => ({
                                ...current,
                                [item.id]: { ...draft, role: e.target.value },
                              }))
                            }
                          >
                            <option value="ADMIN">ADMIN</option>
                            <option value="MANAGER">MANAGER</option>
                            <option value="STAFF">STAFF</option>
                          </select>
                          <select
                            value={draft.departmentId === null ? "" : draft.departmentId}
                            onChange={(e) =>
                              setEditDrafts((current) => ({
                                ...current,
                                [item.id]: {
                                  ...draft,
                                  departmentId: e.target.value ? Number(e.target.value) : null,
                                },
                              }))
                            }
                          >
                            <option value="">Tanpa departemen</option>
                            {orderedDepartments.map((dept) => (
                              <option key={dept.id} value={dept.id}>
                                {dept.name}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={async () => {
                              await adminUpdateUser(item.id, {
                                name: draft.name,
                                email: draft.email,
                                role: draft.role,
                                departmentId: draft.departmentId === "" ? null : draft.departmentId,
                              });
                              setEditDrafts((current) => {
                                const next = { ...current };
                                delete next[item.id];
                                return next;
                              });
                            }}
                          >
                            Simpan
                          </button>
                          <button
                            type="button"
                            className="ghost-btn"
                            onClick={() => adminResetPassword(item.id)}
                            disabled={isSelf}
                            title={isSelf ? "Tidak untuk akun sendiri" : "Reset password"}
                          >
                            Reset
                          </button>
                          <button
                            type="button"
                            className="ghost-btn"
                            onClick={() => {
                              if (isSelf) {
                                return;
                              }
                              const ok = window.confirm(`Hapus user ${item.email}?`);
                              if (ok) {
                                adminDeleteUser(item.id);
                              }
                            }}
                            disabled={isSelf}
                            title={isSelf ? "Tidak untuk akun sendiri" : "Hapus user"}
                          >
                            Hapus
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </section>
          ) : null}
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

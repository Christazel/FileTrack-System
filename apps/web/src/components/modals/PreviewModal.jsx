import { useMemo, useState } from "react";
import dayjs from "dayjs";

export default function PreviewModal({
  previewModal,
  closeModal,
  documentShares,
  documentVersions,
  documentComments,
  documentLogs,
  setVersionDrafts,
  uploadVersion,
  shareDrafts,
  setShareDrafts,
  users,
  user,
  shareDocument,
  addComment,
  assignDocument,
  updateWorkflowStatus,
  decideDocument,
}) {
  const [commentText, setCommentText] = useState("");
  const [decisionNote, setDecisionNote] = useState("");
  const [assignToId, setAssignToId] = useState("");
  const [statusDraft, setStatusDraft] = useState("");

  const isManagerLike = user?.role === "ADMIN" || user?.role === "MANAGER";
  const document = previewModal.document || {};
  const documentId = document.id;

  const shareCandidates = useMemo(() => {
    if (!Array.isArray(users) || !user) {
      return [];
    }
    const base = users.filter((candidate) => candidate.id !== user.id);

    if (user.role === "ADMIN") {
      return base;
    }

    return base.filter(
      (candidate) => candidate.role === "ADMIN" || (candidate.departmentId && candidate.departmentId === user.departmentId),
    );
  }, [users, user]);

  const assignCandidates = useMemo(() => {
    if (!Array.isArray(users) || !user) {
      return [];
    }

    const staff = users.filter((candidate) => candidate.role === "STAFF");
    if (user.role === "ADMIN") {
      return staff;
    }

    return staff.filter((candidate) => candidate.departmentId && candidate.departmentId === user.departmentId);
  }, [users, user]);

  const modalLabel =
    previewModal.type === "preview"
      ? "Preview PDF"
      : previewModal.type === "versions"
        ? "Versioning"
        : "Detail";

  if (!previewModal.type) {
    return null;
  }

  return (
    <div className="modal-backdrop" onClick={closeModal} role="presentation">
      <section
        className="modal-card modal-card-saas"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header modal-header-saas">
          <div>
            <p className="eyebrow">{modalLabel}</p>
            <h3>{previewModal.document?.title}</h3>
          </div>
          <button className="ghost-btn" type="button" onClick={closeModal}>
            Tutup
          </button>
        </div>

        {previewModal.type === "preview" ? (
          <iframe className="preview-frame" title="PDF preview" src={previewModal.blobUrl} />
        ) : null}

        {previewModal.type === "detail" ? (
          <div className="detail-grid">
            <div>
              <span>File</span>
              <strong>{previewModal.document?.originalName}</strong>
            </div>
            <div>
              <span>Kategori</span>
              <strong>{previewModal.document?.category?.name}</strong>
            </div>
            <div>
              <span>Versi</span>
              <strong>v{previewModal.document?.currentVersion || 1}</strong>
            </div>
            <div>
              <span>Uploader</span>
              <strong>{previewModal.document?.uploadedBy?.name}</strong>
            </div>
            <div>
              <span>Status</span>
              <strong>{previewModal.document?.workflowStatus || "-"}</strong>
            </div>
            <div>
              <span>Approval</span>
              <strong>{previewModal.document?.approvalStatus || "-"}</strong>
            </div>
            <div>
              <span>Assigned</span>
              <strong>{previewModal.document?.assignedTo?.name || "-"}</strong>
            </div>
          </div>
        ) : null}

        {previewModal.type === "versions" ? (
          <div className="modal-stack">
            <div className="detail-grid compact">
              <div>
                <span>File</span>
                <strong>{previewModal.document?.originalName}</strong>
              </div>
              <div>
                <span>Kategori</span>
                <strong>{previewModal.document?.category?.name}</strong>
              </div>
              <div>
                <span>Versi sekarang</span>
                <strong>v{previewModal.document?.currentVersion || 1}</strong>
              </div>
              <div>
                <span>Share</span>
                <strong>{documentShares.length} kali</strong>
              </div>
              <div>
                <span>Status</span>
                <strong>{previewModal.document?.workflowStatus || "-"}</strong>
              </div>
              <div>
                <span>Approval</span>
                <strong>{previewModal.document?.approvalStatus || "-"}</strong>
              </div>
              <div>
                <span>Assigned</span>
                <strong>{previewModal.document?.assignedTo?.name || "-"}</strong>
              </div>
            </div>

            <section className="subpanel saas-subpanel">
              <h4>Workflow</h4>
              <div className="form-inline compact-form">
                {isManagerLike ? (
                  <>
                    <select
                      value={assignToId}
                      onChange={(e) => setAssignToId(e.target.value)}
                    >
                      <option value="">Assign ke staff</option>
                      {assignCandidates.map((candidate) => (
                        <option key={candidate.id} value={candidate.id}>
                          {candidate.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => assignDocument(documentId, assignToId)}
                      disabled={!assignCandidates.length}
                    >
                      Assign
                    </button>
                  </>
                ) : null}

                <select
                  value={statusDraft}
                  onChange={(e) => setStatusDraft(e.target.value)}
                  disabled={
                    user?.role === "STAFF" &&
                    document?.assignedToId &&
                    document.assignedToId !== user.id
                  }
                >
                  <option value="">Ubah status</option>
                  {user?.role === "STAFF" ? (
                    <>
                      <option value="IN_PROGRESS">IN_PROGRESS</option>
                      <option value="DONE">DONE</option>
                    </>
                  ) : (
                    <>
                      <option value="CREATED">CREATED</option>
                      <option value="ASSIGNED">ASSIGNED</option>
                      <option value="IN_PROGRESS">IN_PROGRESS</option>
                      <option value="DONE">DONE</option>
                    </>
                  )}
                </select>
                <button
                  type="button"
                  onClick={() => updateWorkflowStatus(documentId, statusDraft)}
                  disabled={!statusDraft}
                >
                  Simpan
                </button>
              </div>

              {isManagerLike ? (
                <div className="form-inline compact-form" style={{ marginTop: 12 }}>
                  <input
                    placeholder="Catatan approval (opsional)"
                    value={decisionNote}
                    onChange={(e) => setDecisionNote(e.target.value)}
                  />
                  <button
                    type="button"
                    className="ghost-btn"
                    onClick={() => decideDocument(documentId, "APPROVED", decisionNote)}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    className="ghost-btn"
                    onClick={() => decideDocument(documentId, "REJECTED", decisionNote)}
                  >
                    Reject
                  </button>
                </div>
              ) : null}
            </section>

            <section className="subpanel saas-subpanel">
              <h4>Tambah versi baru</h4>
              <div className="form-inline version-form">
                <input
                  type="file"
                  onChange={(e) => {
                    if (!documentId) {
                      return;
                    }
                    setVersionDrafts((current) => ({
                      ...current,
                      [documentId]: { file: e.target.files?.[0] || null },
                    }));
                  }}
                />
                <button type="button" onClick={() => uploadVersion(documentId)}>
                  Upload versi
                </button>
              </div>
            </section>

            {isManagerLike && shareCandidates.length ? (
              <section className="subpanel saas-subpanel">
                <h4>Share ke user</h4>
                <div className="form-inline share-form">
                  <select
                    value={documentId ? shareDrafts[documentId]?.sharedToId || "" : ""}
                    onChange={(e) => {
                      if (!documentId) {
                        return;
                      }
                      setShareDrafts((current) => ({
                        ...current,
                        [documentId]: {
                          ...(current[documentId] || {}),
                          sharedToId: e.target.value,
                        },
                      }));
                    }}
                  >
                    <option value="">Pilih user</option>
                    {shareCandidates.map((candidate) => (
                      <option key={candidate.id} value={candidate.id}>
                        {candidate.name} • {candidate.role}
                      </option>
                    ))}
                  </select>
                  <input
                    placeholder="Pesan share"
                    value={documentId ? shareDrafts[documentId]?.message || "" : ""}
                    onChange={(e) => {
                      if (!documentId) {
                        return;
                      }
                      setShareDrafts((current) => ({
                        ...current,
                        [documentId]: {
                          ...(current[documentId] || {}),
                          message: e.target.value,
                        },
                      }));
                    }}
                  />
                  <button type="button" onClick={() => shareDocument(documentId)}>
                    Share
                  </button>
                </div>
              </section>
            ) : null}

            <section className="subpanel timeline-box saas-subpanel">
              <h4>Riwayat versi</h4>
              <div className="timeline-list">
                {documentVersions.map((version) => (
                  <div key={version.id} className="timeline-item">
                    <strong>v{version.versionNumber}</strong>
                    <span>{version.originalName}</span>
                    <small>
                      {version.uploadedBy?.name} • {dayjs(version.createdAt).format("DD MMM YYYY HH:mm")}
                    </small>
                  </div>
                ))}
              </div>
            </section>

            <section className="subpanel timeline-box saas-subpanel">
              <h4>Aktivitas</h4>
              <div className="timeline-list">
                {documentLogs?.length ? (
                  documentLogs.map((item) => (
                    <div key={item.id} className="timeline-item">
                      <strong>{item.action}</strong>
                      <span>{item.detail || "-"}</span>
                      <small>{item.user?.name} • {dayjs(item.timestamp).format("DD MMM YYYY HH:mm")}</small>
                    </div>
                  ))
                ) : (
                  <div className="timeline-item">
                    <span>Belum ada aktivitas</span>
                  </div>
                )}
              </div>
            </section>

            <section className="subpanel timeline-box saas-subpanel">
              <h4>Riwayat share</h4>
              <div className="timeline-list">
                {documentShares.map((share) => (
                  <div key={share.id} className="timeline-item">
                    <strong>{share.sharedTo?.name}</strong>
                    <span>{share.message || "Tanpa pesan"}</span>
                    <small>
                      {share.sharedBy?.name} • {dayjs(share.createdAt).format("DD MMM YYYY HH:mm")}
                    </small>
                  </div>
                ))}
              </div>
            </section>

            <section className="subpanel timeline-box saas-subpanel">
              <h4>Komentar</h4>
              <div className="form-inline compact-form" style={{ marginBottom: 12 }}>
                <input
                  placeholder="Tulis komentar"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                />
                <button
                  type="button"
                  onClick={async () => {
                    await addComment(document.id, commentText);
                    setCommentText("");
                  }}
                >
                  Kirim
                </button>
              </div>
              <div className="timeline-list">
                {documentComments?.length ? (
                  documentComments.map((comment) => (
                    <div key={comment.id} className="timeline-item">
                      <strong>{comment.author?.name}</strong>
                      <span>{comment.message}</span>
                      <small>{dayjs(comment.createdAt).format("DD MMM YYYY HH:mm")}</small>
                    </div>
                  ))
                ) : (
                  <div className="timeline-item">
                    <span>Belum ada komentar</span>
                  </div>
                )}
              </div>
            </section>
          </div>
        ) : null}
      </section>
    </div>
  );
}

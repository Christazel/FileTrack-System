import dayjs from "dayjs";

export default function PreviewModal({
  previewModal,
  closeModal,
  documentShares,
  documentVersions,
  versionDrafts,
  setVersionDrafts,
  uploadVersion,
  shareDrafts,
  setShareDrafts,
  users,
  user,
  shareDocument,
}) {
  if (!previewModal.type) {
    return null;
  }

  const modalLabel =
    previewModal.type === "preview"
      ? "Preview PDF"
      : previewModal.type === "versions"
        ? "Versioning"
        : "Detail";

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
            </div>

            <section className="subpanel saas-subpanel">
              <h4>Tambah versi baru</h4>
              <div className="form-inline version-form">
                <input
                  type="file"
                  onChange={(e) =>
                    setVersionDrafts((current) => ({
                      ...current,
                      [previewModal.document.id]: { file: e.target.files?.[0] || null },
                    }))
                  }
                />
                <button type="button" onClick={() => uploadVersion(previewModal.document.id)}>
                  Upload versi
                </button>
              </div>
            </section>

            <section className="subpanel saas-subpanel">
              <h4>Share ke user</h4>
              <div className="form-inline share-form">
                <select
                  value={shareDrafts[previewModal.document.id]?.sharedToId || ""}
                  onChange={(e) =>
                    setShareDrafts((current) => ({
                      ...current,
                      [previewModal.document.id]: {
                        ...(current[previewModal.document.id] || {}),
                        sharedToId: e.target.value,
                      },
                    }))
                  }
                >
                  <option value="">Pilih user</option>
                  {users
                    .filter((candidate) => candidate.id !== user.id)
                    .map((candidate) => (
                      <option key={candidate.id} value={candidate.id}>
                        {candidate.name} • {candidate.role}
                      </option>
                    ))}
                </select>
                <input
                  placeholder="Pesan share"
                  value={shareDrafts[previewModal.document.id]?.message || ""}
                  onChange={(e) =>
                    setShareDrafts((current) => ({
                      ...current,
                      [previewModal.document.id]: {
                        ...(current[previewModal.document.id] || {}),
                        message: e.target.value,
                      },
                    }))
                  }
                />
                <button type="button" onClick={() => shareDocument(previewModal.document.id)}>
                  Share
                </button>
              </div>
            </section>

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
          </div>
        ) : null}
      </section>
    </div>
  );
}

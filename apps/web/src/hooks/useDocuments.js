import { useCallback, useEffect, useMemo, useState } from "react";

import { defaultDashboard, emptyDocumentModal, getApiErrorMessage } from "../appDefaults";

const emptyUploadForm = { title: "", categoryId: "", tags: "", file: null };

export function useDocuments({ api, token, showToast, onAfterMutateRef }) {
  const [dashboard, setDashboard] = useState(defaultDashboard);
  const [categories, setCategories] = useState([]);
  const [documents, setDocuments] = useState([]);

  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [newCategory, setNewCategory] = useState("");
  const [uploadForm, setUploadForm] = useState(emptyUploadForm);

  const [previewModal, setPreviewModal] = useState(emptyDocumentModal);
  const [versionDrafts, setVersionDrafts] = useState({});
  const [shareDrafts, setShareDrafts] = useState({});
  const [documentVersions, setDocumentVersions] = useState([]);
  const [documentShares, setDocumentShares] = useState([]);
  const [documentComments, setDocumentComments] = useState([]);
  const [documentLogs, setDocumentLogs] = useState([]);

  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  useEffect(() => {
    return () => {
      if (previewModal.blobUrl) {
        URL.revokeObjectURL(previewModal.blobUrl);
      }
    };
  }, [previewModal.blobUrl]);

  const resolveDocument = useCallback(
    (documentOrId) => {
      if (typeof documentOrId === "object" && documentOrId) {
        return documentOrId;
      }

      return documents.find((document) => document.id === documentOrId) || { id: documentOrId };
    },
    [documents],
  );

  const loadDashboard = useCallback(async () => {
    if (!token) {
      return;
    }

    try {
      const response = await api.get("/dashboard/summary", { headers });
      setDashboard(response.data);
    } catch (requestError) {
      showToast(getApiErrorMessage(requestError, "Gagal mengambil data."), "error");
    }
  }, [api, headers, showToast, token]);

  const loadCategories = useCallback(async () => {
    if (!token) {
      return;
    }

    try {
      const response = await api.get("/categories", { headers });
      setCategories(response.data);
    } catch (requestError) {
      showToast(getApiErrorMessage(requestError, "Gagal mengambil data kategori."), "error");
    }
  }, [api, headers, showToast, token]);

  const loadDocuments = useCallback(async (params) => {
    if (!token) {
      return;
    }

    try {
      const response = await api.get("/documents", { headers, params });
      setDocuments(response.data);
    } catch (requestError) {
      showToast(getApiErrorMessage(requestError, "Gagal mengambil data dokumen."), "error");
    }
  }, [api, headers, showToast, token]);

  const loadDocumentsDomain = useCallback(async () => {
    await Promise.all([loadDashboard(), loadCategories(), loadDocuments()]);
  }, [loadCategories, loadDashboard, loadDocuments]);

  const searchDocuments = useCallback(async () => {
    const params = {
      ...(query ? { q: query } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(dateFrom ? { dateFrom } : {}),
      ...(dateTo ? { dateTo } : {}),
    };

    await loadDocuments(params);
  }, [categoryId, dateFrom, dateTo, loadDocuments, query]);

  const resetFilters = useCallback(() => {
    setQuery("");
    setCategoryId("");
    setDateFrom("");
    setDateTo("");
  }, []);

  const handleUpload = useCallback(
    async (event) => {
      event.preventDefault();

      const formData = new FormData();
      formData.append("title", uploadForm.title);
      formData.append("categoryId", uploadForm.categoryId);
      formData.append("tags", uploadForm.tags);
      formData.append("file", uploadForm.file);

      try {
        await api.post("/documents", formData, {
          headers: {
            ...headers,
            "Content-Type": "multipart/form-data",
          },
        });

        setUploadForm(emptyUploadForm);
        showToast("Dokumen berhasil diunggah.");
        await onAfterMutateRef?.current?.();
      } catch (requestError) {
        showToast(getApiErrorMessage(requestError, "Upload gagal."), "error");
      }
    },
    [api, headers, onAfterMutateRef, showToast, uploadForm],
  );

  const createCategory = useCallback(
    async (event) => {
      event.preventDefault();
      if (!newCategory.trim()) {
        return;
      }

      try {
        await api.post("/categories", { name: newCategory.trim() }, { headers });
        setNewCategory("");
        showToast("Kategori berhasil ditambahkan.");
        await onAfterMutateRef?.current?.();
      } catch (requestError) {
        showToast(getApiErrorMessage(requestError, "Gagal membuat kategori."), "error");
      }
    },
    [api, headers, newCategory, onAfterMutateRef, showToast],
  );

  const adminUpdateCategory = useCallback(
    async (categoryIdValue, name) => {
      try {
        await api.patch(`/categories/${categoryIdValue}`, { name }, { headers });
        showToast("Kategori diperbarui.");
        await onAfterMutateRef?.current?.();
      } catch (requestError) {
        showToast(getApiErrorMessage(requestError, "Gagal update kategori."), "error");
      }
    },
    [api, headers, onAfterMutateRef, showToast],
  );

  const adminDeleteCategory = useCallback(
    async (categoryIdValue) => {
      try {
        await api.delete(`/categories/${categoryIdValue}`, { headers });
        showToast("Kategori dihapus.");
        await onAfterMutateRef?.current?.();
      } catch (requestError) {
        showToast(getApiErrorMessage(requestError, "Gagal menghapus kategori."), "error");
      }
    },
    [api, headers, onAfterMutateRef, showToast],
  );

  const downloadDocument = useCallback(
    async (id, originalName) => {
      try {
        const response = await api.get(`/documents/${id}/download`, {
          headers,
          responseType: "blob",
        });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", originalName);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        showToast("Download berhasil.");
        await onAfterMutateRef?.current?.();
      } catch (requestError) {
        showToast(getApiErrorMessage(requestError, "Gagal download dokumen."), "error");
      }
    },
    [api, headers, onAfterMutateRef, showToast],
  );

  const openPreview = useCallback(
    async (doc) => {
      if (previewModal.blobUrl) {
        URL.revokeObjectURL(previewModal.blobUrl);
      }

      if (doc.mimeType !== "application/pdf") {
        setPreviewModal({ type: "detail", document: doc, blobUrl: "" });
        return;
      }

      try {
        const response = await api.get(`/documents/${doc.id}/preview`, {
          headers,
          responseType: "blob",
        });
        const blobUrl = URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
        setPreviewModal({ type: "preview", document: doc, blobUrl });
      } catch (requestError) {
        showToast(getApiErrorMessage(requestError, "Gagal memuat preview."), "error");
      }
    },
    [api, headers, previewModal.blobUrl, showToast],
  );

  const openVersions = useCallback(
    async (doc) => {
      const activeDocument = resolveDocument(doc);

      try {
        const trackingRes = await api.get(`/documents/${activeDocument.id}/tracking`, { headers });
        const tracked = trackingRes.data;

        setDocumentVersions(tracked.versions || []);
        setDocumentShares(tracked.shares || []);
        setDocumentComments(tracked.comments || []);
        setDocumentLogs(tracked.logs || []);
        setPreviewModal({ type: "versions", document: tracked, blobUrl: "" });
      } catch (requestError) {
        showToast(getApiErrorMessage(requestError, "Gagal memuat versi dokumen."), "error");
      }
    },
    [api, headers, resolveDocument, showToast],
  );

  const addComment = useCallback(
    async (docId, message) => {
      if (!message?.trim()) {
        showToast("Komentar tidak boleh kosong.", "error");
        return;
      }

      try {
        await api.post(
          `/documents/${docId}/comments`,
          { message: message.trim() },
          { headers },
        );
        showToast("Komentar ditambahkan.");
        await onAfterMutateRef?.current?.();
        await openVersions(docId);
      } catch (requestError) {
        showToast(getApiErrorMessage(requestError, "Gagal menambah komentar."), "error");
      }
    },
    [api, headers, onAfterMutateRef, openVersions, showToast],
  );

  const assignDocument = useCallback(
    async (docId, assignedToId) => {
      if (!assignedToId) {
        showToast("Pilih staff terlebih dahulu.", "error");
        return;
      }

      try {
        await api.patch(
          `/documents/${docId}/assign`,
          { assignedToId: Number(assignedToId) },
          { headers },
        );
        showToast("Dokumen berhasil di-assign.");
        await onAfterMutateRef?.current?.();
        await openVersions(docId);
      } catch (requestError) {
        showToast(getApiErrorMessage(requestError, "Gagal assign dokumen."), "error");
      }
    },
    [api, headers, onAfterMutateRef, openVersions, showToast],
  );

  const updateWorkflowStatus = useCallback(
    async (docId, workflowStatus) => {
      if (!workflowStatus) {
        showToast("Pilih status terlebih dahulu.", "error");
        return;
      }

      try {
        await api.patch(
          `/documents/${docId}/status`,
          { workflowStatus },
          { headers },
        );
        showToast("Status diperbarui.");
        await onAfterMutateRef?.current?.();
        await openVersions(docId);
      } catch (requestError) {
        showToast(getApiErrorMessage(requestError, "Gagal update status."), "error");
      }
    },
    [api, headers, onAfterMutateRef, openVersions, showToast],
  );

  const decideDocument = useCallback(
    async (docId, approvalStatus, note) => {
      try {
        await api.post(
          `/documents/${docId}/decision`,
          { approvalStatus, ...(note ? { note } : {}) },
          { headers },
        );
        showToast("Keputusan tersimpan.");
        await onAfterMutateRef?.current?.();
        await openVersions(docId);
      } catch (requestError) {
        showToast(getApiErrorMessage(requestError, "Gagal menyimpan keputusan."), "error");
      }
    },
    [api, headers, onAfterMutateRef, openVersions, showToast],
  );

  const uploadVersion = useCallback(
    async (docId) => {
      const draft = versionDrafts[docId];
      if (!draft?.file) {
        showToast("Pilih file versi baru terlebih dahulu.", "error");
        return;
      }

      const formData = new FormData();
      formData.append("file", draft.file);

      try {
        await api.post(`/documents/${docId}/versions`, formData, {
          headers: {
            ...headers,
            "Content-Type": "multipart/form-data",
          },
        });
        setVersionDrafts((current) => ({ ...current, [docId]: { file: null } }));
        showToast("Versi baru berhasil ditambahkan.");
        await onAfterMutateRef?.current?.();
        await openVersions(docId);
      } catch (requestError) {
        showToast(getApiErrorMessage(requestError, "Gagal menambah versi."), "error");
      }
    },
    [api, headers, onAfterMutateRef, openVersions, showToast, versionDrafts],
  );

  const shareDocument = useCallback(
    async (docId) => {
      const draft = shareDrafts[docId];
      if (!draft?.sharedToId) {
        showToast("Pilih user tujuan terlebih dahulu.", "error");
        return;
      }

      try {
        await api.post(
          `/documents/${docId}/share`,
          {
            sharedToId: Number(draft.sharedToId),
            message: draft.message || "",
          },
          { headers },
        );
        setShareDrafts((current) => ({ ...current, [docId]: { sharedToId: "", message: "" } }));
        showToast("Dokumen berhasil dibagikan.");
        await onAfterMutateRef?.current?.();
        await openVersions(docId);
      } catch (requestError) {
        showToast(getApiErrorMessage(requestError, "Gagal membagikan dokumen."), "error");
      }
    },
    [api, headers, onAfterMutateRef, openVersions, shareDrafts, showToast],
  );

  const closeModal = useCallback(() => {
    if (previewModal.blobUrl) {
      URL.revokeObjectURL(previewModal.blobUrl);
    }
    setPreviewModal(emptyDocumentModal);
    setDocumentVersions([]);
    setDocumentShares([]);
    setDocumentComments([]);
    setDocumentLogs([]);
  }, [previewModal.blobUrl]);

  const resetDocumentsState = useCallback(() => {
    setDashboard(defaultDashboard);
    setCategories([]);
    setDocuments([]);
    setPreviewModal(emptyDocumentModal);
    setVersionDrafts({});
    setShareDrafts({});
    setDocumentVersions([]);
    setDocumentShares([]);
    setDocumentComments([]);
    setDocumentLogs([]);
    setUploadForm(emptyUploadForm);
    setNewCategory("");
    resetFilters();
  }, [resetFilters]);

  return {
    dashboard,
    categories,
    documents,
    query,
    setQuery,
    categoryId,
    setCategoryId,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    resetFilters,
    newCategory,
    setNewCategory,
    uploadForm,
    setUploadForm,
    previewModal,
    versionDrafts,
    setVersionDrafts,
    shareDrafts,
    setShareDrafts,
    documentVersions,
    documentShares,
    documentComments,
    documentLogs,
    loadDashboard,
    loadCategories,
    loadDocuments,
    loadDocumentsDomain,
    searchDocuments,
    handleUpload,
    createCategory,
    adminUpdateCategory,
    adminDeleteCategory,
    downloadDocument,
    openPreview,
    openVersions,
    closeModal,
    addComment,
    assignDocument,
    updateWorkflowStatus,
    decideDocument,
    uploadVersion,
    shareDocument,
    resetDocumentsState,
  };
}

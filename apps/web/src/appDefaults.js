export const emptyDocumentModal = {
  type: null,
  document: null,
  blobUrl: "",
};

export const defaultDashboard = {
  totalDocuments: 0,
  totalUsers: 0,
  recentDocuments: [],
  uploadStats: [],
};

export const TOAST_TIMEOUT_MS = 3000;

export function getApiErrorMessage(error, fallbackMessage) {
  const response = error?.response;
  const data = response?.data;

  if (typeof data === "string" && data.trim()) {
    return data;
  }

  if (data && typeof data === "object") {
    if (typeof data.message === "string" && data.message.trim()) {
      return data.message;
    }

    if (typeof data.error === "string" && data.error.trim()) {
      return data.error;
    }
  }

  const code = error?.code;
  if (code === "ECONNABORTED") {
    return "Request timeout. Coba lagi.";
  }

  const message = error?.message;
  if (typeof message === "string" && message.toLowerCase().includes("network error")) {
    return "Tidak dapat terhubung ke server.";
  }

  if (error?.request && !response) {
    return "Tidak dapat terhubung ke server.";
  }

  return fallbackMessage;
}

export const publicFeatures = [
  {
    title: "RBAC Aman",
    description: "Role admin, manager, dan staff dengan hak akses berbeda untuk setiap aksi penting.",
  },
  {
    title: "Search Cepat",
    description: "Cari berdasarkan nama, kategori, tanggal, atau tag dalam satu tampilan yang ringkas.",
  },
  {
    title: "Preview & Versioning",
    description: "Buka PDF langsung dari browser dan simpan revisi dokumen tanpa kehilangan histori.",
  },
  {
    title: "Share & Notifikasi",
    description: "Bagikan file ke user lain dan pantau semua aktivitas penting secara real time.",
  },
];

export const publicProofPoints = [
  { label: "Upload maksimal", value: "10 MB" },
  { label: "Format didukung", value: "PDF, DOCX, XLSX" },
  { label: "Mode akses", value: "JWT + RBAC" },
];

export const publicWorkflow = [
  "Login sesuai role",
  "Upload dan kategorikan dokumen",
  "Preview, share, dan revisi file",
  "Pantau log dan notifikasi",
];

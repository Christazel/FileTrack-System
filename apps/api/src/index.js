const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
require("dotenv").config();

const { API_PREFIX, CORS_ORIGIN, IS_PROD, PORT, UPLOADS_PATH } = require("./config");

const prisma = require("./prisma");
const authRoutes = require("./routes/auth");
const categoryRoutes = require("./routes/categories");
const documentRoutes = require("./routes/documents");
const dashboardRoutes = require("./routes/dashboard");
const logsRoutes = require("./routes/logs");
const userRoutes = require("./routes/users");
const notificationRoutes = require("./routes/notifications");
const departmentRoutes = require("./routes/departments");

const app = express();

app.use(helmet());
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());
app.use(morgan("dev"));

app.use("/uploads", express.static(UPLOADS_PATH));

app.get(`${API_PREFIX}/health`, (_req, res) => {
  res.json({ status: "ok", service: "FileTrack API" });
});

app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/categories`, categoryRoutes);
app.use(`${API_PREFIX}/documents`, documentRoutes);
app.use(`${API_PREFIX}/dashboard`, dashboardRoutes);
app.use(`${API_PREFIX}/logs`, logsRoutes);
app.use(`${API_PREFIX}/users`, userRoutes);
app.use(`${API_PREFIX}/notifications`, notificationRoutes);
app.use(`${API_PREFIX}/departments`, departmentRoutes);

app.use((error, _req, res, _next) => {
  if (error && error.message === "Tipe file tidak diizinkan.") {
    return res.status(400).json({ message: error.message });
  }

  if (error && error.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ message: "Ukuran file maksimal 10MB." });
  }

  return res.status(500).json({
    message: "Terjadi kesalahan server.",
    ...(IS_PROD ? {} : { error: error?.message }),
  });
});

app.listen(PORT, async () => {
  try {
    await prisma.$connect();
    // eslint-disable-next-line no-console
    console.log(`FileTrack API berjalan di http://localhost:${PORT}`);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Koneksi database gagal:", error.message);
    process.exit(1);
  }
});

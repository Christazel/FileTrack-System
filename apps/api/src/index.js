const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
require("dotenv").config();

const prisma = require("./prisma");
const authRoutes = require("./routes/auth");
const categoryRoutes = require("./routes/categories");
const documentRoutes = require("./routes/documents");
const dashboardRoutes = require("./routes/dashboard");
const logsRoutes = require("./routes/logs");

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || "http://localhost:5173" }));
app.use(express.json());
app.use(morgan("dev"));

app.use("/uploads", express.static(path.resolve(__dirname, "../uploads")));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "FileTrack API" });
});

app.use("/api/auth", authRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/logs", logsRoutes);

app.use((error, _req, res, _next) => {
  if (error && error.message === "Tipe file tidak diizinkan.") {
    return res.status(400).json({ message: error.message });
  }

  if (error && error.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ message: "Ukuran file maksimal 10MB." });
  }

  return res.status(500).json({ message: "Terjadi kesalahan server.", error: error?.message });
});

const PORT = Number(process.env.PORT || 4000);

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

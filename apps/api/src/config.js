const path = require("path");

const API_PREFIX = "/api";
const PORT_RAW = process.env.PORT;
const parsedPort = PORT_RAW === undefined ? 4000 : Number(PORT_RAW);
const PORT = Number.isFinite(parsedPort) ? parsedPort : 4000;
const CORS_ORIGIN_RAW = process.env.CORS_ORIGIN || "http://localhost:5173";
const CORS_ORIGIN = (() => {
  const raw = String(CORS_ORIGIN_RAW).trim();
  if (raw === "*") {
    return true;
  }

  const parts = raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (parts.length <= 1) {
    return parts[0] || "http://localhost:5173";
  }

  return parts;
})();
const UPLOADS_PATH = path.resolve(__dirname, "../uploads");
const IS_PROD = process.env.NODE_ENV === "production";

module.exports = {
  API_PREFIX,
  PORT,
  CORS_ORIGIN,
  UPLOADS_PATH,
  IS_PROD,
};

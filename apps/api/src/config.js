const path = require("path");

const API_PREFIX = "/api";
const PORT = Number(process.env.PORT || 4000);
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173";
const UPLOADS_PATH = path.resolve(__dirname, "../uploads");
const IS_PROD = process.env.NODE_ENV === "production";

module.exports = {
  API_PREFIX,
  PORT,
  CORS_ORIGIN,
  UPLOADS_PATH,
  IS_PROD,
};

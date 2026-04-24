require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

// ─────────────────────────────────────────────────────────────────────────────
//  CORS
//  CLIENT_URL: Dev → http://localhost:5173  |  Prod → https://your-app.vercel.app
// ─────────────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true,
}));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ─────────────────────────────────────────────────────────────────────────────
//  STATIC FILE SERVING FOR UPLOADS
//
//  Files are served at:  GET /uploads/<filename>
//  DB stores relative paths: /uploads/<uuid>.jpg
//
//  Frontend converts to full URL via imageUrl() helper in api.js:
//    Dev:  http://localhost:4000/uploads/<uuid>.jpg
//    Prod: https://your-server.onrender.com/uploads/<uuid>.jpg
//
//  Only VITE_API_URL on the frontend ever changes — DB paths stay the same.
//
//  For production with many files → migrate to Cloudinary (see README).
// ─────────────────────────────────────────────────────────────────────────────
const UPLOAD_DIR = path.join(__dirname, "uploads");
app.use("/uploads", express.static(UPLOAD_DIR));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/auth",       require("./routes/auth"));
app.use("/api/projects",   require("./routes/projects"));
app.use("/api/promotions", require("./routes/promotions"));
app.use("/api/versions",   require("./routes/versions"));

const { commentsRouter, clientsRouter, typesRouter } = require("./routes/misc");
app.use("/api/comments", commentsRouter);
app.use("/api/clients",  clientsRouter);
app.use("/api/types",    typesRouter);

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => res.json({ status: "ok" }));

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: "Route not found" }));

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err.message);
  res.status(500).json({ error: err.message || "Internal server error" });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`✅ PromoDash API → http://localhost:${PORT}`));

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

// ─────────────────────────────────────────────────────────────────────────────
//  CORS
//  Allows your React app (on a different origin) to call this server.
//  CLIENT_URL should be:
//    Dev  → http://localhost:5173
//    Prod → https://your-frontend.vercel.app
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
//  This makes uploaded images and PDFs available at:
//    http://localhost:4000/uploads/<filename>
//
//  The DB stores relative paths like "/uploads/abc123.jpg".
//  The frontend prefixes them with VITE_API_URL to get the full URL.
//
//  On deployment (Render / Railway):
//    - The uploads folder is on the server's disk.
//    - The path never changes in the DB.
//    - Only VITE_API_URL on the frontend changes.
//
//  NOTE: For production with many files, consider moving to S3/Cloudinary.
//  See the README for instructions.
// ─────────────────────────────────────────────────────────────────────────────
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ── Routes ────────────────────────────────────────────────────────────────────
const authRoutes = require("./routes/auth");
const projectRoutes = require("./routes/projects");
const promotionRoutes = require("./routes/promotions");
const versionRoutes = require("./routes/versions");
const { commentsRouter, clientsRouter, typesRouter } = require("./routes/misc");

app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/promotions", promotionRoutes);
app.use("/api/versions", versionRoutes);
app.use("/api/comments", commentsRouter);
app.use("/api/clients", clientsRouter);
app.use("/api/types", typesRouter);

// ── Health check (useful for Render/Railway uptime checks) ───────────────────
app.get("/health", (_req, res) => res.json({ status: "ok" }));

// ── 404 catch-all ────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: "Route not found" }));

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err.message);
  res.status(500).json({ error: err.message || "Internal server error" });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`PromoDash API running on http://localhost:${PORT}`));

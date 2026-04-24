const router  = require("express").Router();
const prisma  = require("../db/prisma");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const multer  = require("multer");
const path    = require("path");
const fs      = require("fs");
const { v4: uuidv4 } = require("uuid");

// ─────────────────────────────────────────────────────────────────────────────
//  UPLOAD SETUP
//
//  Files land at:  server/uploads/<uuid>.<ext>
//  DB stores:      url = "/uploads/<uuid>.<ext>"   ← relative path
//
//  Frontend converts to full URL via imageUrl(version.url):
//    Dev:  http://localhost:4000/uploads/<uuid>.jpg
//    Prod: https://your-api.onrender.com/uploads/<uuid>.jpg
//
//  Only VITE_API_URL changes between environments — DB paths stay the same.
//  No DB update needed when you deploy to a new domain.
// ─────────────────────────────────────────────────────────────────────────────

const UPLOAD_DIR = path.join(__dirname, "../uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename:    (_req, file,  cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);   // unique name, no collisions
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },   // 20 MB
  fileFilter: (_req, file, cb) => {
    const allowed = [".jpg", ".jpeg", ".png", ".pdf"];
    if (allowed.includes(path.extname(file.originalname).toLowerCase()))
      return cb(null, true);
    cb(new Error("Only JPG, PNG, and PDF files are allowed"));
  },
});

function mapVersion(v) {
  return {
    id:          v.id,
    promotionId: v.promotionId,
    version:     v.version,
    label:       v.label,
    fileName:    v.fileName,
    fileType:    v.fileType,
    uploadedBy:  v.uploadedBy,
    uploadedAt:  v.uploadedAt,
    url:         v.url,     // relative: /uploads/<uuid>.ext
    notes:       v.notes || "",
  };
}

// GET /api/versions?promotionId=xxx
router.get("/", requireAuth, async (req, res) => {
  const { promotionId } = req.query;
  if (!promotionId) return res.status(400).json({ error: "promotionId required" });

  try {
    const versions = await prisma.version.findMany({
      where:   { promotionId },
      orderBy: { version: "asc" },
    });
    res.json(versions.map(mapVersion));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/versions/upload  (multipart/form-data)
//   Fields: promotionId, label, notes
//   Files:  files[] (multiple)
router.post("/upload", requireAuth, requireAdmin, upload.array("files", 10), async (req, res) => {
  const { promotionId, label, notes } = req.body;
  if (!promotionId || !req.files?.length)
    return res.status(400).json({ error: "promotionId and at least one file required" });

  try {
    // Current max version number for this promotion
    const agg = await prisma.version.aggregate({
      where:   { promotionId },
      _max:    { version: true },
    });
    let versionNum = agg._max.version ?? 0;

    const uploadedBy = req.user.role === "admin" ? "Admin" : "Client";
    const created    = [];

    for (let i = 0; i < req.files.length; i++) {
      const file      = req.files[i];
      versionNum     += 1;
      const fileType  = path.extname(file.originalname).toLowerCase() === ".pdf" ? "pdf" : "image";
      const versionLabel = req.files.length > 1
        ? `${(label || "Creative option").trim()} ${i + 1}`
        : (label || "Creative option").trim();

      // ── RELATIVE PATH — deployment-safe ───────────────────────────────────
      //  Never store an absolute URL (http://...) in the DB.
      //  The frontend's imageUrl() prepends VITE_API_URL at runtime.
      const relativeUrl = `/uploads/${file.filename}`;

      const version = await prisma.version.create({
        data: {
          promotionId,
          version:    versionNum,
          label:      versionLabel,
          fileName:   file.originalname,
          fileType,
          uploadedBy,
          url:        relativeUrl,
          notes:      notes?.trim() || "",
        },
      });
      created.push(mapVersion(version));
    }

    // Auto-set current_version_id and move to Pending Approval
    await prisma.promotion.update({
      where: { id: promotionId },
      data:  { currentVersionId: created[0].id, status: "Pending_Approval" },
    });

    res.status(201).json(created);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE /api/versions/:id
router.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const version = await prisma.version.findUnique({ where: { id: req.params.id } });
    if (!version) return res.status(404).json({ error: "Version not found" });

    // Remove physical file (url is relative: /uploads/file.jpg)
    const filePath = path.join(__dirname, "..", version.url);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await prisma.version.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    if (err.code === "P2025") return res.status(404).json({ error: "Version not found" });
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;

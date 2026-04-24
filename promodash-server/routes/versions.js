const router = require("express").Router();
const pool = require("../db/pool");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const { v4: uuidv4 } = require("uuid");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// ─────────────────────────────────────────────────────────────────────────────
//  FILE UPLOAD SETUP
//
//  Files are saved to:  server/uploads/<uuid>.<ext>
//
//  The DB stores:  url = "/uploads/<uuid>.<ext>"   (relative path)
//  The frontend reads:  imageUrl(version.url)  which prepends VITE_API_URL
//
//  WHY RELATIVE PATHS?
//    If you push to GitHub and deploy to Render/Railway, the server domain
//    changes.  Storing a relative path means you never need to update the DB —
//    only the VITE_API_URL env var on the frontend changes.
// ─────────────────────────────────────────────────────────────────────────────

const UPLOAD_DIR = path.join(__dirname, "../uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);    // unique filename, no spaces, no collisions
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },   // 20 MB per file
  fileFilter: (_req, file, cb) => {
    const allowed = [".jpg", ".jpeg", ".png", ".pdf"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) return cb(null, true);
    cb(new Error("Only JPG, PNG, and PDF files are allowed"));
  },
});

function mapVersion(row) {
  return {
    id: row.id,
    promotionId: row.promotion_id,
    version: row.version,
    label: row.label,
    fileName: row.file_name,
    fileType: row.file_type,
    uploadedBy: row.uploaded_by,
    uploadedAt: row.uploaded_at,
    url: row.url,       // relative path like /uploads/abc.jpg
    notes: row.notes || "",
  };
}

// GET /api/versions?promotionId=xxx
router.get("/", requireAuth, async (req, res) => {
  const { promotionId } = req.query;
  if (!promotionId) return res.status(400).json({ error: "promotionId required" });
  try {
    const { rows } = await pool.query(
      "SELECT * FROM versions WHERE promotion_id = $1 ORDER BY version ASC",
      [promotionId]
    );
    res.json(rows.map(mapVersion));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/versions/upload  (multipart/form-data)
//   Fields: promotionId, label, notes
//   Files:  files[]  (multiple)
router.post("/upload", requireAuth, requireAdmin, upload.array("files", 10), async (req, res) => {
  const { promotionId, label, notes } = req.body;
  if (!promotionId || !req.files?.length) {
    return res.status(400).json({ error: "promotionId and at least one file required" });
  }

  try {
    // Get current max version number for this promotion
    const { rows: existing } = await pool.query(
      "SELECT COALESCE(MAX(version), 0) AS max_v FROM versions WHERE promotion_id = $1",
      [promotionId]
    );
    let versionNum = Number(existing[0].max_v);

    const uploadedAt = new Date().toISOString();
    const uploadedBy = req.user.role === "admin" ? "Admin" : "Client";
    const created = [];

    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      versionNum += 1;

      const fileType = [".pdf"].includes(path.extname(file.originalname).toLowerCase())
        ? "pdf"
        : "image";

      const versionLabel = req.files.length > 1
        ? `${(label || "Creative option").trim()} ${i + 1}`
        : (label || "Creative option").trim();

      // Store as a relative path — works on any domain
      const relativeUrl = `/uploads/${file.filename}`;

      const id = `ver-${uuidv4()}`;
      const { rows } = await pool.query(
        `INSERT INTO versions
           (id, promotion_id, version, label, file_name, file_type, uploaded_by, uploaded_at, url, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
        [id, promotionId, versionNum, versionLabel, file.originalname,
         fileType, uploadedBy, uploadedAt, relativeUrl, notes?.trim() || ""]
      );
      created.push(mapVersion(rows[0]));
    }

    // Auto-set current_version_id on the promotion to the first uploaded file
    await pool.query(
      "UPDATE promotions SET current_version_id = $1, status = 'Pending Approval' WHERE id = $2",
      [created[0].id, promotionId]
    );

    res.status(201).json(created);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE /api/versions/:id
router.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM versions WHERE id = $1", [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: "Version not found" });

    // Delete file from disk
    const filePath = path.join(__dirname, "../", rows[0].url);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await pool.query("DELETE FROM versions WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;

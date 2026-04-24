const router = require("express").Router();
const pool = require("../db/pool");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const { v4: uuidv4 } = require("uuid");

function mapPromotion(row) {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    type: row.type,
    scheduledDate: row.scheduled_date,
    status: row.status,
    description: row.description || "",
    subjectLine: row.subject_line || "",
    contactList: row.contact_list || "",
    captions: row.captions || [],
    currentVersionId: row.current_version_id || null,
    createdAt: row.created_at,
  };
}

// GET /api/promotions?projectId=xxx
router.get("/", requireAuth, async (req, res) => {
  try {
    const { projectId } = req.query;

    // Determine which projects this user can see
    let projectFilter;
    let params = [];
    if (req.user.role === "admin") {
      projectFilter = projectId ? "p.project_id = $1" : "TRUE";
      if (projectId) params.push(projectId);
    } else {
      // Client: only see promotions in projects they are assigned to
      if (projectId) {
        projectFilter = "p.project_id = $1 AND $2 = ANY(pr.client_users)";
        params = [projectId, req.user.email];
      } else {
        projectFilter = "$1 = ANY(pr.client_users)";
        params = [req.user.email];
      }
    }

    const { rows } = await pool.query(
      `SELECT p.* FROM promotions p
       JOIN projects pr ON pr.id = p.project_id
       WHERE ${projectFilter}
       ORDER BY p.scheduled_date ASC`,
      params
    );
    res.json(rows.map(mapPromotion));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/promotions/:id
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.* FROM promotions p
       JOIN projects pr ON pr.id = p.project_id
       WHERE p.id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Promotion not found" });
    res.json(mapPromotion(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/promotions
router.post("/", requireAuth, requireAdmin, async (req, res) => {
  const { projectId, title, type, scheduledDate, status = "Draft", description,
          subjectLine, contactList, captions = [] } = req.body;
  if (!projectId || !title || !type || !scheduledDate) {
    return res.status(400).json({ error: "projectId, title, type, scheduledDate required" });
  }

  const id = `promo-${uuidv4()}`;
  try {
    const { rows } = await pool.query(
      `INSERT INTO promotions
         (id, project_id, title, type, scheduled_date, status, description,
          subject_line, contact_list, captions)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [id, projectId, title.trim(), type, scheduledDate, status,
       description?.trim() || "", subjectLine?.trim() || "",
       contactList?.trim() || "", captions]
    );
    res.status(201).json(mapPromotion(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// PUT /api/promotions/:id
router.put("/:id", requireAuth, requireAdmin, async (req, res) => {
  const { title, type, scheduledDate, status, description,
          subjectLine, contactList, captions, currentVersionId } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE promotions
       SET title=$1, type=$2, scheduled_date=$3, status=$4, description=$5,
           subject_line=$6, contact_list=$7, captions=$8, current_version_id=$9
       WHERE id=$10 RETURNING *`,
      [title?.trim(), type, scheduledDate, status, description?.trim() || "",
       subjectLine?.trim() || "", contactList?.trim() || "",
       captions || [], currentVersionId || null, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Promotion not found" });
    res.json(mapPromotion(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// PATCH /api/promotions/:id/status  (lightweight status update for client approve/reject)
router.patch("/:id/status", requireAuth, async (req, res) => {
  const { status } = req.body;
  const allowed = ["Draft","Pending Approval","Approved","Revision Required","Published"];
  if (!allowed.includes(status)) return res.status(400).json({ error: "Invalid status" });

  try {
    const { rows } = await pool.query(
      "UPDATE promotions SET status=$1 WHERE id=$2 RETURNING *",
      [status, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Promotion not found" });
    res.json(mapPromotion(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// PATCH /api/promotions/:id/version  (set active version)
router.patch("/:id/version", requireAuth, async (req, res) => {
  const { currentVersionId } = req.body;
  try {
    const { rows } = await pool.query(
      "UPDATE promotions SET current_version_id=$1 WHERE id=$2 RETURNING *",
      [currentVersionId, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Promotion not found" });
    res.json(mapPromotion(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE /api/promotions/:id
router.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { rowCount } = await pool.query("DELETE FROM promotions WHERE id=$1", [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: "Promotion not found" });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;

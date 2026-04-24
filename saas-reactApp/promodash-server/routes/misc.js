// ─────────────────────────────────────────────────────────────────────────────
//  comments.js
// ─────────────────────────────────────────────────────────────────────────────
const commentsRouter = require("express").Router();
const pool = require("../db/pool");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const { v4: uuidv4 } = require("uuid");

function mapComment(row) {
  return {
    id: row.id,
    promotionId: row.promotion_id,
    author: row.author,
    role: row.role,
    body: row.body,
    createdAt: row.created_at,
  };
}

// GET /api/comments?promotionId=xxx
commentsRouter.get("/", requireAuth, async (req, res) => {
  const { promotionId } = req.query;
  if (!promotionId) return res.status(400).json({ error: "promotionId required" });
  try {
    const { rows } = await pool.query(
      "SELECT * FROM comments WHERE promotion_id = $1 ORDER BY created_at ASC",
      [promotionId]
    );
    res.json(rows.map(mapComment));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/comments
commentsRouter.post("/", requireAuth, async (req, res) => {
  const { promotionId, body } = req.body;
  if (!promotionId || !body) return res.status(400).json({ error: "promotionId and body required" });
  const id = `comment-${uuidv4()}`;
  const author = req.user.role === "admin" ? "Admin" : "Client";
  try {
    const { rows } = await pool.query(
      "INSERT INTO comments (id, promotion_id, author, role, body) VALUES ($1,$2,$3,$4,$5) RETURNING *",
      [id, promotionId, author, req.user.role, body.trim()]
    );
    res.status(201).json(mapComment(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE /api/comments/:id  (admin only)
commentsRouter.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { rowCount } = await pool.query("DELETE FROM comments WHERE id=$1", [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: "Comment not found" });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  clients.js
// ─────────────────────────────────────────────────────────────────────────────
const clientsRouter = require("express").Router();
const { v4: uuid2 } = require("uuid");

function mapClient(row) {
  return { id: row.id, name: row.name, email: row.email, company: row.company || "", createdAt: row.created_at };
}

clientsRouter.get("/", requireAuth, async (req, res) => {
  const { rows } = await pool.query("SELECT * FROM clients ORDER BY name ASC");
  res.json(rows.map(mapClient));
});

clientsRouter.post("/", requireAuth, requireAdmin, async (req, res) => {
  const { name, email, company } = req.body;
  if (!name || !email) return res.status(400).json({ error: "name and email required" });
  try {
    const { rows } = await pool.query(
      "INSERT INTO clients (id, name, email, company) VALUES ($1,$2,$3,$4) RETURNING *",
      [`client-${uuid2()}`, name.trim(), email.trim().toLowerCase(), company?.trim() || ""]
    );
    res.status(201).json(mapClient(rows[0]));
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "Email already exists" });
    res.status(500).json({ error: "Server error" });
  }
});

clientsRouter.put("/:id", requireAuth, requireAdmin, async (req, res) => {
  const { name, email, company } = req.body;
  try {
    const old = await pool.query("SELECT email FROM clients WHERE id=$1", [req.params.id]);
    if (!old.rows[0]) return res.status(404).json({ error: "Client not found" });
    const oldEmail = old.rows[0].email;
    const newEmail = email.trim().toLowerCase();

    const { rows } = await pool.query(
      "UPDATE clients SET name=$1, email=$2, company=$3 WHERE id=$4 RETURNING *",
      [name.trim(), newEmail, company?.trim() || "", req.params.id]
    );

    // Update email references in projects if email changed
    if (oldEmail !== newEmail) {
      await pool.query(
        "UPDATE projects SET client_users = array_replace(client_users, $1, $2)",
        [oldEmail, newEmail]
      );
    }
    res.json(mapClient(rows[0]));
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

clientsRouter.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT email FROM clients WHERE id=$1", [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: "Client not found" });
    const email = rows[0].email;
    await pool.query("DELETE FROM clients WHERE id=$1", [req.params.id]);
    // Remove from project assignments
    await pool.query(
      "UPDATE projects SET client_users = array_remove(client_users, $1)",
      [email]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  types.js  (promotion types)
// ─────────────────────────────────────────────────────────────────────────────
const typesRouter = require("express").Router();
const { v4: uuid3 } = require("uuid");

function mapType(row) {
  return { id: row.id, name: row.name, description: row.description || "", createdAt: row.created_at };
}

typesRouter.get("/", requireAuth, async (req, res) => {
  const { rows } = await pool.query("SELECT * FROM promotion_types ORDER BY name ASC");
  res.json(rows.map(mapType));
});

typesRouter.post("/", requireAuth, requireAdmin, async (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: "name required" });
  try {
    const { rows } = await pool.query(
      "INSERT INTO promotion_types (id, name, description) VALUES ($1,$2,$3) RETURNING *",
      [`type-${uuid3()}`, name.trim(), description?.trim() || ""]
    );
    res.status(201).json(mapType(rows[0]));
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

typesRouter.put("/:id", requireAuth, requireAdmin, async (req, res) => {
  const { name, description } = req.body;
  try {
    const { rows } = await pool.query(
      "UPDATE promotion_types SET name=$1, description=$2 WHERE id=$3 RETURNING *",
      [name.trim(), description?.trim() || "", req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Type not found" });
    res.json(mapType(rows[0]));
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

typesRouter.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { rows: used } = await pool.query(
      "SELECT COUNT(*) FROM promotions WHERE type=$1", [req.params.id]
    );
    if (Number(used[0].count) > 0) {
      return res.status(409).json({ error: "Type is used by promotions. Remove those promotions first." });
    }
    const { rowCount } = await pool.query("DELETE FROM promotion_types WHERE id=$1", [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: "Type not found" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = { commentsRouter, clientsRouter, typesRouter };
